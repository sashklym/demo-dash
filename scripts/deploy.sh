#!/usr/bin/env bash
# Deploy the YouScan dashboard to Coolify from your local machine.
#
# Coolify runs on the private (Tailscale) network, so deploys are triggered from
# a machine that can reach it — not from public CI. Coolify itself pulls the
# public GitHub repo and builds the Dockerfiles.
#
# Requires (never commit these):
#   COOLIFY_URL    e.g. http://<coolify-host>:8000
#   COOLIFY_TOKEN  a Coolify API token with write/deploy permission
#
# Usage:
#   COOLIFY_URL=http://<coolify-host>:8000 COOLIFY_TOKEN=xxxx npm run deploy
set -euo pipefail

: "${COOLIFY_URL:?set COOLIFY_URL (e.g. http://<coolify-host>:8000)}"
: "${COOLIFY_TOKEN:?set COOLIFY_TOKEN (a write/deploy-scoped Coolify API token)}"

# Coolify application UUIDs (resource ids, not secrets).
BE_UUID="${BE_UUID:-u4hddmf963aq3ite6w352afh}"
FE_UUID="${FE_UUID:-fnig01dqj420vrgt7v1hw644}"

deploy() {
  local name="$1" uuid="$2"
  echo "→ Deploying ${name} (${uuid})…"
  curl --fail --silent --show-error -X POST \
    "${COOLIFY_URL}/api/v1/deploy?uuid=${uuid}&force=true" \
    -H "Authorization: Bearer ${COOLIFY_TOKEN}"
  echo
}

deploy backend "${BE_UUID}"
deploy frontend "${FE_UUID}"
echo "✓ Triggered. Watch build progress in the Coolify UI."
