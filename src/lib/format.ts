export function rs(n: number | null | undefined) {
  if (n == null) return '-';
  return 'Rs ' + Math.round(n).toLocaleString('en-PK');
}

/** Compact Pakistani style: 1.5 lac, 42.5 lac, 1.2 crore */
export function rsShort(n: number) {
  if (n >= 10_000_000) return `Rs ${trim(n / 10_000_000)} crore`;
  if (n >= 100_000) return `Rs ${trim(n / 100_000)} lac`;
  return rs(n);
}
function trim(x: number) {
  return x.toFixed(x >= 10 ? 1 : 2).replace(/\.?0+$/, '');
}

export function ago(isoStr: string) {
  const s = Math.max(1, Math.round((Date.now() - new Date(isoStr).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d > 1 ? 's' : ''} ago`;
  const mo = Math.round(d / 30);
  return `${mo} month${mo > 1 ? 's' : ''} ago`;
}

export function timeLeft(isoStr: string) {
  const ms = new Date(isoStr).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h left`;
  if (h >= 1) return `${h}h ${m % 60}m left`;
  const s = Math.floor(ms / 1000) % 60;
  return `${m}m ${s}s left`;
}

export function memberSince(isoStr: string) {
  return new Date(isoStr).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

export function normalizePkPhone(input: string): string | null {
  const d = input.replace(/\D/g, '');
  let local = d;
  if (local.startsWith('0092')) local = local.slice(4);
  else if (local.startsWith('92')) local = local.slice(2);
  else if (local.startsWith('0')) local = local.slice(1);
  if (!/^3\d{9}$/.test(local)) return null;
  return '+92' + local;
}

export function prettyPhone(e164: string) {
  const m = e164.match(/^\+92(\d{3})(\d{7})$/);
  return m ? `+92 ${m[1]} ${m[2]}` : e164;
}
