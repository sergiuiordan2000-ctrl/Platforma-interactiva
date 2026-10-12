// Faza 6, Pasul 2 (TRUST_PROXY, criteriile T1–T4): pagina TEMPORARĂ de diagnostic a adresei vizitatorului.
//
// Scop: să aflăm, fără răspunsul furnizorului, cum ajunge cererea la aplicație pe găzduire:
// - de la ce adresă vine conexiunea (socket-ul): serverul web local sau vizitatorul;
// - ce anteturi poartă adresa vizitatorului și dacă un antet trimis de vizitator este păstrat (falsificabil);
// - ce adresă calculează aplicația cu setarea TRUST_PROXY curentă.
//
// Siguranță:
// - există numai cu DIAG_CLIENT_IP=on (altfel 404); în producție configurarea refuză setarea;
// - pe staging stă în spatele lacătului (Directory Privacy);
// - din anteturi se întorc VALORI numai pentru lista fixă de mai jos; pentru restul, numai NUMELE
//   (niciodată cookie, autorizare sau alte valori);
// - nu scrie nimic și nu atinge baza de date. Se scoate ștergând setarea și repornind aplicația.

import type { FastifyInstance } from 'fastify';
import type { Config } from '../config.ts';

/** Anteturile care pot purta adresa vizitatorului sau protocolul: singurele ale căror valori se afișează. */
export const DIAG_HEADERS = [
  'x-forwarded-for',
  'x-real-ip',
  'forwarded',
  'x-forwarded-proto',
  'x-forwarded-host',
  'x-forwarded-port',
  'x-client-ip',
  'client-ip',
  'true-client-ip',
  'cf-connecting-ip',
  'x-cluster-client-ip',
  'via',
] as const;

export function registerDiagnosticRoutes(api: FastifyInstance, config: Config): void {
  if (!config.diagClientIp) return;
  api.get('/diag/client-ip', async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    const values: Record<string, string | string[] | null> = {};
    for (const name of DIAG_HEADERS) values[name] = request.headers[name] ?? null;
    return {
      note: 'Pagină temporară de diagnostic (Faza 6, TRUST_PROXY). Se oprește ștergând DIAG_CLIENT_IP din civic.env și repornind aplicația.',
      connection: {
        remoteAddress: request.socket.remoteAddress ?? null,
        remoteFamily: request.socket.remoteFamily ?? null,
        localAddress: request.socket.localAddress ?? null,
      },
      application: {
        trustProxy: config.trustProxy,
        ip: request.ip,
        ips: request.ips ?? null,
        protocol: request.protocol,
        host: request.host,
      },
      headers: values,
      headerNames: Object.keys(request.headers).sort(),
    };
  });
}
