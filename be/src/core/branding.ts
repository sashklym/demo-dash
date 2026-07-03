/** Bar-chart mark used as the favicon across the frontend and backend. */
export const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="#2563eb"/>
  <rect x="7" y="15" width="4.5" height="10" rx="1.5" fill="#fff"/>
  <rect x="13.75" y="10" width="4.5" height="15" rx="1.5" fill="#fff"/>
  <rect x="20.5" y="13" width="4.5" height="12" rx="1.5" fill="#fff"/>
</svg>`;

/** Minimal landing page served at the API root so the base URL isn't a 404. */
export const LANDING_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>YouScan Dashboard API</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<style>
  body{font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;color:#0f172a;display:grid;place-items:center;min-height:100vh;margin:0}
  .card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:2rem 2.5rem;box-shadow:0 1px 3px rgba(0,0,0,.06);max-width:26rem}
  .logo{width:40px;height:40px;margin-bottom:.75rem}
  h1{margin:0 0 .25rem;font-size:1.2rem}
  p{margin:.35rem 0;color:#475569}
  a{color:#2563eb;text-decoration:none;font-weight:500}
  a:hover{text-decoration:underline}
</style>
</head>
<body>
  <div class="card">
    <img class="logo" src="/favicon.svg" alt="">
    <h1>YouScan Dashboard API</h1>
    <p>Backend for the widget dashboard.</p>
    <p>Interactive docs: <a href="/docs">/docs</a> &middot; Health: <a href="/health">/health</a></p>
  </div>
</body>
</html>`;
