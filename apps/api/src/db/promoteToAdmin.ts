import { pool } from "./pool.js";

/**
 * Operator-run CLI, not an API endpoint -- there is deliberately no
 * public "become an admin" path anywhere in this codebase (see
 * db/migrations/009_auth.sql). Matches this repo's existing convention
 * for admin-only operations (seedCommunityManuals.ts, promoteCommunityManuals.ts):
 * a script someone with actual server/DB access runs by hand, not
 * something reachable over HTTP.
 *
 * Run with: pnpm --filter @afribit/api exec tsx src/db/promoteToAdmin.ts <email>
 */
async function main(): Promise<void> {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error("Usage: tsx src/db/promoteToAdmin.ts <email>");
    process.exit(1);
  }

  const { rows } = await pool.query<{ id: string; role: string }>(
    `UPDATE users SET role = 'admin' WHERE email = $1 AND created_via = 'registered' RETURNING id, role`,
    [email],
  );
  const user = rows[0];
  if (!user) {
    console.error(`No registered user found with email ${email}. They must register (POST /api/v1/auth/register) first.`);
    process.exit(1);
  }

  console.log(`Promoted ${email} (user id ${user.id}) to role='${user.role}'.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
