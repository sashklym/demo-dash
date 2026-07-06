import { describe, expect, it } from 'vitest';
import { generateKeyBetween, generateNKeysBetween } from './fractional-index';

describe('generateKeyBetween', () => {
  it('produces a stable first key and short appends', () => {
    const first = generateKeyBetween(null, null);
    expect(first).toBe('a0');
    expect(generateKeyBetween(first, null)).toBe('a1');
    expect(generateKeyBetween('a1', null)).toBe('a2');
  });

  it('keeps append keys short over many appends (integer-header scheme)', () => {
    let key: string | null = null;
    let prev = '';
    for (let i = 0; i < 1000; i++) {
      key = generateKeyBetween(key, null);
      expect(key > prev).toBe(true); // strictly increasing
      prev = key;
    }
    // 1000 sequential appends must not blow up key length the way a naive
    // midpoint-to-end scheme would (~length 200); the integer header keeps it tiny.
    expect((key as string).length).toBeLessThanOrEqual(5);
  });

  it('inserts strictly between two adjacent keys', () => {
    const a = generateKeyBetween(null, null);
    const b = generateKeyBetween(a, null);
    const mid = generateKeyBetween(a, b);
    expect(a < mid && mid < b).toBe(true);
  });

  it('prepends before the first key', () => {
    const first = generateKeyBetween(null, null);
    const before = generateKeyBetween(null, first);
    expect(before < first).toBe(true);
  });

  it('survives repeated insertion into the same gap', () => {
    let lo: string = generateKeyBetween(null, null);
    const hi = generateKeyBetween(lo, null);
    for (let i = 0; i < 200; i++) {
      const mid = generateKeyBetween(lo, hi);
      expect(lo < mid && mid < hi).toBe(true);
      lo = mid;
    }
  });

  it('rejects an inverted range', () => {
    const a = generateKeyBetween(null, null);
    const b = generateKeyBetween(a, null);
    expect(() => generateKeyBetween(b, a)).toThrow();
  });

  it('fuzz: random inserts always keep the sequence sorted', () => {
    // Deterministic PRNG so the test is reproducible.
    let s = 123456789;
    const rand = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    const keys = generateNKeysBetween(null, null, 5);
    for (let i = 0; i < 500; i++) {
      const at = Math.floor(rand() * (keys.length + 1));
      const before = at > 0 ? keys[at - 1]! : null;
      const after = at < keys.length ? keys[at]! : null;
      const k = generateKeyBetween(before, after);
      keys.splice(at, 0, k);
    }
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i - 1]! < keys[i]!).toBe(true);
    }
  });
});

describe('generateNKeysBetween', () => {
  it('returns the requested count, sorted and within bounds', () => {
    const keys = generateNKeysBetween(null, null, 10);
    expect(keys).toHaveLength(10);
    for (let i = 1; i < keys.length; i++) expect(keys[i - 1]! < keys[i]!).toBe(true);
  });

  it('returns an empty array for n = 0', () => {
    expect(generateNKeysBetween(null, null, 0)).toEqual([]);
  });

  it('packs n keys strictly between two existing neighbors', () => {
    const a = generateKeyBetween(null, null);
    const b = generateKeyBetween(a, null);
    const keys = generateNKeysBetween(a, b, 8);
    expect(keys).toHaveLength(8);
    expect(a < keys[0]!).toBe(true);
    expect(keys[keys.length - 1]! < b).toBe(true);
    for (let i = 1; i < keys.length; i++) expect(keys[i - 1]! < keys[i]!).toBe(true);
  });
});
