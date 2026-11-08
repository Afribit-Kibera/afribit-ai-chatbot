#!/usr/bin/env bash
# The GPU server's checklist (docs/features/F-006, acceptance tests 5, 6 and 8). As root, from this folder.
# Prints PASS / FAIL / SKIP per item and exits 1 if anything failed. Run after setup, after every change, and
# before a community is connected. Keep the output with the server's records.
#
#   ./check-host.sh                       host and gate checks
#   GATE_TEST_KEY=afb_… ./check-host.sh   also the canary test (a test community's key; never a real one's)
set -uo pipefail
cd "$(dirname "$0")"
WG_IF="${WG_IF:-wg0}"
SSH_PORT="${SSH_PORT:-22}"
GATE="http://10.77.0.1:11434"
fails=0
pass() { printf 'PASS  %s\n' "$*"; }
fail() { printf 'FAIL  %s\n' "$*"; fails=$((fails + 1)); }
skip() { printf 'SKIP  %s\n' "$*"; }

# 1. Nothing paged to disk
if [ -z "$(swapon --noheadings --show 2>/dev/null)" ]; then pass "no swap"
elif swapon --noheadings --show=NAME | while read -r d; do lsblk -n -o TYPE "$d" 2>/dev/null | grep -q crypt || exit 1; done; then pass "swap is encrypted"
else fail "swap is on and not encrypted (run harden-host.sh)"; fi

# 2. No core dumps
cp="$(sysctl -n kernel.core_pattern 2>/dev/null)"
if [ "$cp" = "|/bin/false" ] || grep -qs '^Storage=none' /etc/systemd/coredump.conf.d/*.conf; then pass "core dumps off ($cp)"
else fail "core dumps can be written (kernel.core_pattern=$cp)"; fi

# 3. /tmp in memory
[ "$(findmnt -n -o FSTYPE /tmp 2>/dev/null)" = tmpfs ] && pass "/tmp is in memory" || fail "/tmp is on disk"

# 4. Journal capped
grep -qs '^SystemMaxUse=' /etc/systemd/journald.conf /etc/systemd/journald.conf.d/*.conf && pass "journal size capped" || fail "journal size not capped"

# 5. Disk encryption
lsblk -n -o TYPE 2>/dev/null | grep -q crypt && pass "an encrypted volume is in use" || fail "no encrypted disk found (choose full-disk encryption at install)"

# 6. Only WireGuard and SSH are public; the gate is on the tunnel only; Ollama on the loopback only
bad="$(ss -H -lntu 2>/dev/null | awk '{print $1, $5}' | while read -r proto addr; do
  port="${addr##*:}"; host="${addr%:*}"; host="${host#[}"; host="${host%]}"
  case "$host" in 127.*|::1|10.77.0.1) continue ;; esac
  [ "$proto" = udp ] && [ "$port" = 51820 ] && continue
  [ "$proto" = tcp ] && [ "$port" = "$SSH_PORT" ] && continue
  [ "$proto" = udp ] && { [ "$port" = 68 ] || [ "$port" = 546 ] || [ "$port" = 323 ]; } && continue   # DHCP, chrony (outgoing helpers)
  case "$host" in 127.0.0.53*|127.0.0.54) continue ;; esac
  echo "$proto $addr"
done)"
[ -z "$bad" ] && pass "only WireGuard ($WG_IF udp 51820) and SSH ($SSH_PORT) listen publicly" || fail "unexpected public listeners: $(echo $bad)"
ss -H -lnt 2>/dev/null | awk '{print $4}' | grep -q '^10\.77\.0\.1:11434$' && pass "gate listens on the tunnel address only" || fail "gate not listening on 10.77.0.1:11434"
ss -H -lnt 2>/dev/null | awk '{print $4}' | grep -Eq '^(0\.0\.0\.0|\*|\[::\]):11435$' && fail "Ollama is reachable beyond the loopback" || pass "Ollama is on the loopback only"

# 7. Boxes cannot reach each other or anything behind the server
iptables -S FORWARD 2>/dev/null | grep -q -- "-i $WG_IF -j DROP" && pass "forwarding from the tunnel is dropped" || fail "traffic from the tunnel can be forwarded"

# 8. Ollama's debug logging (which would log prompts) is off
dbg="$(docker compose exec -T ollama printenv OLLAMA_DEBUG 2>/dev/null | tr -d '\r')"
case "$dbg" in ""|0|false) pass "Ollama debug logging off" ;; *) fail "OLLAMA_DEBUG=$dbg" ;; esac

# 9. The model is really on the GPU (a silent CPU fallback was seen on a rented GPU, 8 Oct 2026)
health="$(curl -s -m 10 -w ' HTTP%{http_code}' "$GATE/healthz")"
case "$health" in
  *'"models":[]'*HTTP200) skip "no model loaded yet, so GPU placement cannot be checked (ask one question, then re-run)" ;;
  *HTTP200) pass "gate health: every loaded model is fully on the GPU" ;;
  *) fail "gate health: $health" ;;
esac

# 10. Canary: a question passes through, then must appear in no log or file on this server
if [ -n "${GATE_TEST_KEY:-}" ]; then
  canary="CANARY-$(head -c 8 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  since="$(date -u '+%Y-%m-%d %H:%M:%S')"
  model="$(curl -s -m 10 -H "Authorization: Bearer $GATE_TEST_KEY" "$GATE/api/tags" | sed -n 's/.*"name":"\([^"]*\)".*/\1/p' | head -1)"
  code="$(curl -s -o /dev/null -w '%{http_code}' -m 300 -H "Authorization: Bearer $GATE_TEST_KEY" "$GATE/api/chat" \
    -d "{\"model\":\"$model\",\"stream\":false,\"messages\":[{\"role\":\"user\",\"content\":\"Reply with one word. $canary\"}],\"options\":{\"num_predict\":3}}")"
  if [ "$code" != 200 ]; then fail "canary request did not go through (HTTP $code)"
  else
    sleep 2
    hits=0
    docker compose logs --no-color gate ollama 2>/dev/null | grep -q "$canary" && hits=$((hits + 1))
    journalctl --since "$since" 2>/dev/null | grep -q "$canary" && hits=$((hits + 1))
    grep -rqs "$canary" usage /var/log /tmp 2>/dev/null && hits=$((hits + 1))
    [ "$hits" = 0 ] && pass "canary question found in no log or file (gate, Ollama, journal, usage, /var/log, /tmp)" || fail "canary text found in $hits place(s)"
  fi
else
  skip "canary test (set GATE_TEST_KEY to a test community's key)"
fi

echo "versions: ollama $(docker compose exec -T ollama ollama --version 2>/dev/null | tr -d '\r' | tail -1); node $(docker compose run --rm --no-deps gate node --version 2>/dev/null | tr -d '\r'); kernel $(uname -r); checked $(date -u '+%F %T') UTC"
[ "$fails" = 0 ] && echo "All checks passed." || { echo "$fails check(s) FAILED."; exit 1; }
