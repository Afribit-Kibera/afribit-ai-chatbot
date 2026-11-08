# Member LAN page-failure diagnosis and retry - 29 October 2026

**Session closed:** Edmund deferred the physical outage test to keep household internet available.
[Checkpoint and cleanup](2026-10-29-outage-deferred-session-close.md) preserve the completed phone
observations. Historical active/expiry/account links below are not a currently running service.

**Fresh A1 sign-in and local approved answer confirmed by Edmund on iPhone. Original failure retained.**
B1 cross-community facts/notes/history separation and same-community A1/A2 phone separation are
also confirmed by Edmund. Physical uplink-loss remains pending; no model generation in this node.
Edmund reported "Page does not load" for the F-033 iPhone test, then asked to continue. Applied the
engineering debug workflow: check lifecycle, network/listener, page/assets, sign-in and approved-card
path before changing infrastructure. No firewall/network setting, app source, built UI, model or
provider change. No new paid compute or external messages.

## Evidence and every invocation

| Trial | Actual result |
|---|---|
| [c9293b08](../../../output/trials/c9293b08-90cb-4c07-989a-5e797777f6c9.json) | Previous node completed its absolute two-hour expiry at23:38:35 Nairobi28 October. Shutdown metrics0 sessions/0 messages/4 seeded notes,0 model/egress. Today server info is closed; no4189 listener existed before restart |
| [54b40282](../../../output/trials/54b40282-31b1-4902-9353-0c68f7c3517a.json) | New running node, **active**, same observed Wi-Fi bind192.168.100.192:4189, fresh ephemeral database/passwords, expires11:35:13 Nairobi29 October. Deliberately left for retry; not a completed phone test |
| [bac544a1](../../../output/trials/bac544a1-867e-4123-a854-de5259db994e.json) | First diagnostic:5 checks passed; final login/chat check failed in its cleanup substep. Local HTTP login and card had succeeded, but DELETE with JSON Content-Type and no body was refused400 |
| [5e61725b](../../../output/trials/5e61725b-0ef1-460c-a0a2-5217eb04ebe2.json) | Same diagnostic retry with explicit status reporting confirmed400 versus expected204 at DELETE, not a page/login/chat failure |
| [acfde3a4](../../../output/trials/acfde3a4-c014-41cd-98a1-45ff499a1de6.json) | Corrected operator probe completed6/6: lifecycle/source/build hashes, Wi-Fi/listener, actual page/JS/CSS200, real HTTP sign-in, approved card, foreign-community403 and cleanup. Empty DELETE now omits Content-Type; all3 A2 probe conversations deleted |
| [25672a08](../../../output/trials/25672a08-9f87-465c-9981-247bf27f088f.json) | Completed user-observation record: earlier symptom "Safari could not connect"; fresh retry "The page loads now". Confirms iPhone/Safari page reachability, not phone authentication/chat or uplink-loss |
| [15f7ed1c](../../../output/trials/15f7ed1c-3dee-446a-b971-ae728bc85a6a.json) | Completed later user-observation record: "Signed in; Tuesday, 2–4pm, free appears" after the A1 schedule-question request. Confirms iPhone authentication/local answer; no inferred model generation, account-isolation or uplink-loss result |
| [2d7878c3](../../../output/trials/2d7878c3-31b9-4b03-b2ac-f99df0c88205.json) | Completed user-observation record: "B1 facts and notes only; no A1 history" after requested B1/CommunityB card/memory check. Confirms cross-community display separation on iPhone; same-community A1/A2 isolation and uplink-loss not inferred |
| [21b9ca77](../../../output/trials/21b9ca77-1a4c-469f-a226-8378455adf80.json) | Completed user-observation record: "A2 note only; no A1 conversation" after requested same-community A2 note/history check. Exports a partial physical acceptance checkpoint with the prior page/answer/community observations; no uplink-loss or model claim |

[Final diagnostic summary](../../../output/member-lan-diagnostic/acfde3a4-c014-41cd-98a1-45ff499a1de6/summary.json),
[read-only network/firewall snapshot](../../../output/member-lan-diagnostic/acfde3a4-c014-41cd-98a1-45ff499a1de6/network-readonly.json),
[six checks](../../../output/member-lan-diagnostic/acfde3a4-c014-41cd-98a1-45ff499a1de6/checks.json).
Original user-report details are retained with each diagnostic. Failed attempts remain intact.
The corrected helper is `output/member-lan-retry-diagnostic.mts`; it affects only operator checks,
not the learner app or its request handling. Temporary credentials/tokens/response bodies were not
printed or saved in diagnostic reports. Generated credentials remain in the unserved operator sheet.

## Findings and limits

Today Wi-Fi is up at the same192.168.100.192/24; Ethernet is disconnected. The observed listener
belongs to the fresh node's exact PID/address. Windows Firewall profiles remain enabled. Existing
enabled inbound Node rules say Allow on the Public profile. This read-only inspection does not
establish all effective routing, firewall or iPhone/client-isolation behavior; no new allow rule,
profile switch, tunnel or router change was made.

The old server's expiry explains its current unavailability. It **does not prove the original phone
attempt happened after expiry**, because the user did not provide the exact failure time/error.
The original physical-phone failure cause remains unresolved. Edmund subsequently clarified
"Safari could not connect" and explicitly confirmed the fresh page loads. The latter is a
user-observed physical reachability result beyond the computer-side probes. Exact observation times,
phone/browser versions and exact timestamps were not supplied. A later explicit user reply confirms
A1 sign-in and the requested Tuesday2-4pm/free answer. The server enforces reviewed-only processing;
this is local card retrieval, not generated inference. The user did not separately report inspecting
the source label. This completes the narrow physical phone sign-in/local-answer observation only.

The API source hash is unchanged at
`025d37a412ab03a0ea39cbea5f85796882e14586351505e7912f0feedb51fad1`, uncommitted base
`965d4c3f13747679391ecd2e1bd362acb4940f2d`. Separate web source/build-manifest SHA-256 values match
the completed F-033 browser handoff. Therefore the existing full tests/typecheck/build and82 web
tests remain the relevant code verification; no code changed or dependency installed today.
Six actual local diagnostic checks ran instead of repeating unchanged suites.

All answers remain approved local cards with no AI generation. The request deliberately uses A2,
reserved for automated probes; A1/B1 remain for phone users. Failed cleanup probes left2 conversations
temporarily; the final probe deletes all3 A2 conversations, including its own, through authenticated
owner routes. No real data or production database. No model/paid call, fine-tuning or budget change.

## Retry handoff

[Current instructions/account-sheet link](../../guides/running-member-lan-node.md) point to the new
session; old passwords are invalid. Open `http://192.168.100.192:4189/app/?pack=lan-a` on Safari on
the shared Wi-Fi, keep internet enabled, and use A1 from today's local sheet. Expect Tuesday2-4pm/
free and the approved-card/no-generation label. Use fictional inputs only; this is plain LAN HTTP.
The service stops automatically at11:35 Nairobi; it remains an active lifecycle journal until then.
Page reachability, A1 sign-in and its approved local answer are now user-confirmed. Do not mark
uplink-loss passed without its own observations. B1 cross-community separation and A2 same-community
note/history separation have subsequent explicit user confirmations. The
[partial checkpoint](../../../output/member-lan-phone-observations/21b9ca77-1a4c-469f-a226-8378455adf80/physical-acceptance-checkpoint.json)
records3 passed user-observed checks; known-ID phone attacks, measured latency, cellular failover
settings and physical backhaul loss remain unobserved. Remote generation/recovery is not exercised
because this node has no model endpoint. Historical diagnostic/server
artifacts retain their original pending fields; later observation records supersede those statuses.
No ongoing GPU or new spend. Existing conservative allocations and held-aside money are unchanged.
