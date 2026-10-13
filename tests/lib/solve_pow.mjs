// D-B3 (13.10.2026): rezolvă o provocare ALTCHA v2 pentru testele E2E care apelează API-ul direct
// (aceeași bibliotecă și același algoritm ca serverul). Intrare: provocarea JSON pe stdin.
// Ieșire: câmpul `pow` (base64 al `{ challenge, solution }`), pe stdout.
import { solveChallenge } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/sha';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const challenge = JSON.parse(input);
const solution = await solveChallenge({ challenge, deriveKey });
if (!solution) {
  console.error('provocarea ALTCHA nu a putut fi rezolvată');
  process.exit(1);
}
process.stdout.write(Buffer.from(JSON.stringify({ challenge, solution: { counter: solution.counter, derivedKey: solution.derivedKey } })).toString('base64'));
