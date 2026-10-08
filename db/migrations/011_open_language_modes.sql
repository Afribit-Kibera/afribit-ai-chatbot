-- Language modes belong to the community pack, not to the schema.
--
-- 001_init.sql pinned language_mode / style to the four Kibera modes with CHECK constraints, which
-- meant another community's pack (for example "pidgin" or "yoruba") could not be stored. The set of
-- valid modes is now declared by the active pack (packs/<id>/pack.json) and validated by the API
-- before anything is written. Existing rows are untouched, so this is safe to run on live data.

DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT con.conname, rel.relname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
    WHERE con.contype = 'c'
      AND (
        (rel.relname IN ('user_preferences', 'chat_sessions') AND att.attname = 'language_mode')
        OR (rel.relname = 'language_entries' AND att.attname = 'style')
      )
  LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', c.relname, c.conname);
  END LOOP;
END $$;
