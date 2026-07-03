const STORAGE_KEY = 'youscan.dashboardKey';

/**
 * The active dashboard key is remembered in localStorage so a return visit to "/"
 * reopens the same dashboard. It is only stored once the key is confirmed valid.
 */
export function getStoredKey(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredKey(key: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, key);
  } catch {
    /* private mode / storage disabled — non-fatal */
  }
}

export function clearStoredKey(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* non-fatal */
  }
}
