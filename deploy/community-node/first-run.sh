#!/usr/bin/env bash
# One-time setup for a new community node. Safe to re-run.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "Create .env first: cp .env.example .env  (set POSTGRES_PASSWORD and JWT_SECRET)" >&2
  exit 1
fi
set -a; . ./.env; set +a
MODEL="${LOCAL_LLM_MODEL:-gemma3:12b}"
EMBED_MODEL="${LOCAL_EMBEDDING_MODEL:-bge-m3}"
LLM_URL="${LOCAL_LLM_BASE_URL:-http://ollama:11434}"
# An Afribit Local box (docs/features/F-006): the chat model runs on another server; this machine keeps the
# data and the search model only.
REMOTE_MODEL=0
[ "${LLM_URL%/}" != "http://ollama:11434" ] && REMOTE_MODEL=1

echo "==> Starting database and model server"
docker compose up -d postgres ollama

if [ "$REMOTE_MODEL" = 1 ]; then
  echo "==> The chat model runs at $LLM_URL (not downloaded here). Checking it answers:"
  if curl -fsS -m 20 ${LOCAL_LLM_API_KEY:+-H "Authorization: Bearer $LOCAL_LLM_API_KEY"} "${LLM_URL%/}/api/tags" | grep -q "\"${MODEL}\""; then
    echo "    ok: $MODEL is there."
  else
    echo "    WARNING: could not reach $LLM_URL or it does not have $MODEL. Members will get card-only answers until it does." >&2
  fi
  [ "${MODEL_LOCATION:-auto}" = "afribit" ] || [ "${MODEL_LOCATION:-auto}" = "community" ] || \
    echo "    NOTE: set MODEL_LOCATION=afribit (Afribit's GPU server) or community, so members are told where questions go." >&2
else
  echo "==> Downloading the model ($MODEL). This is several GB and only happens once."
  docker compose exec ollama ollama pull "$MODEL"
fi

echo "==> Downloading the search model ($EMBED_MODEL), about 1 GB."
docker compose exec ollama ollama pull "$EMBED_MODEL"

echo "==> Building and starting the app"
docker compose up -d --build api web

PACK="${COMMUNITY_PACK:-kibera-bitcoin}"
PACKS="${COMMUNITY_PACKS:-}"
if [ -n "$PACKS" ]; then
  # Several communities on this node: load the knowledge of every pack the node serves.
  echo "==> Database: migrate and load the knowledge for the packs: $PACKS"
  docker compose exec api node dist/db/migrate.js
  case ",$(echo "$PACKS" | tr -d ' ')," in
    *,kibera-bitcoin,*)
      # The Kibera pack also ships its reviewed language corpus and community manuals.
      docker compose exec api node dist/db/seed.js
      docker compose exec api node dist/db/seedCommunityManuals.js
      docker compose exec api node dist/db/promoteCommunityManuals.js
      ;;
  esac
  # With COMMUNITY_PACKS_DIR set in the container, this checks the packs together, then installs each.
  docker compose exec api node dist/pack/cli.js install --no-embed
else
  echo "==> Database: migrate and load the knowledge for the '$PACK' pack"
  docker compose exec api node dist/db/migrate.js
  if [ "$PACK" = "kibera-bitcoin" ]; then
    # The Kibera pack also ships its reviewed language corpus and community manuals.
    docker compose exec api node dist/db/seed.js
    docker compose exec api node dist/db/seedCommunityManuals.js
    docker compose exec api node dist/db/promoteCommunityManuals.js
  else
    docker compose exec api node dist/pack/cli.js install "/app/packs/$PACK" --no-embed
  fi
fi

echo "==> Indexing the knowledge for search (on this machine; nothing leaves it)"
docker compose exec api node dist/knowledge/embedBackfill.js

if [ "$REMOTE_MODEL" = 0 ]; then
  echo "==> Warming the model so the first question is not slow"
  docker compose exec ollama ollama run "$MODEL" "Habari" >/dev/null || true
fi

echo "Done. Open https://${NODE_HOSTNAME:-localhost}"
echo
echo "Accounts are by invitation (REGISTRATION=invite). To make the first administrator:"
echo "  1. docker compose exec api node dist/auth/inviteCli.js --role reviewer --note 'first administrator'"
echo "  2. In the app, open Contribute > Create contributor account and enter that code."
echo "  3. docker compose exec api node dist/db/promoteToAdmin.js <that email> admin"
echo "After that, create invitations in the console's Team tab (/pilot)."
