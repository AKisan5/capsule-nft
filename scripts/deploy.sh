#!/usr/bin/env bash
# deploy.sh — publish one_capsule to Sui devnet/testnet and update app/.env.local
#
# Usage:
#   ./scripts/deploy.sh              # deploy to devnet (default)
#   ./scripts/deploy.sh testnet      # deploy to testnet
#
# Prerequisites:
#   - sui CLI installed and authenticated
#   - Enough SUI in the active address (run: sui client faucet)
#   - Run from the repo root: suione/one-capsule/

set -euo pipefail

# ── Config ─────────────────────────────────────────────────────────────────────

NETWORK="${1:-devnet}"
CONTRACTS_DIR="$(cd "$(dirname "$0")/../contracts" && pwd)"
APP_DIR="$(cd "$(dirname "$0")/../app" && pwd)"
ENV_FILE="$APP_DIR/.env.local"
GAS_BUDGET=100000000

# ── Helpers ────────────────────────────────────────────────────────────────────

log()  { echo "▶ $*"; }
ok()   { echo "✓ $*"; }
fail() { echo "✗ $*" >&2; exit 1; }

# Extract a field from sui CLI JSON-ish output (grep-based, no jq dependency)
extract_package_id() {
  grep -o '"PackageID"[[:space:]]*:[[:space:]]*"0x[a-f0-9]*"' \
    | head -1 | grep -o '0x[a-f0-9]*'
}

extract_shared_id() {
  local module="$1"
  # Find ObjectType matching ::module:: then grab the ObjectID on the line before
  grep -B5 "ObjectType.*::${module}::" \
    | grep '"ObjectID"' | head -1 | grep -o '0x[a-f0-9]*'
}

upsert_env() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    # In-place replace (portable sed)
    sed -i.bak "s|^${key}=.*|${key}=${val}|" "$ENV_FILE" && rm -f "${ENV_FILE}.bak"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

# ── Step 0: switch network ─────────────────────────────────────────────────────

log "Switching Sui client to $NETWORK…"
sui client switch --env "$NETWORK" 2>&1 | grep -v warning || true

ACTIVE_ADDR=$(sui client active-address 2>/dev/null | grep -v warning || true)
log "Active address: $ACTIVE_ADDR"

# ── Step 1: ensure balance ─────────────────────────────────────────────────────

BALANCE=$(sui client balance 2>/dev/null | grep -v warning | grep "Sui" | grep -o '[0-9.]* SUI' | head -1 || echo "0 SUI")
log "Balance: $BALANCE"

if echo "$BALANCE" | grep -q "^0 SUI\|No coins"; then
  log "No balance found — requesting faucet…"
  sui client faucet 2>&1 | grep -v warning || true
  sleep 15
  BALANCE=$(sui client balance 2>/dev/null | grep -v warning | grep "Sui" | grep -o '[0-9.]* SUI' | head -1 || echo "0 SUI")
  log "Balance after faucet: $BALANCE"
fi

# ── Step 2: build ──────────────────────────────────────────────────────────────

log "Building contracts…"
cd "$CONTRACTS_DIR"
sui move build 2>&1 | grep -v warning

# ── Step 3: publish ────────────────────────────────────────────────────────────

log "Publishing package (gas-budget: $GAS_BUDGET MIST)…"
PUBLISH_OUTPUT=$(sui client publish \
  --gas-budget "$GAS_BUDGET" \
  2>&1)

echo "$PUBLISH_OUTPUT" | grep -v warning | grep -E "Status:|PackageID:|ObjectID:|error|Error" || true

STATUS=$(echo "$PUBLISH_OUTPUT" | grep "Status:" | head -1)
if ! echo "$STATUS" | grep -q "Success"; then
  echo "$PUBLISH_OUTPUT" | grep -v warning >&2
  fail "Publish failed. See output above."
fi

PACKAGE_ID=$(echo "$PUBLISH_OUTPUT" | grep -v warning \
  | grep -o 'PackageID:[[:space:]]*0x[a-f0-9]*' | head -1 \
  | grep -o '0x[a-f0-9]*')

[[ -n "$PACKAGE_ID" ]] || fail "Could not parse PackageID from publish output."
ok "Package published: $PACKAGE_ID"

# ── Step 4: create shared registries ──────────────────────────────────────────

log "Creating FeedbackRegistry…"
FB_OUTPUT=$(sui client call \
  --package "$PACKAGE_ID" \
  --module feedback \
  --function create_registry \
  --gas-budget 20000000 \
  2>&1)

FEEDBACK_REGISTRY_ID=$(echo "$FB_OUTPUT" | grep -v warning \
  | grep -B2 "FeedbackRegistry" \
  | grep -o '0x[a-f0-9]\{63,64\}' | head -1)

[[ -n "$FEEDBACK_REGISTRY_ID" ]] || fail "Could not parse FeedbackRegistry ID."
ok "FeedbackRegistry: $FEEDBACK_REGISTRY_ID"

log "Creating ProfileRegistry…"
PR_OUTPUT=$(sui client call \
  --package "$PACKAGE_ID" \
  --module profile_registry \
  --function create_registry \
  --gas-budget 20000000 \
  2>&1)

PROFILE_REGISTRY_ID=$(echo "$PR_OUTPUT" | grep -v warning \
  | grep -B2 "ProfileRegistry" \
  | grep -o '0x[a-f0-9]\{63,64\}' | head -1)

[[ -n "$PROFILE_REGISTRY_ID" ]] || fail "Could not parse ProfileRegistry ID."
ok "ProfileRegistry: $PROFILE_REGISTRY_ID"

# ── Step 5: write .env.local ───────────────────────────────────────────────────

log "Writing $ENV_FILE…"

# Create file if it doesn't exist yet
touch "$ENV_FILE"

upsert_env "NEXT_PUBLIC_SUI_NETWORK"           "$NETWORK"
upsert_env "NEXT_PUBLIC_CAPSULE_PACKAGE_ID"    "$PACKAGE_ID"
upsert_env "NEXT_PUBLIC_FEEDBACK_REGISTRY_ID"  "$FEEDBACK_REGISTRY_ID"
upsert_env "NEXT_PUBLIC_PROFILE_REGISTRY_ID"   "$PROFILE_REGISTRY_ID"

ok ".env.local updated."

# ── Step 6: verify package ────────────────────────────────────────────────────

log "Verifying package on-chain…"
sui client object "$PACKAGE_ID" 2>&1 \
  | grep -v warning \
  | grep -E "objectId|objType|Immutable" \
  | head -5

# ── Step 7: test mint ─────────────────────────────────────────────────────────

log "Running test mint…"
CLOCK="0x0000000000000000000000000000000000000000000000000000000000000006"
MINT_OUTPUT=$(sui client call \
  --package "$PACKAGE_ID" \
  --module capsule \
  --function mint \
  --args \
    "deploy-test-blob" \
    "試合の展開" \
    '["決定的な技"]' \
    "テストミント" \
    "positive" \
    "共感" \
    "デプロイ確認用" \
    "deploy.sh から自動テストミントしました" \
    "deploy-test" \
    "tester" \
    "$CLOCK" \
  --gas-budget 20000000 \
  2>&1)

CAPSULE_ID=$(echo "$MINT_OUTPUT" | grep -v warning \
  | grep -B2 "capsule::Capsule" \
  | grep -o '0x[a-f0-9]\{63,64\}' | head -1)

if [[ -n "$CAPSULE_ID" ]]; then
  ok "Test capsule minted: $CAPSULE_ID"
else
  echo "$MINT_OUTPUT" | grep -v warning | tail -10
  log "Warning: could not confirm test mint (non-fatal)."
fi

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Deploy complete — $NETWORK"
echo "═══════════════════════════════════════════════════"
echo "  PACKAGE          $PACKAGE_ID"
echo "  FeedbackRegistry $FEEDBACK_REGISTRY_ID"
echo "  ProfileRegistry  $PROFILE_REGISTRY_ID"
[[ -n "${CAPSULE_ID:-}" ]] && echo "  Test capsule     $CAPSULE_ID"
echo "═══════════════════════════════════════════════════"
echo ""
echo "  Next steps:"
echo "    cd app && pnpm dev"
echo "    # Fill in GOOGLE_CLIENT_ID, ANTHROPIC_API_KEY in .env.local"
echo ""
