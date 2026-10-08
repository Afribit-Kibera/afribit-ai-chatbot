#!/usr/bin/env bash
# Afribit Local: connect this box to Afribit's GPU server over WireGuard (docs/features/F-006). As root.
#
#   ./wireguard.sh key
#       Makes this box's key pair (the private key never leaves this machine) and prints the PUBLIC key.
#       Send that to Afribit.
#   ./wireguard.sh connect <server-public-key> <server-host:port> <this-box-address>
#       With the values from Afribit's reply. Only traffic to the GPU server (10.77.0.1) uses the tunnel.
#   ./wireguard.sh status
set -euo pipefail
WG_IF="${WG_IF:-afribit}"
DIR=/etc/wireguard
KEY="$DIR/$WG_IF.key"
CONF="$DIR/$WG_IF.conf"
GPU=10.77.0.1
need() { command -v "$1" >/dev/null || { echo "Install $2 first (apt install $2)." >&2; exit 1; }; }

case "${1:-}" in
  key)
    need wg wireguard
    [ "$(id -u)" = 0 ] || { echo "Run as root." >&2; exit 1; }
    umask 077
    mkdir -p "$DIR"
    [ -f "$KEY" ] || wg genkey > "$KEY"
    echo "Send this PUBLIC key to Afribit (it is safe to share):"
    wg pubkey < "$KEY"
    ;;
  connect)
    need wg wireguard
    [ "$(id -u)" = 0 ] || { echo "Run as root." >&2; exit 1; }
    SERVER_PUB="${2:-}"; ENDPOINT="${3:-}"; ADDRESS="${4:-}"
    [[ "$SERVER_PUB" =~ ^[A-Za-z0-9+/]{42}[AEIMQUYcgkosw048]=$ ]] || { echo "Usage: $0 connect <server-public-key> <host:port> <box-address>" >&2; exit 1; }
    [[ "$ENDPOINT" =~ ^[A-Za-z0-9.-]+:[0-9]+$ ]] || { echo "The server address must look like host:51820." >&2; exit 1; }
    [[ "$ADDRESS" =~ ^10\.77\.0\.[0-9]{1,3}$ ]] || { echo "The box address must look like 10.77.0.N." >&2; exit 1; }
    [ -f "$KEY" ] || { echo "Run '$0 key' first." >&2; exit 1; }
    umask 077
    cat > "$CONF" <<EOF
[Interface]
# This box's end of the tunnel to Afribit's GPU server (docs/features/F-006).
Address = $ADDRESS/32
PrivateKey = $(cat "$KEY")

[Peer]
PublicKey = $SERVER_PUB
Endpoint = $ENDPOINT
# Only the GPU server goes through the tunnel; everything else uses the normal connection.
AllowedIPs = $GPU/32
# Keeps the tunnel open behind mobile and home routers, which forget quiet connections.
PersistentKeepalive = 25
EOF
    if command -v systemctl >/dev/null && [ -d /run/systemd/system ]; then
      systemctl enable "wg-quick@$WG_IF" >/dev/null
      systemctl restart "wg-quick@$WG_IF"
    else
      wg-quick down "$WG_IF" 2>/dev/null || true
      wg-quick up "$WG_IF"
    fi
    "$0" status
    ;;
  status)
    wg show "$WG_IF" 2>/dev/null | sed -n '1,12p' || echo "The tunnel is not up."
    if command -v curl >/dev/null; then
      echo -n "GPU server health: "
      curl -s -m 8 "http://$GPU:11434/healthz" || echo "no answer (check the tunnel, or ask Afribit)"
      echo
    fi
    ;;
  *)
    sed -n '2,11p' "$0"
    exit 1
    ;;
esac
