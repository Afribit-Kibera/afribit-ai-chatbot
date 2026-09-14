-- Persist the AI critic's verdict directly on the row it reviewed, so a
-- human reviewer sees "critic flagged possible factual drift" without
-- having to dig through dataset_generations.raw_response. This is a
-- signal for humans, never a status change — see docs/adr/0005 and the
-- Architecture doc's "AI must never certify its own output" rule.

ALTER TABLE language_entries
  ADD COLUMN critic_verdict TEXT CHECK (critic_verdict IN ('natural', 'awkward', 'unnatural', 'unsafe')),
  ADD COLUMN critic_factual_drift BOOLEAN;

COMMENT ON COLUMN language_entries.critic_factual_drift IS
  'Set by an AI critic pass (Terra) — flags candidates worth extra human scrutiny before any review promotes them. Never auto-rejects; a human reviewer makes the actual call.';
