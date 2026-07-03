import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// React Testing Library unmounts + clears the DOM between tests.
afterEach(() => {
  cleanup();
});
