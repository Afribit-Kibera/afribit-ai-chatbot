#!/usr/bin/env bash
# Revoke a community: its gate key stops working at once and its WireGuard peer is removed.
#   ./remove-community.sh <community-id>        (on the GPU server, as root, from this folder)
set -euo pipefail
cd "$(dirname "$0")"
ID="${1:?Usage: $0 <community-id>}"
WG_IF="${WG_IF:-wg0}"
CONF="/etc/wireguard/$WG_IF.conf"
KEYS_TOOL="${KEYS_TOOL:-docker compose run --rm --no-deps -v $PWD/keys:/keys-rw -e GATE_KEYS_FILE=/keys-rw/keys.json gate node keys.mjs}"
RELOAD_GATE="${RELOAD_GATE:-docker compose kill -s HUP gate}"

$KEYS_TOOL revoke "$ID" >/dev/null
$RELOAD_GATE >/dev/null

# The peer block written by add-community.sh starts with "[Peer]" then "# community: <id> (…)".
PUB="$(awk -v id="$ID" '/^\[Peer\]/{p=1;next} p&&$0 ~ "^# community: "id" "{f=1;next} f&&/^PublicKey/{print $3; exit} /^\[/{p=0;f=0}' "$CONF")"
if [ -n "$PUB" ]; then
  wg set "$WG_IF" peer "$PUB" remove
  umask 077
  awk -v pub="$PUB" 'BEGIN{RS="";ORS="\n\n"} !index($0, "PublicKey = " pub)' "$CONF" > "$CONF.new" && mv "$CONF.new" "$CONF"
  echo "Revoked \"$ID\": gate key disabled, WireGuard peer removed."
else
  echo "Revoked \"$ID\"'s gate key. No WireGuard peer found for it in $CONF." >&2
fi
