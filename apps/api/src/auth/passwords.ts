import bcrypt from "bcryptjs";

// bcryptjs, not native bcrypt or argon2: zero native-binding compilation,
// which matters for this project's actual deploy target (infra/LUNANODE.md,
// a plain VPS) and for contributors on Windows/whatever else without a
// build toolchain ready. 12 rounds is a reasonable current default (OWASP's
// general guidance floor); revisit upward as hardware gets cheaper.
const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Minimal, not a full password-strength policy -- this is a
 * community-contributor/admin login, not a consumer product with a
 * security team behind a full zxcvbn-style checker. Long enough to rule
 * out the worst trivial passwords without being annoying.
 */
export function isPasswordAcceptable(plain: string): boolean {
  return typeof plain === "string" && plain.length >= 10;
}
