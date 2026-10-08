-- Usage reports ask "what happened in the last N days"; the gateway now writes a row per model call.
CREATE INDEX IF NOT EXISTS idx_model_runs_created_at ON model_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_runs_request_id ON model_runs (request_id);
