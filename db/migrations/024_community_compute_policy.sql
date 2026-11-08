CREATE TABLE community_compute_policies (
  pack_id TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  policy JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version>0),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE community_compute_usage (
  pack_id TEXT NOT NULL,
  day DATE NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts>=0),
  reserved_microusd BIGINT NOT NULL DEFAULT 0 CHECK (reserved_microusd>=0),
  PRIMARY KEY (pack_id,day)
);
CREATE TABLE community_compute_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id TEXT NOT NULL,
  day DATE NOT NULL,
  policy_version INTEGER NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('chat','embeddings')),
  endpoint_base_url TEXT NOT NULL,
  region TEXT NOT NULL,
  upstreams JSONB NOT NULL DEFAULT '[]',
  max_input_bytes INTEGER NOT NULL,
  max_output_tokens INTEGER NOT NULL,
  reserved_microusd BIGINT NOT NULL CHECK (reserved_microusd>=0),
  reported_microusd NUMERIC,
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','completed','failed','cancelled','overrun')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);
CREATE INDEX idx_compute_reservations_pack ON community_compute_reservations(pack_id,created_at DESC);
