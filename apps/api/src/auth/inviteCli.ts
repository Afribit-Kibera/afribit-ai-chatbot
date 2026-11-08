import { pool } from "../db/pool.js";
import { parseInviteInput } from "./invitations.js";
import { invitationStore } from "./invitationStore.js";

/**
 * Operator command for a node without the console (docs/features/F-012-invitation-only-accounts.md): prints
 * one single-use invitation code. Run where the database is reachable:
 *
 *   pnpm --filter @afribit/api invite:create --role reviewer --note "Amina, Kibera reviewers" --days 7
 *   docker compose exec api node dist/auth/inviteCli.js --role contributor     (a community node)
 */
function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const days = arg("days");
  const input = parseInviteInput({ role: arg("role") ?? "contributor", note: arg("note"), days: days === undefined ? undefined : Number(days) });
  if (!input.ok) {
    console.error(`${input.error}\nUsage: invite:create [--role contributor|reviewer] [--note "who it is for"] [--days 7]`);
    process.exit(1);
  }
  const created = await invitationStore.create({ role: input.role, note: input.note, days: input.days, createdBy: null });
  console.log(`Invitation for a ${input.role}${input.note ? ` (${input.note})` : ""}, single use, expires ${created.expiresAt}:\n\n  ${created.code}\n`);
  console.log("This code is shown once and is not stored. Pass it on privately.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
