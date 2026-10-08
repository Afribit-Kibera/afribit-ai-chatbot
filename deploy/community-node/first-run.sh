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

echo "==> Starting database and model server"
docker compose up -d postgres ollama

echo "==> Downloading the model ($MODEL). This is several GB and only happens once."
docker compose exec ollama ollama pull "$MODEL"

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

echo "==> Warming the model so the first question is not slow"
docker compose exec ollama ollama run "$MODEL" "Habari" >/dev/null || true

echo "Done. Open https://${NODE_HOSTNAME:-localhost}"
