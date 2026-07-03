import { beforeEach, describe, expect, it } from 'vitest';
import { clearStoredKey, getStoredKey, setStoredKey } from './dashboard-key';

describe('dashboard-key storage', () => {
  beforeEach(() => window.localStorage.clear());

  it('returns null when nothing is stored', () => {
    expect(getStoredKey()).toBeNull();
  });

  it('round-trips a key', () => {
    setStoredKey('abc123');
    expect(getStoredKey()).toBe('abc123');
  });

  it('clears a stored key', () => {
    setStoredKey('abc123');
    clearStoredKey();
    expect(getStoredKey()).toBeNull();
  });
});
