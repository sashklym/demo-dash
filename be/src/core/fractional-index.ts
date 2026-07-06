/**
 * Fractional indexing — string order keys you can insert *between* without
 * renumbering neighbors. Keys sort lexicographically (plain `ORDER BY rank`), so
 * moving a widget is a single-row write: compute a key strictly between its new
 * neighbors and save only that row. No integer positions to shift, and no float
 * precision ceiling.
 *
 * Ported from the `fractional-indexing` algorithm (David Greenspan / rocicorp,
 * MIT). The first character of a key encodes the length of its integer part,
 * which keeps append-heavy workloads (create-at-end) short — appends increment
 * an integer rather than growing the fractional tail.
 */

const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const ZERO = '0';
const LARGEST = DIGITS.charAt(DIGITS.length - 1);
const SMALLEST_INTEGER = `A${ZERO.repeat(26)}`;

/** A string strictly between `a` and `b` in the fractional (post-integer) space. */
function midpoint(a: string, b: string | null): string {
  if (b !== null && a >= b) throw new Error(`${a} >= ${b}`);
  if (a.endsWith(ZERO) || (b !== null && b.endsWith(ZERO))) {
    throw new Error('trailing zero');
  }
  if (b !== null) {
    // Keep the common prefix, recurse on the diverging remainder.
    let n = 0;
    while ((a.charAt(n) || ZERO) === b.charAt(n)) n++;
    if (n > 0) return b.slice(0, n) + midpoint(a.slice(n), b.slice(n));
  }
  const digitA = a ? DIGITS.indexOf(a.charAt(0)) : 0;
  const digitB = b !== null ? DIGITS.indexOf(b.charAt(0)) : DIGITS.length;
  if (digitB - digitA > 1) {
    const midDigit = Math.round(0.5 * (digitA + digitB));
    return DIGITS.charAt(midDigit);
  }
  if (b !== null && b.length > 1) {
    return b.slice(0, 1);
  }
  // First digits are consecutive: borrow from `a`'s tail.
  return DIGITS.charAt(digitA) + midpoint(a.slice(1), null);
}

function getIntegerLength(head: string): number {
  if (head >= 'a' && head <= 'z') return head.charCodeAt(0) - 'a'.charCodeAt(0) + 2;
  if (head >= 'A' && head <= 'Z') return 'Z'.charCodeAt(0) - head.charCodeAt(0) + 2;
  throw new Error(`invalid order key head: ${head}`);
}

function getIntegerPart(key: string): string {
  const length = getIntegerLength(key.charAt(0));
  if (length > key.length) throw new Error(`invalid order key: ${key}`);
  return key.slice(0, length);
}

function validateInteger(int: string): void {
  if (int.length !== getIntegerLength(int.charAt(0))) throw new Error(`invalid integer part: ${int}`);
}

function validateOrderKey(key: string): void {
  if (key === SMALLEST_INTEGER) throw new Error(`invalid order key: ${key}`);
  const i = getIntegerPart(key);
  const f = key.slice(i.length);
  if (f.endsWith(ZERO)) throw new Error(`invalid order key: ${key}`);
}

function incrementInteger(x: string): string | null {
  validateInteger(x);
  const head = x.charAt(0);
  const digs = x.slice(1).split('');
  let carry = true;
  for (let i = digs.length - 1; carry && i >= 0; i--) {
    const d = DIGITS.indexOf(digs[i]!) + 1;
    if (d === DIGITS.length) {
      digs[i] = ZERO;
    } else {
      digs[i] = DIGITS.charAt(d);
      carry = false;
    }
  }
  if (carry) {
    if (head === 'Z') return `a${ZERO}`;
    if (head === 'z') return null;
    const h = String.fromCharCode(head.charCodeAt(0) + 1);
    if (h > 'a') digs.push(ZERO);
    else digs.pop();
    return h + digs.join('');
  }
  return head + digs.join('');
}

function decrementInteger(x: string): string | null {
  validateInteger(x);
  const head = x.charAt(0);
  const digs = x.slice(1).split('');
  let borrow = true;
  for (let i = digs.length - 1; borrow && i >= 0; i--) {
    const d = DIGITS.indexOf(digs[i]!) - 1;
    if (d === -1) {
      digs[i] = LARGEST;
    } else {
      digs[i] = DIGITS.charAt(d);
      borrow = false;
    }
  }
  if (borrow) {
    if (head === 'a') return `Z${LARGEST}`;
    if (head === 'A') return null;
    const h = String.fromCharCode(head.charCodeAt(0) - 1);
    if (h < 'Z') digs.push(LARGEST);
    else digs.pop();
    return h + digs.join('');
  }
  return head + digs.join('');
}

/**
 * A key that sorts strictly between `a` and `b`. Pass `null` for an open end:
 * `generateKeyBetween(null, null)` is the first key, `generateKeyBetween(last, null)`
 * appends after everything, `generateKeyBetween(null, first)` prepends before it.
 */
export function generateKeyBetween(a: string | null, b: string | null): string {
  if (a !== null) validateOrderKey(a);
  if (b !== null) validateOrderKey(b);
  if (a !== null && b !== null && a >= b) throw new Error(`${a} >= ${b}`);

  if (a === null) {
    if (b === null) return `a${ZERO}`;
    const ib = getIntegerPart(b);
    const fb = b.slice(ib.length);
    if (ib === SMALLEST_INTEGER) return ib + midpoint('', fb);
    if (ib < b) return ib;
    const res = decrementInteger(ib);
    if (res === null) throw new Error('cannot decrement any more');
    return res;
  }

  if (b === null) {
    const ia = getIntegerPart(a);
    const fa = a.slice(ia.length);
    const i = incrementInteger(ia);
    return i === null ? ia + midpoint(fa, null) : i;
  }

  const ia = getIntegerPart(a);
  const fa = a.slice(ia.length);
  const ib = getIntegerPart(b);
  const fb = b.slice(ib.length);
  if (ia === ib) return ia + midpoint(fa, fb);
  const i = incrementInteger(ia);
  if (i === null) throw new Error('cannot increment any more');
  if (i < b) return i;
  return ia + midpoint(fa, null);
}

/**
 * `n` evenly-distributed keys strictly between `a` and `b` (either may be `null`).
 * Used to (re)assign a whole ordered list at once — bulk backfill and the
 * small-grid full reorder. Splits the range recursively so keys stay short.
 */
export function generateNKeysBetween(a: string | null, b: string | null, n: number): string[] {
  if (n === 0) return [];
  if (n === 1) return [generateKeyBetween(a, b)];
  if (b === null) {
    let c = generateKeyBetween(a, b);
    const result = [c];
    for (let i = 0; i < n - 1; i++) {
      c = generateKeyBetween(c, b);
      result.push(c);
    }
    return result;
  }
  if (a === null) {
    let c = generateKeyBetween(a, b);
    const result = [c];
    for (let i = 0; i < n - 1; i++) {
      c = generateKeyBetween(a, c);
      result.push(c);
    }
    result.reverse();
    return result;
  }
  const mid = Math.floor(n / 2);
  const c = generateKeyBetween(a, b);
  return [...generateNKeysBetween(a, c, mid), c, ...generateNKeysBetween(c, b, n - mid - 1)];
}
