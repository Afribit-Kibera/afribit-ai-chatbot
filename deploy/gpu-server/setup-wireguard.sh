#!/usr/bin/env bash
# Once, on the GPU server, as root: the server end of the community tunnels (10.77.0.1) and the firewall.
# Boxes are added later with add-community.sh. Safe to re-run. docs/features/F-006-afribit-gpu-server.md
set -euo pipefail
WG_IF="${WG_IF:-wg0}"
WG_PORT="${WG_PORT:-51820}"
CONF="/etc/wireguard/$WG_IF.conf"
command -v wg >/dev/null || { echo "Install WireGuard first: apt install wireguard" >&2; exit 1; }
[ "$(id -u)" = 0 ] || { echo "Run as root." >&2; exit 1; }

umask 077
mkdir -p /etc/wireguard
if [ ! -f "$CONF" ]; then
  PRIV="$(wg genkey)"
  cat > "$CONF" <<EOF
[Interface]
# Afribit GPU server: the server end of the community tunnels (docs/features/F-006).
# Each box is a [Peer] below, added by add-community.sh, with its own /32 address.
Address = 10.77.0.1/24
ListenPort = $WG_PORT
PrivateKey = $PRIV
# Boxes may reach this server's gate, never each other or anything behind it.
PostUp = iptables -I FORWARD -i %i -j DROP; iptables -I DOCKER-USER -i %i -j DROP 2>/dev/null || true
PostDown = iptables -D FORWARD -i %i -j DROP; iptables -D DOCKER-USER -i %i -j DROP 2>/dev/null || true
EOF
  echo "Created $CONF"
else
  echo "$CONF already exists; keeping it."
fi

if command -v systemctl >/dev/null && [ -d /run/systemd/system ]; then
  systemctl enable --now "wg-quick@$WG_IF"
else
  ip link show "$WG_IF" >/dev/null 2>&1 || wg-quick up "$WG_IF"
fi

# Firewall: the only public ports are WireGuard and SSH. The gate is reachable only through the tunnel.
# (Docker-published ports bypass ufw; that is why Ollama is published on 127.0.0.1 only.)
if command -v ufw >/dev/null && [ "${SKIP_FIREWALL:-0}" != 1 ]; then
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow "${SSH_PORT:-22}/tcp"
  ufw allow "$WG_PORT/udp"
  ufw allow in on "$WG_IF" to 10.77.0.1 port 11434 proto tcp
  ufw --force enable
fi

echo "Server public key (boxes need it): $(wg show "$WG_IF" public-key)"
