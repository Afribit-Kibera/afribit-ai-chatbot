import { matchOrigin, parseOrigins } from "./cors.js";

/**
 * Checks for the website-origin allow list. No server needed.
 * Run with: pnpm --filter @afribit/api test:cors
 */
let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) console.log(`  ok   ${name}`);
  else {
    failures += 1;
    console.log(`  FAIL ${name} ${detail}`);
  }
};

const list = parseOrigins("https://ai.afribit.africa, https://www.ai.afribit.africa/ ,,https://afribit-chat-gamma.vercel.app");
check("splits on commas, trims, drops blanks and trailing slashes", list.join("|") === "https://ai.afribit.africa|https://www.ai.afribit.africa|https://afribit-chat-gamma.vercel.app", list.join("|"));
check("a single origin still works", parseOrigins("http://localhost:5173").join() === "http://localhost:5173");
check("empty input gives an empty list", parseOrigins("  ,, ").length === 0);

check("an allowed origin is returned as-is", matchOrigin("https://ai.afribit.africa", list) === "https://ai.afribit.africa");
check("a trailing slash on the request does not matter", matchOrigin("https://ai.afribit.africa/", list) === "https://ai.afribit.africa");
check("another listed origin is allowed", matchOrigin("https://afribit-chat-gamma.vercel.app", list) === "https://afribit-chat-gamma.vercel.app");
check("an unlisted site is refused", matchOrigin("https://evil.example", list) === null);
check("a look-alike subdomain is refused", matchOrigin("https://ai.afribit.africa.evil.example", list) === null);
check("a different scheme is refused", matchOrigin("http://ai.afribit.africa", list) === null);
check("no Origin header (curl, server-to-server) gets no CORS header", matchOrigin(undefined, list) === null);
check("never a wildcard", matchOrigin("*", list) === null);

console.log(`\n${failures === 0 ? "All CORS checks pass." : `${failures} check(s) FAILED.`}`);
process.exit(failures === 0 ? 0 : 1);
