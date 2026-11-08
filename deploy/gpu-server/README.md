# Afribit GPU server

The model server for **Afribit Local** communities ([ADR 0016](../../docs/adr/0016-afribit-local-community-box.md),
[F-006](../../docs/features/F-006-afribit-gpu-server.md)). Each community's box keeps its data. This server
answers questions over an encrypted tunnel, and keeps nothing.

```
community box ──WireGuard (udp 51820)──▶ gate 10.77.0.1:11434 ──▶ Ollama 127.0.0.1:11435 (GPU)
  (data, search, backups)                 key, limits, counts      no debug logs; only model files on disk
```

| File | What it does |
|---|---|
| `docker-compose.yml` | Ollama on the GPU, and the gate in front of it |
| `gate/gate.mjs` | The gate: one file of plain JavaScript; its contract is in F-006 |
| `gate/keys.mjs` | Adds, revokes and lists communities; keys are shown once and stored as hashes |
| `setup-wireguard.sh` | Once: the tunnel's server end (10.77.0.1) and the firewall |
| `add-community.sh` / `remove-community.sh` | Connect or cut off one community's box |
| `harden-host.sh` | Makes the host unable to keep anything: no swap, no core dumps, `/tmp` in memory, capped logs |
| `check-host.sh` | The checklist: run after setup, after every change, and before connecting a community |

**Rule: no learner's question goes to a GPU outside Kenya.** Rented GPUs abroad are for tests with test
questions only.

## Hardware and system

- One NVIDIA GPU with 24 GB (RTX 3090/4090 class; [E-001](../../docs/features/E-001-gemma4-and-gpu.md)). 64 GB
  RAM, 200 GB SSD, a UPS.
- Ubuntu Server 24.04, **installed with full-disk encryption** (LUKS; choose it in the installer, it cannot be
  added later), SSH key-only.
- NVIDIA driver, Docker, the NVIDIA container toolkit, WireGuard:
  `apt install wireguard nvidia-driver-570 docker.io docker-compose-v2` and the
  [NVIDIA container toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html).
- Ollama's image needs a recent driver. On 8 Oct 2026, rented hosts with CUDA 12.x drivers ran the current
  `ollama/ollama` image on the CPU without any error (four times); hosts with CUDA 13 drivers ran it on the GPU.
  Install a CUDA 13-capable driver, pin `OLLAMA_VERSION`, and let `check-host.sh` confirm the model is on the GPU.

## Setting it up

From a checkout of this repository, in `deploy/gpu-server/`, as root:

```bash
cp .env.example .env                  # set GPU_ENDPOINT, GATE_ALLOWED_MODELS; pin OLLAMA_VERSION
./harden-host.sh
./setup-wireguard.sh                  # prints the server's public key
mkdir -p keys usage && chown 1000:1000 keys usage && chmod 700 keys
docker compose run --rm --no-deps -v "$PWD/keys:/keys-rw" -e GATE_KEYS_FILE=/keys-rw/keys.json gate node keys.mjs operator
                                      # the operator key (for usage reports); store it in the password manager
docker compose up -d
docker compose exec ollama ollama pull gemma4:26b-a4b-it-q4_K_M
./check-host.sh
```

## Connecting a community

1. The steward runs, on the box: `sudo ./wireguard.sh key` (in `deploy/community-node/`), and sends you the
   **public** key it prints.
2. You run: `./add-community.sh <community-id> <their-public-key>`. You can also give the requests per minute
   and the number at once (defaults 30 and 4).
3. Send the steward what it prints, **privately**. That is the `wireguard.sh connect …` line and three `.env`
   lines. The key is shown once; only its hash is kept here.
4. The steward runs those, then `docker compose up -d api`. Their app now says the model runs on Afribit's
   server.
5. Make a test community with its own key, and run `GATE_TEST_KEY=… ./check-host.sh` to do the canary test.

To cut a community off: `./remove-community.sh <community-id>`. Its key stops working at once and its tunnel
peer is removed. If a key leaks, remove the community and add it again; the box keeps its WireGuard key pair.

## Running it

| Task | How |
|---|---|
| Is it healthy? | `curl http://10.77.0.1:11434/healthz`: `200` only when the model is fully on the GPU |
| Usage for billing | `curl -H "Authorization: Bearer <operator key>" http://10.77.0.1:11434/usage`, or the files in `usage/` (counts only) |
| Who is connected | `wg show` (last handshake per box); `docker compose run --rm --no-deps gate node keys.mjs list` |
| What happened | `docker compose logs gate`: one line per request, with community, path, status, time and tokens. Never text |
| Update | Pin the new versions in `.env`, `docker compose pull && docker compose up -d`, then `./check-host.sh` |

**If the server is down,** boxes answer from their reviewed cards, and search still works there. Nothing is
lost, because nothing is kept here.

**Access.** Only named Afribit operators have SSH access, with their own keys. Logins are recorded by the
system journal. Nobody reads a community's traffic: the gate does not log it and Ollama does not keep it.
`check-host.sh` proves both with a canary question.

## How this was tested

- The gate's contract: `node --test deploy/gpu-server/gate/gate.test.mjs` (in `pnpm test`).
- The scripts and the tunnel: rehearsed on throwaway Linux containers (one server, two boxes, an outsider).
- The whole path, box → gate → a GPU running Gemma 4, with a rented GPU standing in for this server and test
  questions only.

Results are in the Book's [test log](../../docs/book/test-and-evaluation-log.md) (8 Oct 2026). The first run
on the real Kenyan server repeats `check-host.sh` with the canary test, and measures speed from the pilot box.
