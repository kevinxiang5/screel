/** Lightweight local PIN hash — device-only lock, not cryptographic auth. */

const SALT = 'screel-bank-pin-v1';

export async function hashBankPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`${SALT}:${pin}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function pinsMatch(pin: string, hash: string | null): Promise<boolean> {
  if (!hash) return false;
  const next = await hashBankPin(pin);
  return next === hash;
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}
