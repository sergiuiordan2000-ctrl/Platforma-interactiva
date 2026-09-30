/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Admin — Sesizări (Faza 5.4; B2 §6.1). Înlocuiește ecranul „Moderare”: moderarea NU există (2.3).
 * - stadiile (DN-09, 2.1): „în analiză” se setează automat la transmiterea către Primărie;
 *   „rezolvată” numai de Primărie, când participă prin platformă (P-9);
 * - asumarea individuală (super_admin) și preluarea instituțională (Primăria), fără schimbarea stadiului (C-3);
 * - note interne (fără notificare, A06-3);
 * - drepturi exclusive super_admin: e-mailul autorului (A-8), jurnalul e-mail și reîncercarea (2.11),
 *   corectarea poziției (2.11, D6-5), ștergerea definitivă (A-5).
 * Toate regulile se aplică pe server; interfața afișează butoanele conform rolului.
 */

import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Camera,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock,
  Layers,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  PlayCircle,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
  UserCheck,
  UserMinus,
} from 'lucide-react';
import type { AdminReportStats, TransmissionState } from '@tmc/shared';
import {
  STATUS_LABELS,
  reportService,
  type AdminReportDetail,
  type AdminReportListItem,
  type ReportStatus,
} from '../../../services/reportService';
import { authService } from '../../../services/authService';
import { permissionService } from '../../../services/permissionService';
import { ApiError } from '../../../services/apiClient';
import { RegistrySettingsPanel } from './RegistrySettingsPanel';

interface AdminReportsProps {
  onSuccess: (message: string) => void;
}

type StatusFilter = 'all' | ReportStatus;

const STATUS_COLORS: Record<ReportStatus, string> = {
  new: 'bg-blue-100 text-blue-800 border-blue-300',
  in_analysis: 'bg-amber-100 text-amber-800 border-amber-300',
  resolved: 'bg-emerald-100 text-emerald-800 border-emerald-300',
};
const STATUS_ICONS: Record<ReportStatus, React.ReactNode> = {
  new: <Sparkles className="w-3.5 h-3.5" />,
  in_analysis: <PlayCircle className="w-3.5 h-3.5" />,
  resolved: <ClipboardCheck className="w-3.5 h-3.5" />,
};
const TRANSMISSION_LABELS: Record<TransmissionState, string> = {
  not_requested: 'Transmitere nesolicitată',
  on_hold: 'În așteptare (flux oprit)',
  queued: 'În coadă',
  sent: 'Trimisă Primăriei',
  failed: 'Eșuată',
  stopped: 'Oprită (fără trimitere reală)',
};
const errText = (err: unknown) => (err instanceof ApiError || err instanceof Error ? err.message : 'Operația nu a reușit.');

export const AdminReports: React.FC<AdminReportsProps> = ({ onSuccess }) => {
  const user = authService.getCurrentUser();
  const isSuper = user?.role === 'super_admin';
  const canResolve = permissionService.currentUserCan('reports.resolve');
  const canReply = permissionService.currentUserCan('reports.reply');
  const actsForCityHall = permissionService.currentUserActsForCityHall();
  const canManageRegistry = Boolean(user?.permissions.includes('notifications.recipient.manage'));

  const [items, setItems] = useState<AdminReportListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, AdminReportDetail>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [locEdit, setLocEdit] = useState<Record<string, { lat: string; lng: string; text: string; reason: string }>>({});

  const load = async (append = false) => {
    setLoading(true);
    setLoadError(null);
    try {
      const [page, st] = await Promise.all([
        reportService.adminList({
          resolution: filter === 'all' ? undefined : filter,
          q: appliedQuery || undefined,
          cursor: append ? nextCursor ?? undefined : undefined,
        }),
        reportService.adminStats(),
      ]);
      setItems((prev) => (append ? [...prev, ...page.items] : page.items));
      setNextCursor(page.nextCursor);
      setStats(st);
    } catch (err) {
      setLoadError(errText(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, appliedQuery]);

  const loadDetail = async (id: string) => {
    try {
      const d = await reportService.adminDetail(id);
      setDetails((prev) => ({ ...prev, [id]: d }));
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...d } : i)));
    } catch (err) {
      setActionError(errText(err));
    }
  };

  const toggle = (id: string) => {
    if (open === id) {
      setOpen(null);
      return;
    }
    setOpen(id);
    void loadDetail(id);
  };

  /** Rulează o acțiune; după succes reîncarcă detaliul și contoarele (fără UI optimist). */
  const act = async (id: string, fn: () => Promise<unknown>, success: string) => {
    setBusy(id);
    setActionError(null);
    try {
      await fn();
      onSuccess(success);
      await Promise.all([loadDetail(id), reportService.adminStats().then(setStats).catch(() => undefined)]);
    } catch (err) {
      setActionError(errText(err));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (item: AdminReportListItem) => {
    setBusy(item.id);
    setActionError(null);
    try {
      await reportService.deleteReport(item.id);
      onSuccess(`Sesizarea ${item.referenceNumber} a fost ștearsă definitiv.`);
      setConfirmDelete(null);
      setOpen(null);
      await load(false);
    } catch (err) {
      setActionError(errText(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      {actionError && (
        <div role="alert" className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 font-semibold flex items-center justify-between gap-3">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)} className="text-red-700 hover:text-red-900 font-bold" aria-label="Închide">
            ×
          </button>
        </div>
      )}

      {/* 1. Antet și contoare */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-700" />
              <span>Sesizări cetățenești</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sesizările apar pe hartă imediat, fără moderare (2.3). Aici se urmăresc stadiile, asumarea / preluarea și notele interne.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load(false)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs self-start"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Actualizează
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200">
            <div className="flex items-center justify-between text-blue-900 text-xs font-bold">
              <span>Noi</span>
              <Sparkles className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-blue-950 mt-1">{stats?.byStatus.new ?? '–'}</div>
            <div className="text-[10px] text-blue-700 mt-0.5">Netransmise sau în așteptare</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200">
            <div className="flex items-center justify-between text-amber-900 text-xs font-bold">
              <span>În analiză</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-950 mt-1">{stats?.byStatus.in_analysis ?? '–'}</div>
            <div className="text-[10px] text-amber-700 mt-0.5">Transmise Primăriei</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200">
            <div className="flex items-center justify-between text-emerald-900 text-xs font-bold">
              <span>Rezolvate</span>
              <ClipboardCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-950 mt-1">{stats?.byStatus.resolved ?? '–'}</div>
            <div className="text-[10px] text-emerald-700 mt-0.5">Marcate de Primărie</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-slate-800 text-xs font-bold">
              <span>Fără poziție</span>
              <MapPin className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats?.withoutPosition ?? '–'}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Nu apar pe hartă</div>
          </div>
        </div>
        {isSuper && stats?.emailFailures ? (
          <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {stats.emailFailures} e-mailuri eșuate (A17-9). Deschideți sesizarea pentru reîncercare.
          </div>
        ) : null}
      </div>

      {canManageRegistry && <RegistrySettingsPanel onSuccess={onSuccess} />}

      {/* 2. Filtre */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {(['all', 'new', 'in_analysis', 'resolved'] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                filter === f ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {f === 'all' ? `Toate (${stats?.total ?? '–'})` : STATUS_LABELS[f]}
            </button>
          ))}
        </div>
        <form
          className="relative min-w-[240px]"
          onSubmit={(e) => {
            e.preventDefault();
            setAppliedQuery(query.trim());
          }}
        >
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Caută TM-XXX sau text, apoi Enter"
            className="w-full pl-9 pr-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </form>
      </div>

      {/* 3. Lista */}
      {loadError ? (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
          <span>Lista nu a putut fi încărcată: {loadError}</span>
          <button type="button" onClick={() => void load(false)} className="font-bold underline">
            Reîncearcă
          </button>
        </div>
      ) : loading && items.length === 0 ? (
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 p-8">
          <Loader2 className="w-4 h-4 animate-spin" /> Se încarcă sesizările...
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-2">
          <p className="text-sm font-bold text-slate-700">Nu există sesizări corespunzătoare filtrului selectat.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const d = details[item.id];
            const isOpen = open === item.id;
            const assumedByMe = item.assignees.some((a) => a.id === user?.id);
            const edit = locEdit[item.id];
            return (
              <div key={item.id} className="bg-white rounded-3xl border-2 border-slate-200 hover:border-slate-300 transition-all p-5 sm:p-6 space-y-4 shadow-sm" data-testid="admin-report-card">
                {/* antet */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-base font-black text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">{item.referenceNumber}</span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800">{item.categoryName}</span>
                    <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 border ${STATUS_COLORS[item.status]}`}>
                      {STATUS_ICONS[item.status]}
                      <span>{STATUS_LABELS[item.status]}</span>
                    </span>
                    {item.cityHallTakenOver && (
                      <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border bg-teal-100 text-teal-800 border-teal-300 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" /> Preluată de Primărie
                      </span>
                    )}
                    {item.isDemo && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-white">DEMO</span>}
                  </div>
                  <div className="text-xs text-slate-400 font-medium">{new Date(item.createdAt).toLocaleString('ro-RO')}</div>
                </div>

                {/* corp */}
                <div className="space-y-2 text-xs">
                  <p className="text-slate-800 bg-slate-50/80 p-3 rounded-xl border border-slate-200 leading-relaxed">„{item.description}”</p>
                  <div className="flex flex-wrap items-start gap-2 text-slate-600">
                    <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span className="font-bold text-slate-900">{item.locationText}</span>
                    {!item.hasPosition ? (
                      <span className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Fără poziție (nu apare pe hartă)
                      </span>
                    ) : item.locationApproximate ? (
                      <span className="text-[11px] text-amber-700">zonă aproximativă (adresă)</span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {TRANSMISSION_LABELS[item.transmission]}
                    </span>
                    {item.photoCount > 0 && (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 flex items-center gap-1">
                        <Camera className="w-3 h-3" /> {item.photoCount} {item.photoCount === 1 ? 'fotografie' : 'fotografii'}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      {item.assignees.length > 0 ? `Responsabili: ${item.assignees.map((a) => (a.id === user?.id ? `${a.displayName} (dvs.)` : a.displayName)).join(', ')}` : 'Niciun responsabil individual'}
                    </span>
                  </div>
                </div>

                {/* acțiuni rapide */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <button type="button" onClick={() => toggle(item.id)} className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:underline">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />} {isOpen ? 'Ascunde detaliile' : 'Detalii și acțiuni'}
                  </button>
                  <div className="flex flex-wrap items-center gap-2">
                    {canResolve && actsForCityHall && !item.cityHallTakenOver && (
                      <button
                        type="button"
                        disabled={busy === item.id}
                        onClick={() => void act(item.id, () => reportService.takeOver(item.id), `Sesizarea ${item.referenceNumber} a fost preluată de Primărie.`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-[11px]"
                      >
                        <Building2 className="w-3.5 h-3.5" /> Preia de către Primărie
                      </button>
                    )}
                    {canResolve && actsForCityHall && item.status === 'in_analysis' && (
                      <button
                        type="button"
                        disabled={busy === item.id}
                        onClick={() => void act(item.id, () => reportService.markResolved(item.id), `Sesizarea ${item.referenceNumber} a fost marcată „rezolvată”.`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" /> Marchează rezolvată
                      </button>
                    )}
                    {canResolve && !actsForCityHall && !assumedByMe && (
                      <button
                        type="button"
                        disabled={busy === item.id}
                        onClick={() => void act(item.id, () => reportService.assume(item.id), `Ați asumat sesizarea ${item.referenceNumber}.`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-[11px]"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Asumă
                      </button>
                    )}
                    {canResolve && !actsForCityHall && assumedByMe && (
                      <button
                        type="button"
                        disabled={busy === item.id}
                        onClick={() => void act(item.id, () => reportService.withdrawAssumption(item.id), `Ați renunțat la asumarea sesizării ${item.referenceNumber}.`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-[11px]"
                      >
                        <UserMinus className="w-3.5 h-3.5" /> Renunță la asumare
                      </button>
                    )}
                  </div>
                </div>

                {/* detalii */}
                {isOpen && (
                  <div className="pt-4 border-t-2 border-dashed border-slate-200 space-y-4 text-xs">
                    {!d ? (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Loader2 className="w-4 h-4 animate-spin" /> Se încarcă detaliile...
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1 text-slate-600">
                            <div>
                              <span className="font-bold">Poziție: </span>
                              {d.lat !== null && d.lng !== null ? (
                                <span className="font-mono">
                                  {d.lat.toFixed(6)}, {d.lng.toFixed(6)} ({d.locationSource})
                                </span>
                              ) : (
                                'lipsă'
                              )}
                            </div>
                            <div>
                              <span className="font-bold">Notificări către autor: </span>
                              {d.notifyOptIn ? 'da' : 'nu'}
                            </div>
                            {d.cityHallTakenOverAt && (
                              <div>
                                <span className="font-bold">Preluată: </span>
                                {new Date(d.cityHallTakenOverAt).toLocaleString('ro-RO')} ({d.cityHallTakenOverBy})
                              </div>
                            )}
                            {isSuper && (
                              <div>
                                <span className="font-bold">E-mailul autorului: </span>
                                {d.authorEmail ?? <em>contul a fost șters</em>}
                              </div>
                            )}
                          </div>
                          {d.photos.length > 0 && (
                            <div className="flex items-center gap-2 overflow-x-auto py-1">
                              {d.photos.map((p) => (
                                <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer">
                                  <img src={p.url} alt={`Fotografia ${p.ordinal}`} className="w-20 h-20 object-cover rounded-xl border border-slate-200" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* note interne */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-slate-400" /> Note interne ({d.responses.length})
                          </span>
                          {d.responses.map((r) => (
                            <div key={r.id} className="bg-purple-50/60 border border-purple-100 rounded-xl p-3 space-y-1">
                              <div className="flex items-center justify-between text-[10px] text-purple-700 font-bold">
                                <span>{r.authorDisplayName}</span>
                                <span className="font-normal text-purple-500">{new Date(r.createdAt).toLocaleString('ro-RO')}</span>
                              </div>
                              <p className="text-slate-800 leading-relaxed">{r.message}</p>
                            </div>
                          ))}
                          {canReply && (
                            <div className="flex flex-col sm:flex-row gap-2 pt-1">
                              <textarea
                                value={notes[item.id] ?? ''}
                                onChange={(e) => setNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                placeholder="Notă internă (nu se trimite nimănui)..."
                                rows={2}
                                className="flex-1 p-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-200"
                              />
                              <button
                                type="button"
                                disabled={busy === item.id || !(notes[item.id] ?? '').trim()}
                                onClick={() =>
                                  void act(item.id, async () => {
                                    await reportService.addNote(item.id, (notes[item.id] ?? '').trim());
                                    setNotes((prev) => ({ ...prev, [item.id]: '' }));
                                  }, `Nota a fost adăugată la ${item.referenceNumber}.`)
                                }
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-40 text-white font-bold text-xs shrink-0 self-start sm:self-stretch"
                              >
                                <Send className="w-3.5 h-3.5" /> Adaugă nota
                              </button>
                            </div>
                          )}
                        </div>

                        {/* super_admin: jurnal e-mail, corectarea poziției, ștergerea */}
                        {isSuper && (
                          <div className="space-y-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                            <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Drepturi exclusive super_admin</div>

                            <div className="space-y-1">
                              <div className="font-bold text-slate-700">Jurnal e-mail ({d.emails?.length ?? 0})</div>
                              {(d.emails ?? []).map((e) => (
                                <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-1">
                                  <span>
                                    {e.type} · <strong>{e.status}</strong> · {e.attempts} încercări{e.lastError ? ` · ${e.lastError}` : ''}
                                  </span>
                                  {e.status === 'failed' && (
                                    <button
                                      type="button"
                                      onClick={() => void act(item.id, () => reportService.retryEmail(item.id, e.id), 'Mesajul a fost repus în coadă.')}
                                      className="font-bold text-blue-700 hover:underline"
                                    >
                                      Reîncearcă
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>

                            <div className="space-y-1.5">
                              <div className="font-bold text-slate-700">Corectarea poziției (se auditează)</div>
                              {edit ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <input className="p-2 border border-slate-200 rounded-lg" placeholder="Latitudine (ex. 43.7518)" value={edit.lat} onChange={(e) => setLocEdit((p) => ({ ...p, [item.id]: { ...edit, lat: e.target.value } }))} />
                                  <input className="p-2 border border-slate-200 rounded-lg" placeholder="Longitudine (ex. 24.8692)" value={edit.lng} onChange={(e) => setLocEdit((p) => ({ ...p, [item.id]: { ...edit, lng: e.target.value } }))} />
                                  <input className="p-2 border border-slate-200 rounded-lg sm:col-span-2" placeholder="Text nou al locației (opțional)" value={edit.text} onChange={(e) => setLocEdit((p) => ({ ...p, [item.id]: { ...edit, text: e.target.value } }))} />
                                  <input className="p-2 border border-slate-200 rounded-lg sm:col-span-2" placeholder="Motivul corectării (obligatoriu)" value={edit.reason} onChange={(e) => setLocEdit((p) => ({ ...p, [item.id]: { ...edit, reason: e.target.value } }))} />
                                  <div className="flex gap-2 sm:col-span-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void act(item.id, async () => {
                                          await reportService.correctLocation(item.id, {
                                            lat: Number(edit.lat.replace(',', '.')),
                                            lng: Number(edit.lng.replace(',', '.')),
                                            ...(edit.text.trim() ? { text: edit.text.trim() } : {}),
                                            reason: edit.reason.trim(),
                                          });
                                          setLocEdit((p) => {
                                            const c = { ...p };
                                            delete c[item.id];
                                            return c;
                                          });
                                          await load(false);
                                        }, `Poziția sesizării ${item.referenceNumber} a fost corectată.`)
                                      }
                                      className="px-3 py-1.5 rounded-xl bg-blue-700 text-white font-bold"
                                    >
                                      Salvează poziția
                                    </button>
                                    <button type="button" onClick={() => setLocEdit((p) => { const c = { ...p }; delete c[item.id]; return c; })} className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-bold">
                                      Renunță
                                    </button>
                                  </div>
                                  <p className="text-[10px] text-slate-500 sm:col-span-2">Coordonatele pot fi copiate de pe openstreetmap.org (click dreapta → „Centrează harta aici”). Numai în municipiu.</p>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setLocEdit((p) => ({ ...p, [item.id]: { lat: d.lat?.toString() ?? '', lng: d.lng?.toString() ?? '', text: '', reason: '' } }))}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-[11px]"
                                >
                                  <MapPin className="w-3.5 h-3.5" /> Corectează poziția
                                </button>
                              )}
                            </div>

                            <div>
                              {confirmDelete === item.id ? (
                                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                  <span className="text-red-700 font-semibold">Ștergere definitivă: sesizarea, fotografiile, notele și jurnalul e-mail. Nu se poate anula.</span>
                                  <button type="button" disabled={busy === item.id} onClick={() => void remove(item)} className="px-3 py-1.5 rounded-xl bg-red-600 text-white font-bold">
                                    Da, șterge
                                  </button>
                                  <button type="button" onClick={() => setConfirmDelete(null)} className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-bold">
                                    Renunță
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDelete(item.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-red-50 border border-red-200 text-red-700 font-bold text-[11px]"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Șterge definitiv
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {nextCursor && (
            <button type="button" disabled={loading} onClick={() => void load(true)} className="w-full py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50">
              {loading ? 'Se încarcă...' : 'Încarcă mai multe'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
