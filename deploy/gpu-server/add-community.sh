#!/usr/bin/env bash
# Add a community's box: a WireGuard peer and a gate key. On the GPU server, as root, from this folder.
#   ./add-community.sh <community-id> <box-wireguard-public-key> [requests-per-minute] [concurrent]
# The box makes its key pair with deploy/community-node/wireguard.sh key and sends you the PUBLIC key.
# This prints, once, what the box's steward needs. docs/features/F-006-afribit-gpu-server.md
set -euo pipefail
cd "$(dirname "$0")"
ID="${1:-}"; BOX_PUB="${2:-}"; RPM="${3:-30}"; CONC="${4:-4}"
WG_IF="${WG_IF:-wg0}"
CONF="/etc/wireguard/$WG_IF.conf"
[ -f .env ] && set -a && . ./.env && set +a
[[ "$ID" =~ ^[a-z0-9][a-z0-9-]{0,40}$ ]] || { echo "Usage: $0 <community-id> <box-public-key> [per-minute] [concurrent]  (id: lowercase letters, digits, -)" >&2; exit 1; }
[[ "$BOX_PUB" =~ ^[A-Za-z0-9+/]{42}[AEIMQUYcgkosw048]=$ ]] || { echo "That is not a WireGuard public key." >&2; exit 1; }
grep -q "PublicKey = $BOX_PUB" "$CONF" && { echo "That box key is already a peer." >&2; exit 1; }
: "${GPU_ENDPOINT:?set GPU_ENDPOINT=<public name or IP>:51820 in .env}"

# The key tool runs in the gate's image; the keys folder is mounted writable only for this.
KEYS_TOOL="${KEYS_TOOL:-docker compose run --rm --no-deps -v $PWD/keys:/keys-rw -e GATE_KEYS_FILE=/keys-rw/keys.json gate node keys.mjs}"
RELOAD_GATE="${RELOAD_GATE:-docker compose kill -s HUP gate}"

OUT="$($KEYS_TOOL add "$ID" --peer auto --per-minute "$RPM" --concurrent "$CONC")"
PEER="$(sed -n 's/^PEER=//p' <<<"$OUT")"
KEY="$(sed -n 's/^KEY=//p' <<<"$OUT")"
[ -n "$PEER" ] && [ -n "$KEY" ] || { echo "The key tool failed: $OUT" >&2; exit 1; }

umask 077
cat >> "$CONF" <<EOF

[Peer]
# community: $ID (added $(date -u +%F))
PublicKey = $BOX_PUB
AllowedIPs = $PEER/32
EOF
wg set "$WG_IF" peer "$BOX_PUB" allowed-ips "$PEER/32"   # live, no restart
$RELOAD_GATE >/dev/null

SERVER_PUB="$(wg show "$WG_IF" public-key)"
cat <<EOF

Added "$ID": tunnel address $PEER, $RPM requests a minute, $CONC at once.
Send the steward the following PRIVATELY (it is shown once; only the key's hash is kept here).

  1. On the box, as root, from deploy/community-node:
       ./wireguard.sh connect $SERVER_PUB $GPU_ENDPOINT $PEER

  2. In the box's .env:
       LOCAL_LLM_BASE_URL=http://10.77.0.1:11434
       LOCAL_LLM_API_KEY=$KEY
       MODEL_LOCATION=afribit
     then: docker compose up -d api
EOF
