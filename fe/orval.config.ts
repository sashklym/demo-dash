import { defineConfig } from 'orval';

/**
 * Generates a fully-typed API client + React Query hooks from the backend's
 * OpenAPI spec (exported by `be: npm run openapi:export`). The output in
 * src/lib/api/generated/ is committed and never hand-edited — regenerate with
 * `npm run api:generate` whenever the spec changes.
 */
export default defineConfig({
  youscan: {
    input: './src/lib/api/openapi.json',
    output: {
      mode: 'single',
      target: './src/lib/api/generated/api.ts',
      schemas: './src/lib/api/generated/model',
      client: 'react-query',
      httpClient: 'axios',
      clean: true,
      prettier: false,
      override: {
        mutator: { path: './src/lib/api/http.ts', name: 'apiClient' },
        query: { useQuery: true, useMutation: true },
      },
    },
  },
});
