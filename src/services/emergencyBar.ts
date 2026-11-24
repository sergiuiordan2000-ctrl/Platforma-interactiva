// Banda roșie „Dispecerate de Urgență & Avarii Non-Stop” din Apelul rapid (24.11.2026): în afară de 112 (fix),
// butoanele vin din contactele marcate „Urgență” în Admin. Înainte: trei numere fixe în cod, din prototip, neverificate.
// Modul pur (fără import de tipuri din `shared`), ca să poată fi importat și de testele serverului.

export interface EmergencyBarContact {
  name: string;
  phone: string;
  formattedPhone: string;
  isEmergency?: boolean;
  isActive?: boolean;
  order?: number;
}

/** Câte butoane din Admin intră în bandă, lângă 112. */
export const EMERGENCY_BAR_MAX = 3;

/** Numai cifrele (și „+” la început): pentru comparația cu 112 și pentru legătura `tel:`. */
export function telDigits(phone: string): string {
  const t = phone.trim();
  return (t.startsWith('+') ? '+' : '') + t.replace(/\D/g, '');
}

/**
 * Contactele pentru bandă: marcate „Urgență”, active, cu număr, altele decât 112 (care e fix),
 * în ordinea din Admin, fără numere repetate, cel mult `max`.
 */
export function selectEmergencyBarContacts<T extends EmergencyBarContact>(contacts: readonly T[], max = EMERGENCY_BAR_MAX): T[] {
  const seen = new Set<string>(['112']);
  const out: T[] = [];
  const sorted = contacts
    .filter((c) => c.isEmergency && c.isActive !== false)
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  for (const c of sorted) {
    const digits = telDigits(c.phone);
    if (digits === '' || digits === '+' || seen.has(digits)) continue;
    seen.add(digits);
    out.push(c);
    if (out.length >= max) break;
  }
  return out;
}
