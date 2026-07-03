import { randomBytes } from 'node:crypto';

/** URL-safe, unguessable capability token used as a dashboard key (~22 chars). */
export function generateKey(): string {
  return randomBytes(16).toString('base64url');
}

/** A fresh 32-bit seed for a chart widget's deterministic data. */
export function randomSeed(): number {
  return randomBytes(4).readUInt32LE(0);
}

/**
 * mulberry32 — a tiny deterministic PRNG. The same `seed` always yields the same
 * sequence, so a chart's data is identical across reloads (the gist requires data
 * to be "restored after page refresh"). Returns floats in [0, 1).
 * Reference: https://stackoverflow.com/a/47593316
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
