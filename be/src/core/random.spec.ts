import { describe, expect, it } from 'vitest';
import { generateKey, mulberry32, randomSeed } from './random';

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('produces different sequences for different seeds', () => {
    expect(mulberry32(1)()).not.toEqual(mulberry32(2)());
  });
});

describe('generateKey', () => {
  it('is URL-safe and unique', () => {
    const k1 = generateKey();
    const k2 = generateKey();
    expect(k1).not.toEqual(k2);
    expect(k1).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(k1.length).toBeGreaterThan(10);
  });
});

describe('randomSeed', () => {
  it('returns a non-negative integer', () => {
    const seed = randomSeed();
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
  });
});
