#!/usr/bin/env bash
# vercel-deploy.sh — Deploy app/ to Vercel and set all environment variables
#
# Usage:
#   VERCEL_TOKEN=<token> ./scripts/vercel-deploy.sh
#   ./scripts/vercel-deploy.sh          # prompts for token if not set
#
# Get a token at: https://vercel.com/account/tokens
#
# Run from the repo root.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$REPO_ROOT/app"
ENV_FILE="$APP_DIR/.env.local"

log()  { echo "▶ $*"; }
ok()   { echo "✓ $*"; }
fail() { echo "✗ $*" >&2; exit 1; }

# ── Token ──────────────────────────────────────────────────────────────────────

if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  echo ""
  echo "Vercel personal access token が必要です。"
  echo "取得先: https://vercel.com/account/tokens"
  echo ""
  read -r -s -p "VERCEL_TOKEN: " VERCEL_TOKEN
  echo ""
fi
export VERCEL_TOKEN

# ── Link project (first run creates .vercel/project.json) ─────────────────────

cd "$APP_DIR"

if [[ ! -f ".vercel/project.json" ]]; then
  log "Linking project to Vercel…"
  vercel link --yes --token "$VERCEL_TOKEN" 2>&1 || \
    fail "vercel link failed. Run 'vercel link' manually first."
fi

# ── Read .env.local and push every non-comment, non-empty line ────────────────

log "Setting environment variables from $ENV_FILE…"

set_env() {
  local key="$1" val="$2" env_flag="${3:---production}"
  # Set for all environments
  for e in --production --preview --development; do
    vercel env rm "$key" "$e" --yes --token "$VERCEL_TOKEN" 2>/dev/null || true
    printf '%s' "$val" | vercel env add "$key" "$e" --token "$VERCEL_TOKEN" 2>/dev/null || \
      echo "  warning: could not set $key for $e"
  done
}

while IFS='=' read -r key rest; do
  # Skip comments and empty lines
  [[ "$key" =~ ^[[:space:]]*# ]] && continue
  [[ -z "${key// }" ]] && continue
  # Skip commented-out keys (# SPONSOR_PRIVATE_KEY=...)
  [[ "$key" =~ ^# ]] && continue

  # Strip inline comments from value
  val="${rest%%#*}"
  val="${val%"${val##*[![:space:]]}"}" # rtrim

  # Skip if value is empty
  [[ -z "$val" ]] && continue

  ok "  $key"
  printf '%s' "$val" | vercel env add "$key" production --token "$VERCEL_TOKEN" --force 2>/dev/null || \
    echo "  (already set or error — skipping $key)"
  printf '%s' "$val" | vercel env add "$key" preview --token "$VERCEL_TOKEN" --force 2>/dev/null || true
  printf '%s' "$val" | vercel env add "$key" development --token "$VERCEL_TOKEN" --force 2>/dev/null || true

done < <(grep -v '^[[:space:]]*$' "$ENV_FILE" | grep -v '^[[:space:]]*#')

# ── Build check ────────────────────────────────────────────────────────────────

log "Running local build check…"
pnpm build 2>&1 | tail -10

# ── Deploy ────────────────────────────────────────────────────────────────────

log "Deploying to Vercel (production)…"
DEPLOY_OUTPUT=$(vercel --prod --yes --token "$VERCEL_TOKEN" 2>&1)
echo "$DEPLOY_OUTPUT"

DEPLOY_URL=$(echo "$DEPLOY_OUTPUT" | grep -oP 'https://[a-z0-9\-]+\.vercel\.app' | tail -1)

if [[ -z "$DEPLOY_URL" ]]; then
  # Try alternate format
  DEPLOY_URL=$(echo "$DEPLOY_OUTPUT" | grep "Production:" | grep -oP 'https://\S+' | head -1)
fi

[[ -n "$DEPLOY_URL" ]] || { log "Warning: could not parse deploy URL from output."; DEPLOY_URL="(see output above)"; }
ok "Deploy URL: $DEPLOY_URL"

# ── Print next steps ───────────────────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Vercel デプロイ完了"
echo "  URL: $DEPLOY_URL"
echo "═══════════════════════════════════════════════════"
echo ""
echo "  残りの手動作業:"
echo ""
echo "  1. Google OAuth redirect URI を追加:"
echo "     https://console.cloud.google.com/apis/credentials"
echo "     Authorized redirect URIs → ${DEPLOY_URL}/auth/callback を追加"
echo ""
echo "  2. .env.local に未設定の値を追加してから再実行:"
echo "     ANTHROPIC_API_KEY=sk-ant-..."
echo "     SPONSOR_PRIVATE_KEY=suiprivkey1..."
echo "     NEXT_PUBLIC_GOOGLE_CLIENT_ID=..."
echo ""
echo "  3. 設定後に再デプロイ:"
echo "     VERCEL_TOKEN=\$TOKEN ./scripts/vercel-deploy.sh"
echo ""
