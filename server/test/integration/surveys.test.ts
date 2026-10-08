// Sondajele pe server (Faza 5.6; B10 §6: sondaje + anti-vot + D3 / D4). Plan: FAZA_5_6_PLAN.md.

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { solveChallenge } from 'altcha-lib';
import { deriveKey as shaDeriveKey } from 'altcha-lib/algorithms/sha';
import { SURVEY_ADVISORY_TEXT } from '@tmc/shared';
import { bootstrapAdmin } from '../../src/accounts.ts';
import { requestLogSerializer } from '../../src/app.ts';
import { totpCodeAt } from '../../src/auth/totp.ts';
import type { AppContext } from '../../src/context.ts';
import type { DbHandle } from '../../src/db/client.ts';
import { migrate } from '../../src/db/migrations.ts';
import { seedConfig } from '../../src/db/seeds.ts';
import { purgeRetention } from '../../src/maintenance.ts';
import { MIGRATIONS_DIR, SEEDS_DIR } from '../../src/paths.ts';
import { closeExpiredSurveys } from '../../src/surveys.ts';
import { Client, Clock, makeApp } from '../helpers/apiClient.ts';
import { openTestDb, resetTestDb } from '../helpers/db.ts';

const V1 = '/api/v1';
const DAY = 24 * 60;
let h: DbHandle;
let app: FastifyInstance;
let ctx: AppContext;
const clock = new Clock();
let sa: Client;
let op: Client;
const q = async <T>(sql: string, p: unknown[] = []) => (await h.pool.query(sql, p))[0] as T[];
let ipSeq = 1;
const nextIp = () => `10.20.${Math.floor(ipSeq / 250)}.${(ipSeq++ % 250) + 1}`;
const iso = (minutesFromNow: number) => new Date(clock.now().getTime() + minutesFromNow * 60_000).toISOString();

async function adminLogin(email: string, temp: string, pw: string): Promise<Client> {
  const c = new Client(app, undefined, nextIp());
  const res = await c.post(`${V1}/auth/login`, { email, password: temp });
  if (res.json().mfa === 'enroll') {
    const secret = (await c.post(`${V1}/auth/mfa/enroll/start`)).json().secretBase32;
    await c.post(`${V1}/auth/mfa/enroll/confirm`, { code: totpCodeAt(secret, clock.now()) });
  }
  assert.equal((await c.post(`${V1}/auth/change-password`, { currentPassword: temp, newPassword: pw })).statusCode, 204);
  clock.advanceMinutes(1);
  return c;
}

/** Sondaj cu 3 întrebări: alegere unică (obligatorie), alegere multiplă, text liber. */
function surveyBody(over: Record<string, unknown> = {}) {
  return {
    title: 'Consultare de test privind parcurile',
    description: 'Descrierea consultării de test, suficient de lungă.',
    category: 'Mediu',
    startAt: iso(-60),
    endAt: iso(7 * DAY),
    resultsVisibility: 'after_close',
    questions: [
      { text: 'Cât de des mergeți în parc?', type: 'single_choice', isRequired: true, helpText: 'O variantă', options: [{ text: 'Zilnic' }, { text: 'Săptămânal' }, { text: 'Rar' }] },
      { text: 'Ce dotări vreți?', type: 'multiple_choice', isRequired: false, options: [{ text: 'Bănci' }, { text: 'Iluminat' }, { text: 'Locuri de joacă' }] },
      { text: 'Alte sugestii?', type: 'free_text', isRequired: false, options: [] },
    ],
    ...over,
  };
}

async function createActive(over: Record<string, unknown> = {}) {
  const res = await sa.post(`${V1}/admin/surveys`, { ...surveyBody(over), status: 'active' });
  assert.equal(res.statusCode, 201, res.body);
  return res.json() as { id: string; questions: Array<{ id: string; type: string; options: Array<{ id: string }> }> };
}

/** Votant nou (cookie nou), cu IP propriu. */
async function voter(ip = nextIp()): Promise<Client> {
  const c = new Client(app, undefined, ip);
  assert.equal((await c.get(`${V1}/public/surveys`)).statusCode, 200);
  assert.ok(c.cookie?.startsWith('civic_pid='), 'cookie-ul de participare (N4-3)');
  return c;
}

async function vote(c: Client, surveyId: string, answers: unknown[], opts: { wait?: boolean; hp?: string; pow?: string; token?: string } = {}) {
  const d = await c.get(`${V1}/public/surveys/${surveyId}`);
  const token = opts.token ?? d.json().formStartedAt;
  if (opts.wait !== false) clock.advanceMinutes(0.2); // 12 s > 6 s (P-7)
  return c.post(`${V1}/public/surveys/${surveyId}/submissions`, { answers, hp: opts.hp ?? '', formStartedAt: token, ...(opts.pow ? { pow: opts.pow } : {}) });
}

const basicAnswers = (s: { questions: Array<{ id: string; options: Array<{ id: string }> }> }, text = 'Mai multe bănci, vă rog.') => [
  { questionId: s.questions[0]!.id, value: s.questions[0]!.options[0]!.id },
  { questionId: s.questions[1]!.id, value: [s.questions[1]!.options[0]!.id, s.questions[1]!.options[2]!.id] },
  { questionId: s.questions[2]!.id, value: text },
];

before(async () => {
  h = openTestDb();
  await resetTestDb(h.pool);
  await migrate(h.pool, MIGRATIONS_DIR);
  await seedConfig(h.pool, SEEDS_DIR);
  ({ app, ctx } = await makeApp(h, clock));
  const b = await bootstrapAdmin(h.pool, clock.now(), 'sa@exemplu.test', 'Super Admin');
  sa = await adminLogin('sa@exemplu.test', b.temporaryPassword, 'parola-super-admin-2026');
  const o = await sa.post(`${V1}/admin/accounts`, { email: 'op@exemplu.test', displayName: 'Operator', role: 'primarie_operator' });
  assert.equal(o.statusCode, 201, o.body);
  op = await adminLogin('op@exemplu.test', o.json().temporaryPassword, 'parola-operator-2026-x');
});
after(async () => {
  await app.close();
  await h.close();
});

describe('ciclul de viață și API-ul public (B2 §3, E-3, P-1)', () => {
  it('ciornă: invizibilă public (404); activare → în lista deschisă, cu structură și jeton de formular', async () => {
    const res = await sa.post(`${V1}/admin/surveys`, surveyBody());
    assert.equal(res.statusCode, 201, res.body);
    const s = res.json();
    assert.equal(s.status, 'draft');
    const pub = new Client(app);
    assert.equal((await pub.get(`${V1}/public/surveys/${s.id}`)).statusCode, 404);
    assert.equal((await pub.get(`${V1}/public/surveys`)).json().items.some((x: { id: string }) => x.id === s.id), false);
    assert.equal((await sa.send('PATCH', `${V1}/admin/surveys/${s.id}/status`, { status: 'active' })).statusCode, 200);
    const list = (await pub.get(`${V1}/public/surveys`)).json();
    const item = list.items.find((x: { id: string }) => x.id === s.id);
    assert.equal(item.state, 'open');
    assert.equal(item.resultsAvailable, false, 'D3: after_close');
    assert.equal(item.integrityFlag, false);
    const d = (await pub.get(`${V1}/public/surveys/${s.id}`)).json();
    assert.equal(d.questions.length, 3);
    assert.match(d.formStartedAt, /^\d+\.[\w-]+\.[0-9a-f]{64}$/);
    assert.doesNotMatch(JSON.stringify(d), /created_by|createdBy|updatedBy|firstSubmission/);
  });

  it('textul N4-1 (P-3) este exportat pentru interfață', () => {
    assert.match(SURVEY_ADVISORY_TEXT, /^Consultare orientativă/);
  });

  it('vot → 201 {recorded:true}; același cookie → 409; alt cookie → 201; amprenta diferă între sondaje; fără IP lângă vot', async () => {
    const s1 = await createActive();
    const s2 = await createActive();
    const c = await voter();
    const r1 = await vote(c, s1.id, basicAnswers(s1));
    assert.equal(r1.statusCode, 201, r1.body);
    assert.deepEqual(r1.json(), { recorded: true });
    assert.equal((await vote(c, s1.id, basicAnswers(s1))).statusCode, 409);
    assert.equal((await vote(await voter(), s1.id, basicAnswers(s1))).statusCode, 201);
    assert.equal((await vote(c, s2.id, basicAnswers(s2))).statusCode, 201);
    const fps = await q<{ survey_id: string; f: string }>('SELECT survey_id, participation_fingerprint AS f FROM survey_submissions WHERE survey_id IN (?, ?)', [s1.id, s2.id]);
    assert.equal(new Set(fps.map((x) => x.f)).size, fps.length, 'N4-7: fără corelare între sondaje');
    const cols = await q<{ c: string }>("SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('survey_submissions', 'survey_answers')");
    assert.ok(!cols.some((x) => /(^|_)ip(_|$)|agent|account|user|email/i.test(x.c)), JSON.stringify(cols));
    const token = c.cookie!.split('=')[1]!;
    assert.ok(!fps.some((x) => x.f.includes(token)), 'jetonul nu este salvat');
  });

  it('concurență: 6 voturi simultane cu același cookie → exact un rând', async () => {
    const s = await createActive();
    const c = await voter();
    const token = (await c.get(`${V1}/public/surveys/${s.id}`)).json().formStartedAt;
    clock.advanceMinutes(0.2);
    const all = await Promise.all(
      Array.from({ length: 6 }, () => c.post(`${V1}/public/surveys/${s.id}/submissions`, { answers: basicAnswers(s), hp: '', formStartedAt: token })),
    );
    assert.equal(all.filter((r) => r.statusCode === 201).length, 1);
    assert.equal(all.filter((r) => r.statusCode === 409).length, 5);
    assert.equal((await q('SELECT id FROM survey_submissions WHERE survey_id = ?', [s.id])).length, 1);
  });

  it('E-3: după end_at, votul → 403 înainte de cron; cron-ul salvează `closed`; sondajul intră în arhivă', async () => {
    const s = await createActive({ endAt: iso(30) });
    const c = await voter();
    const d = (await c.get(`${V1}/public/surveys/${s.id}`)).json();
    clock.advanceMinutes(31);
    const r = await c.post(`${V1}/public/surveys/${s.id}/submissions`, { answers: basicAnswers(s), hp: '', formStartedAt: d.formStartedAt });
    assert.equal(r.statusCode, 403);
    const [row] = await q<{ status: string }>('SELECT status FROM surveys WHERE id = ?', [s.id]);
    assert.equal(row!.status, 'active', 'încă neschimbat în DB');
    assert.ok((await closeExpiredSurveys(ctx)).includes(s.id));
    const archive = (await new Client(app).get(`${V1}/public/surveys?state=closed`)).json();
    assert.ok(archive.items.some((x: { id: string; state: string }) => x.id === s.id && x.state === 'closed'));
    assert.equal((await new Client(app).get(`${V1}/public/surveys`)).json().items.some((x: { id: string }) => x.id === s.id), false);
  });

  it('vot înainte de deschidere → 403', async () => {
    const s = await createActive({ startAt: iso(60), endAt: iso(2 * DAY) });
    assert.equal((await vote(await voter(), s.id, basicAnswers(s))).statusCode, 403);
  });
});

describe('D3: rezultatele, arhiva, marcajul de integritate (P-2)', () => {
  it('after_close: 403 cât e deschis, rezultate după închidere; live: oricând; procente pe respondenți (T-8); textul liber numai ca număr', async () => {
    const s = await createActive();
    for (let i = 0; i < 3; i++) assert.equal((await vote(await voter(), s.id, basicAnswers(s, `sugestia ${i}`))).statusCode, 201);
    // un vot fără întrebările opționale
    assert.equal((await vote(await voter(), s.id, [{ questionId: s.questions[0]!.id, value: s.questions[0]!.options[1]!.id }])).statusCode, 201);
    const pub = new Client(app);
    const before = await pub.get(`${V1}/public/surveys/${s.id}/results`);
    assert.equal(before.statusCode, 403);
    assert.equal(before.json().error.code, 'RESULTS_NOT_AVAILABLE');
    assert.equal((await sa.send('PATCH', `${V1}/admin/surveys/${s.id}/status`, { status: 'closed' })).statusCode, 200);
    const res = (await pub.get(`${V1}/public/surveys/${s.id}/results`)).json();
    assert.equal(res.totalSubmissions, 4);
    assert.equal(res.closed, true);
    const [single, multi, free] = res.questions;
    assert.equal(single.respondents, 4);
    assert.deepEqual(single.options.map((o: { count: number }) => o.count), [3, 1, 0]);
    assert.equal(single.options[0].percentage, 75);
    assert.equal(multi.respondents, 3);
    assert.equal(multi.options[0].percentage, 100);
    assert.equal(free.freeTextCount, 3);
    assert.doesNotMatch(JSON.stringify(res), /sugestia/, 'D3: textele libere nu sunt publice');

    const live = await createActive({ resultsVisibility: 'live' });
    assert.equal((await vote(await voter(), live.id, basicAnswers(live))).statusCode, 201);
    const lr = await pub.get(`${V1}/public/surveys/${live.id}/results`);
    assert.equal(lr.statusCode, 200);
    assert.equal(lr.json().totalSubmissions, 1);
  });

  it('P-2: marcajul „rezultate posibil afectate” apare public numai în arhivă', async () => {
    const s = await createActive();
    assert.equal((await sa.send('PATCH', `${V1}/admin/surveys/${s.id}/integrity`, { flag: true, note: 'Voturi repetate automat între 14:00 și 15:00.' })).statusCode, 200);
    const open = (await new Client(app).get(`${V1}/public/surveys`)).json().items.find((x: { id: string }) => x.id === s.id);
    assert.equal(open.integrityFlag, false);
    assert.equal(open.integrityNote, null);
    await sa.send('PATCH', `${V1}/admin/surveys/${s.id}/status`, { status: 'closed' });
    const arch = (await new Client(app).get(`${V1}/public/surveys?state=closed&limit=50`)).json().items.find((x: { id: string }) => x.id === s.id);
    assert.equal(arch.integrityFlag, true);
    assert.match(arch.integrityNote, /14:00/);
    const admin = (await sa.get(`${V1}/admin/surveys/${s.id}`)).json();
    assert.equal(admin.integrityFlag, true);
  });

  it('arhiva se paginează (cursor), descrescător după închidere', async () => {
    const p1 = (await new Client(app).get(`${V1}/public/surveys?state=closed&limit=1`)).json();
    assert.equal(p1.items.length, 1);
    assert.ok(p1.nextCursor);
    const p2 = (await new Client(app).get(`${V1}/public/surveys?state=closed&limit=1&cursor=${encodeURIComponent(p1.nextCursor)}`)).json();
    assert.equal(p2.items.length, 1);
    assert.notEqual(p2.items[0].id, p1.items[0].id);
    assert.ok(new Date(p2.items[0].endAt) <= new Date(p1.items[0].endAt));
    assert.equal((await new Client(app).get(`${V1}/public/surveys?state=closed&cursor=gresit`)).statusCode, 400);
  });
});

describe('textele libere (N4-9, DN-03) și retenția (A05-2, T-7)', () => {
  it('numai super_admin, numai după închidere, cu audit; golite la 6 luni de la închidere, nu mai devreme; numărul rămâne', async () => {
    const s = await createActive();
    assert.equal((await vote(await voter(), s.id, basicAnswers(s, 'Text liber de păstrat'))).statusCode, 201);
    assert.equal((await sa.get(`${V1}/admin/surveys/${s.id}/free-text`)).statusCode, 403, 'deschis');
    await sa.send('PATCH', `${V1}/admin/surveys/${s.id}/status`, { status: 'closed' });
    assert.equal((await op.get(`${V1}/admin/surveys/${s.id}/free-text`)).statusCode, 403, 'operatorul nu are surveys.edit');
    const ft = await sa.get(`${V1}/admin/surveys/${s.id}/free-text`);
    assert.equal(ft.statusCode, 200);
    assert.deepEqual(ft.json().items[0].answers, ['Text liber de păstrat']);
    assert.equal((await q("SELECT id FROM audit_log WHERE action = 'survey.free_text.read' AND target_id = ?", [s.id])).length, 1);

    const saved = clock.current;
    try {
      clock.current = new Date(saved.getTime() + 179 * DAY * 60_000);
      await purgeRetention(ctx);
      assert.equal((await q<{ t: string | null }>('SELECT a.text_value AS t FROM survey_answers a JOIN survey_submissions s ON s.id = a.submission_id WHERE s.survey_id = ? AND a.option_id IS NULL', [s.id]))[0]!.t, 'Text liber de păstrat');
      clock.current = new Date(saved.getTime() + 186 * DAY * 60_000);
      const r = await purgeRetention(ctx);
      assert.ok(r.surveyFreeTexts >= 1);
      assert.equal((await q<{ t: string | null }>('SELECT a.text_value AS t FROM survey_answers a JOIN survey_submissions s ON s.id = a.submission_id WHERE s.survey_id = ? AND a.option_id IS NULL', [s.id]))[0]!.t, null);
      const res = (await new Client(app).get(`${V1}/public/surveys/${s.id}/results`)).json();
      assert.equal(res.questions[2].freeTextCount, 1, 'T-7: numărul rămâne');
      assert.equal(res.totalSubmissions, 1, 'voturile și arhiva rămân');
    } finally {
      clock.current = saved;
    }
  });
});

describe('integritatea structurii (T-4, P-1, P-6) și permisiunile (B4)', () => {
  it('după primul vot: opțiuni / întrebări / vizibilitate / start → 409; titlu, descriere, ajutor, end_at viitor → 200', async () => {
    const s = await createActive();
    const full = (await sa.get(`${V1}/admin/surveys/${s.id}`)).json();
    // înainte de vot: structura se poate schimba
    const edited = { ...surveyBody(), startAt: full.startAt, endAt: full.endAt, questions: full.questions.map((qq: Record<string, unknown>) => ({ ...qq, ordinal: undefined })) };
    const clean = (b: Record<string, unknown>) => JSON.parse(JSON.stringify(b, (k, v) => (k === 'ordinal' ? undefined : v)));
    assert.equal((await sa.send('PUT', `${V1}/admin/surveys/${s.id}`, clean({ ...edited, questions: [...edited.questions, { text: 'Nouă?', type: 'free_text', isRequired: false, options: [] }] }))).statusCode, 200);
    const s2 = (await sa.get(`${V1}/admin/surveys/${s.id}`)).json();
    assert.equal(s2.questions.length, 4);
    assert.equal((await vote(await voter(), s.id, [{ questionId: s2.questions[0].id, value: s2.questions[0].options[0].id }])).statusCode, 201);
    const locked = (await sa.get(`${V1}/admin/surveys/${s.id}`)).json();
    assert.equal(locked.locked, true);
    const base = clean({ title: locked.title, description: locked.description, category: locked.category, startAt: locked.startAt, endAt: locked.endAt, resultsVisibility: locked.resultsVisibility, questions: locked.questions });
    const opt = structuredClone(base); opt.questions[0].options[0].text = 'Altceva';
    assert.equal((await sa.send('PUT', `${V1}/admin/surveys/${s.id}`, opt)).statusCode, 409);
    const vis = { ...structuredClone(base), resultsVisibility: 'live' };
    assert.equal((await sa.send('PUT', `${V1}/admin/surveys/${s.id}`, vis)).statusCode, 409, 'P-6');
    const st = { ...structuredClone(base), startAt: iso(-120) };
    assert.equal((await sa.send('PUT', `${V1}/admin/surveys/${s.id}`, st)).statusCode, 409);
    const fewer = { ...structuredClone(base), questions: base.questions.slice(0, 3) };
    assert.equal((await sa.send('PUT', `${V1}/admin/surveys/${s.id}`, fewer)).statusCode, 409);
    const ok = structuredClone(base); ok.title = 'Titlu nou după vot'; ok.questions[0].helpText = 'Ajutor nou'; ok.endAt = iso(10 * DAY);
    const r = await sa.send('PUT', `${V1}/admin/surveys/${s.id}`, ok);
    assert.equal(r.statusCode, 200, r.body);
    assert.equal(r.json().title, 'Titlu nou după vot');
    assert.equal(r.json().questions[0].helpText, 'Ajutor nou');
    const past = structuredClone(base); past.endAt = iso(-5);
    assert.equal((await sa.send('PUT', `${V1}/admin/surveys/${s.id}`, past)).statusCode, 422);
    assert.equal((await sa.send('DELETE', `${V1}/admin/surveys/${s.id}`)).statusCode, 409, 'sondaj cu voturi');
    assert.equal((await sa.send('PATCH', `${V1}/admin/surveys/${s.id}/status`, { status: 'draft' })).statusCode, 409);
    // închiderea anticipată: end_at = acum (T-1); apoi definitiv (P-1)
    const closed = await sa.send('PATCH', `${V1}/admin/surveys/${s.id}/status`, { status: 'closed' });
    assert.equal(closed.statusCode, 200);
    assert.equal(new Date(closed.json().endAt).getTime(), clock.now().getTime());
    assert.equal((await sa.send('PATCH', `${V1}/admin/surveys/${s.id}/status`, { status: 'active' })).statusCode, 409, 'P-1: fără redeschidere');
    assert.equal((await sa.send('PUT', `${V1}/admin/surveys/${s.id}`, ok)).statusCode, 409, 'închis = definitiv');
  });

  it('ștergerea: ciorna fără voturi → 204, cu audit; operatorul: numai vizualizare; publicul: 401; D4: fără endpoint de resetare', async () => {
    const d = (await sa.post(`${V1}/admin/surveys`, surveyBody())).json();
    assert.equal((await op.send('DELETE', `${V1}/admin/surveys/${d.id}`)).statusCode, 403);
    assert.equal((await op.post(`${V1}/admin/surveys`, surveyBody())).statusCode, 403);
    assert.equal((await op.send('PATCH', `${V1}/admin/surveys/${d.id}/status`, { status: 'active' })).statusCode, 403);
    assert.equal((await op.get(`${V1}/admin/surveys`)).statusCode, 200);
    assert.equal((await op.get(`${V1}/admin/surveys/${d.id}/results`)).statusCode, 200);
    assert.equal((await new Client(app).get(`${V1}/admin/surveys`)).statusCode, 401);
    assert.equal((await sa.send('DELETE', `${V1}/admin/surveys/${d.id}`)).statusCode, 204);
    assert.equal((await q("SELECT id FROM audit_log WHERE action = 'survey.delete' AND target_id = ?", [d.id])).length, 1);
    for (const path of ['/admin/surveys/reset-demo', '/admin/surveys/reset']) {
      assert.equal((await sa.post(`${V1}${path}`, {})).statusCode, 404);
    }
  });

  it('validarea structurii: alegere cu < 2 opțiuni, text liber cu opțiuni, perioadă inversă → 422; câmp necunoscut → 400', async () => {
    const bad1 = surveyBody({ questions: [{ text: 'Q?', type: 'single_choice', isRequired: true, options: [{ text: 'A' }] }] });
    assert.equal((await sa.post(`${V1}/admin/surveys`, bad1)).statusCode, 422);
    const bad2 = surveyBody({ questions: [{ text: 'Q?', type: 'free_text', isRequired: true, options: [{ text: 'A' }] }] });
    assert.equal((await sa.post(`${V1}/admin/surveys`, bad2)).statusCode, 422);
    assert.equal((await sa.post(`${V1}/admin/surveys`, surveyBody({ endAt: iso(-120) }))).statusCode, 422);
    assert.equal((await sa.post(`${V1}/admin/surveys`, { ...surveyBody(), extra: 1 })).statusCode, 400);
  });
});

describe('validarea votului și anti-abuzul (B7, P-7, T-2)', () => {
  it('obligatoriu lipsă, opțiune străină, două opțiuni la alegere unică, text > 2000 → 422; fără cookie → 400', async () => {
    const s = await createActive();
    const other = await createActive();
    const c = await voter();
    assert.equal((await vote(c, s.id, [])).statusCode, 422);
    assert.equal((await vote(c, s.id, [{ questionId: s.questions[0]!.id, value: other.questions[0]!.options[0]!.id }])).statusCode, 422);
    assert.equal((await vote(c, s.id, [{ questionId: s.questions[0]!.id, value: [s.questions[0]!.options[0]!.id, s.questions[0]!.options[1]!.id] }])).statusCode, 422);
    assert.equal((await vote(c, s.id, [...basicAnswers(s).slice(0, 2), { questionId: s.questions[2]!.id, value: 'x'.repeat(2001) }])).statusCode, 422);
    const noCookie = new Client(app, undefined, nextIp());
    const d = (await noCookie.get(`${V1}/public/surveys/${s.id}`)).json();
    noCookie.cookie = undefined;
    clock.advanceMinutes(0.2);
    const r = await noCookie.post(`${V1}/public/surveys/${s.id}/submissions`, { answers: basicAnswers(s), hp: '', formStartedAt: d.formStartedAt });
    assert.equal(r.statusCode, 400);
    assert.equal(r.json().error.code, 'PARTICIPATION_REQUIRED');
    assert.equal((await vote(c, s.id, basicAnswers(s))).statusCode, 201, 'după erori, votul valid trece');
  });

  it('capcana → 422; sub 6 s → 422; jeton de formular al altui sondaj → 422', async () => {
    const s = await createActive();
    const other = await createActive();
    const c = await voter();
    assert.equal((await vote(c, s.id, basicAnswers(s), { hp: 'robot' })).statusCode, 422);
    const d = (await c.get(`${V1}/public/surveys/${s.id}`)).json();
    clock.advanceMinutes(0.05); // 3 s < 6 s
    assert.equal((await c.post(`${V1}/public/surveys/${s.id}/submissions`, { answers: basicAnswers(s), hp: '', formStartedAt: d.formStartedAt })).statusCode, 422);
    const foreign = (await c.get(`${V1}/public/surveys/${other.id}`)).json().formStartedAt;
    assert.equal((await vote(c, s.id, basicAnswers(s), { token: foreign })).statusCode, 422);
    const reasons = await q<{ reason: string; ip_hash: string }>("SELECT reason, ip_hash FROM rejected_attempts WHERE area = 'vote' AND target_id = ?", [s.id]);
    assert.ok(reasons.some((r) => r.reason === 'honeypot') && reasons.some((r) => r.reason === 'too_fast'));
    assert.ok(reasons.every((r) => /^[0-9a-f]{64}$/.test(r.ip_hash) && !r.ip_hash.includes('10.20')), 'fără IP în clar');
  });

  it('P-7: al 11-lea vot pe oră din aceeași rețea → 429 + Retry-After; X-Forwarded-For falsificat nu ocolește limita', async () => {
    const s = await createActive();
    const ip = '10.99.0.7';
    for (let i = 0; i < 10; i++) assert.equal((await vote(await voter(ip), s.id, basicAnswers(s))).statusCode, 201, `votul ${i + 1}`);
    const c = await voter(ip);
    const d = (await c.get(`${V1}/public/surveys/${s.id}`)).json();
    clock.advanceMinutes(0.2);
    const r = await c.send('POST', `${V1}/public/surveys/${s.id}/submissions`, { answers: basicAnswers(s), hp: '', formStartedAt: d.formStartedAt }, { 'x-forwarded-for': '203.0.113.9' });
    assert.equal(r.statusCode, 429);
    assert.equal(r.headers['retry-after'], '3600');
    // altă rețea: votează normal
    assert.equal((await vote(await voter(), s.id, basicAnswers(s))).statusCode, 201);
  });

  it('ALTCHA per sondaj: pornit → fără soluție 400, cu soluție 201, reluată 400; oprit → provocarea 404', async () => {
    // partea cu soluție rulează după ceasul real (mai jos): sondajul trebuie să fie deschis și la ora reală,
    // altfel testul expiră singur (a picat din 08.10.2026, când „ceasul de test + 7 zile” a trecut)
    const s = await createActive({ endAt: new Date(Math.max(Date.now(), clock.now().getTime()) + 7 * DAY * 60_000).toISOString() });
    assert.equal((await new Client(app).get(`${V1}/public/surveys/${s.id}/pow-challenge`)).statusCode, 404);
    assert.equal((await sa.send('PATCH', `${V1}/admin/surveys/${s.id}/pow`, { enabled: true })).statusCode, 200);
    // altcha-lib verifică expirarea după ceasul real: partea cu soluție rulează cu ceasul la ora reală
    const saved = clock.current;
    clock.current = new Date();
    try {
      assert.equal((await vote(await voter(), s.id, basicAnswers(s))).statusCode, 400);
      const challenge = (await new Client(app).get(`${V1}/public/surveys/${s.id}/pow-challenge`)).json();
      const solution = await solveChallenge({ challenge, deriveKey: shaDeriveKey });
      const pow = Buffer.from(JSON.stringify({ challenge, solution })).toString('base64');
      assert.equal((await vote(await voter(), s.id, basicAnswers(s), { pow })).statusCode, 201);
      assert.equal((await vote(await voter(), s.id, basicAnswers(s), { pow })).statusCode, 400, 'anti-reluare');
    } finally {
      clock.current = saved;
    }
  });
});

describe('jurnalul fără IP (T-5), tabloul de bord, respingerile', () => {
  it('rutele sondajelor nu scriu IP-ul în jurnal; celelalte da', () => {
    const vote = requestLogSerializer({ method: 'POST', url: '/api/v1/public/surveys/X/submissions', ip: '198.51.100.4' });
    assert.equal(JSON.stringify(vote).includes('198.51.100.4'), false);
    const other = requestLogSerializer({ method: 'GET', url: '/api/v1/public/announcements', ip: '198.51.100.4' });
    assert.equal(other.remoteAddress, '198.51.100.4');
  });

  it('/admin/dashboard: contoare agregate (dashboard.view, și pentru operator); respingerile agregate (surveys.view)', async () => {
    const d = await op.get(`${V1}/admin/dashboard`);
    assert.equal(d.statusCode, 200, d.body);
    const body = d.json();
    assert.ok(body.surveys.submissions > 0);
    assert.ok(body.surveys.open > 0 && body.surveys.closed > 0 && body.surveys.draft >= 0);
    assert.equal(typeof body.reports.total, 'number');
    assert.equal((await new Client(app).get(`${V1}/admin/dashboard`)).statusCode, 401);
    const [s] = await q<{ target_id: string }>("SELECT target_id FROM rejected_attempts WHERE area = 'vote' AND reason = 'rate_limited' LIMIT 1");
    const rej = (await op.get(`${V1}/admin/surveys/${s!.target_id}/rejections`)).json();
    assert.ok(rej.items.some((r: { reason: string; count: number }) => r.reason === 'rate_limited' && r.count >= 1));
    assert.doesNotMatch(JSON.stringify(rej), /ip/i);
  });
});
