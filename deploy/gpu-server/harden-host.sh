#!/usr/bin/env bash
# Make the GPU server unable to keep what passes through it (docs/features/F-006, "The host keeps nothing").
# As root, once; safe to re-run. Then run check-host.sh. Full-disk encryption cannot be added here: it is
# chosen when the operating system is installed (see README.md).
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "Run as root." >&2; exit 1; }
say() { echo "==> $*"; }

say "Swap off (memory holding questions must never be paged to disk)"
swapoff -a
sed -i.bak -E 's@^([^#].*[[:space:]]swap[[:space:]].*)$@# afribit: swap off (F-006)  \1@' /etc/fstab

say "Core dumps off (a crash must not write memory to disk)"
cat > /etc/sysctl.d/90-afribit-gpu.conf <<'EOF'
# Afribit GPU server (docs/features/F-006)
kernel.core_pattern=|/bin/false
fs.suid_dumpable=0
EOF
sysctl -q --system
mkdir -p /etc/systemd/coredump.conf.d
printf '[Coredump]\nStorage=none\nProcessSizeMax=0\n' > /etc/systemd/coredump.conf.d/90-afribit.conf
mkdir -p /etc/security/limits.d
printf '* hard core 0\n* soft core 0\n' > /etc/security/limits.d/90-afribit-nocore.conf

say "/tmp in memory"
if ! findmnt -n -o FSTYPE /tmp | grep -q tmpfs; then
  if [ -f /usr/share/systemd/tmp.mount ] && [ ! -f /etc/systemd/system/tmp.mount ]; then cp /usr/share/systemd/tmp.mount /etc/systemd/system/; fi
  systemctl daemon-reload
  systemctl enable --now tmp.mount || echo "    could not mount /tmp as tmpfs; do it by hand" >&2
fi

say "The system journal capped (it holds service messages, never questions; the cap keeps it from growing)"
mkdir -p /etc/systemd/journald.conf.d
printf '[Journal]\nSystemMaxUse=200M\nMaxRetentionSec=14day\n' > /etc/systemd/journald.conf.d/90-afribit.conf
systemctl restart systemd-journald

say "Docker logs capped (the gate and Ollama write one short line per request, no text)"
mkdir -p /etc/docker
if [ ! -f /etc/docker/daemon.json ]; then
  printf '{\n  "log-driver": "json-file",\n  "log-opts": { "max-size": "10m", "max-file": "3" }\n}\n' > /etc/docker/daemon.json
  systemctl restart docker || true
fi

say "Operator logins are logged by sshd to the journal (auth). Keep SSH key-only:"
grep -Eq '^\s*PasswordAuthentication\s+no' /etc/ssh/sshd_config /etc/ssh/sshd_config.d/*.conf 2>/dev/null \
  && echo "    password logins already off" \
  || echo "    WARNING: set 'PasswordAuthentication no' in /etc/ssh/sshd_config.d/ and restart ssh" >&2

say "Done. Now run ./check-host.sh"
