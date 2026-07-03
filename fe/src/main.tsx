import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

createRoot(rootElement).render(
  <StrictMode>
    <main className="grid min-h-screen place-items-center p-8">
      <p className="text-muted-foreground">YouScan Dashboard — starting…</p>
    </main>
  </StrictMode>,
);
