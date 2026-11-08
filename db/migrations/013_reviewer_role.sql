-- Reviewers: people who may edit and move knowledge cards through review, but are not full admins.
-- 009_auth.sql allowed 'contributor' and 'admin'. A community's reviewers should not need the keys to
-- everything else, so add a role between them.
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
    WHERE con.contype = 'c' AND rel.relname = 'users' AND att.attname = 'role'
  LOOP
    EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('contributor', 'reviewer', 'admin'));
