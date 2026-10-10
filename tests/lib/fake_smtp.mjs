// Server SMTP FALS, local, pentru testul E2E cap-coadă al fluxului critic (Faza 6, Pasul 3A).
//
//   node tests/lib/fake_smtp.mjs <port>
//   mediu: FAKE_SMTP_KEY, FAKE_SMTP_CERT (căile certificatului TLS generat la rulare de harness),
//          FAKE_SMTP_USER, FAKE_SMTP_PASS (aceleași valori ca SMTP_USER / SMTP_PASS ale serverului de test),
//          FAKE_SMTP_OUT (fișierul în care se scriu mesajele primite, câte un obiect JSON pe rând)
//
// Joacă rolul furnizorului de e-mail numai pe calculatorul de test: ascultă numai pe adresa locală, cere STARTTLS
// și autentificare (ca aplicația să parcurgă drumul real: TLS obligatoriu, parolă, expeditor), primește mesajele și
// le scrie într-un fișier. NU retransmite nimic: niciun mesaj nu părăsește calculatorul. Fișierul nu intră în
// pachetul de instalare (server/scripts/package-release.py nu include `tests/`).
// Dependența `smtp-server` este cea a testelor serverului (aprobată la 5.5a, numai pentru teste).

import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { SMTPServer } from 'smtp-server';

const port = Number(process.argv[2]);
const { FAKE_SMTP_KEY, FAKE_SMTP_CERT, FAKE_SMTP_USER, FAKE_SMTP_PASS, FAKE_SMTP_OUT } = process.env;
if (!Number.isInteger(port) || port < 1024 || !FAKE_SMTP_KEY || !FAKE_SMTP_CERT || !FAKE_SMTP_USER || !FAKE_SMTP_PASS || !FAKE_SMTP_OUT) {
  console.error('Utilizare: FAKE_SMTP_KEY=… FAKE_SMTP_CERT=… FAKE_SMTP_USER=… FAKE_SMTP_PASS=… FAKE_SMTP_OUT=… node tests/lib/fake_smtp.mjs <port>');
  process.exit(2);
}

writeFileSync(FAKE_SMTP_OUT, '');

const server = new SMTPServer({
  secure: false, // STARTTLS, ca la un furnizor real pe portul 587
  key: readFileSync(FAKE_SMTP_KEY),
  cert: readFileSync(FAKE_SMTP_CERT),
  authMethods: ['PLAIN', 'LOGIN'],
  logger: false,
  onAuth(auth, _session, cb) {
    if (auth.username === FAKE_SMTP_USER && auth.password === FAKE_SMTP_PASS) return cb(null, { user: FAKE_SMTP_USER });
    return cb(new Error('Autentificare refuzată'));
  },
  onData(stream, session, cb) {
    const chunks = [];
    stream.on('data', (c) => chunks.push(c));
    stream.on('end', () => {
      appendFileSync(
        FAKE_SMTP_OUT,
        JSON.stringify({
          at: new Date().toISOString(),
          tls: Boolean(session.secure),
          from: session.envelope.mailFrom ? session.envelope.mailFrom.address : '',
          to: session.envelope.rcptTo.map((r) => r.address),
          raw: Buffer.concat(chunks).toString('base64'),
        }) + '\n',
      );
      cb();
    });
  },
});

server.on('error', () => {}); // o conexiune întreruptă de client nu oprește serverul de test
server.listen(port, '127.0.0.1');
