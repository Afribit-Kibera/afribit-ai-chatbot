# Wi-Fi review delivery - 28 October 2026

**Later review-return update:** [first human-review intake](2026-10-28-first-human-review.md)
validates one complete matching Reviewer01 JSON supplied by Edmund. Two returns remain pending.
The precise export device is unverified; pending/zero-return statements below retain their original
pre-return context. No overall language, AI-chat or uplink-loss acceptance follows from this return.

Edmund confirmed his iPhone shares the connected Wi-Fi and requested a concrete human-review
deliverable. Internet remains enabled. No router, firewall, default route or Tailscale settings changed.
No model call, rental, training, upload endpoint, AI/chat-node deployment or reviewer message.

| Trial | Observed state |
|---|---|
| [ae51bb07](../../../output/trials/ae51bb07-8b69-4bb7-8e7a-93c9fefe19d8.json) | **Active server, not a completed test.** Read-only host bound specifically to observed Wi-Fi IPv4 `192.168.100.192:4188`, only three exact pre-approved fictional HTML pages.120-minute expiry; started20:19:52, expires22:19:52 Nairobi on28 October. Deliberately left running for the requested iPhone review check |
| [c1045af5](../../../output/trials/c1045af5-2329-4ee9-9d40-b5fec47c8055.json) | **Completed computer-side verification/deliverable.** All3 HTTP pages200 and exact manifest SHA-256;6 disallowed paths404 including keys/env/traversal/query variant;POST405. ZIP contains exactly3 standalone HTML copies plus START-HERE.txt, no keys |
| [18c1087a](../../../output/trials/18c1087a-7208-4105-8341-fd5270bcb781.json) | **Completed user-observation record.** Edmund answered "Yes, the review page loads" to the iPhone/shared-Wi-Fi/Reviewer01 question. Confirms user-observed physical phone page reachability; no agent-observed phone interaction, rating export, AI chat or uplink-loss result |

[Verification/source hash and ZIP digest](../../../output/review-deliverables/c1045af5-2329-4ee9-9d40-b5fec47c8055/verification.json).
[Active host info](../../../output/human-review-lan/ae51bb07-8b69-4bb7-8e7a-93c9fefe19d8/server.json).
Server and verifier helpers are `output/serve-human-review-lan.mts` and
`output/verify-review-wifi-deliverable.mts`; reuse existing Node/tsx/Python standard-library zipfile.
No dependency installation or application-code change. Previous full tests/typecheck/build remain
the latest repository checks; this pass verified the actual served bytes and refusal paths.

No directory listing or request-to-filesystem mapping. Pages are preloaded and checked against
the prior manifest; only exact GET/HEAD paths succeed. No bearer keys, account records, prompt logs
or reviewer submissions are stored by this server. Do not serve the repository or private operator
folder. Page access is available to people who can reach this Wi-Fi host; contents are intentionally
fictional. This plain LAN HTTP host does not establish HTTPS/PWA or host-blind confidentiality.

Latest host journal remains `started` while its owned listener is deliberately active, not a pass
or an abandoned rental. Normal expiry/SIGINT/SIGTERM closes its listener and finishes its journal;
forced OS termination would require a later absence observation. No paid resource exists in this
delivery setup. PID/bind/expiry are in host info; IP/links can stop working after reconnection/sleep.
The machine also has Ethernet on the same gateway, but this host binds only the observed Wi-Fi IP.

An asynchronous question supplied Reviewer01's URL for the iPhone. **Edmund explicitly confirmed
the page loads**, a user-observed physical phone reachability result. This supersedes the initial
pending-phone state in the immutable host-verification artifacts; it does not change their historical
fields or make them phone observations. Device/OS/browser versions and exact interaction timestamp
were not supplied. No inbound rule or public tunnel was added. Physical iPhone JSON export and human
ratings remain pending. The live AI/API and uplink-loss test remain separate work on an isolated
synthetic node. The host's own lifecycle journal remains separate from this completed observation.

[Handoff and three live links](../../guides/live-answer-human-review.md#open-on-the-current-wi-fi)
include an invitation for Edmund to send, separate copy assignment and JSON return instructions.
The ZIP is for Edmund to unpack and distribute one HTML copy per independent reviewer. People
outside this Wi-Fi cannot use private LAN links; HTML attachment compatibility must be tested or
approved hosting arranged later. No external publication or outbound reviewer message occurred.
Original reviewer assignments/returns remain blank, costs$0, and no quality result is inferred.
