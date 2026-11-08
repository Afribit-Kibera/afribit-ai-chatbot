# Member phone and local-network acceptance kit

**6 November update:** [isolated Huawei network procedure](isolated-mesh-and-local-domain.md)
uses a fresh Ethernet-bound node and leaves household Wi-Fi connected. Edmund confirms local
page access, external page failure and mobile data off, followed by A1 sign-in and the expected
approved local answer, followed by A1 note refresh and A2 own note/history only under requested
unchanged conditions. No-card behavior is now also confirmed; the note was edited/replaced,
not added as a fifth item. Node closed14:03 Nairobi, listener absence verified,0 model/egress.
All links/passwords for this session are archived. Note survival after restart, full box WAN
loss and remote recovery remain separate. The October session below is also archived.

Prepared 28 October 2026. **Phone login/local answers and cross-/same-community display separation
confirmed29 October. Physical uplink-loss deferred at Edmund's request; temporary node closed.**

The household needs uninterrupted internet. [Checkpoint/cleanup](../evaluation/trials/2026-10-29-outage-deferred-session-close.md)
are saved; no new date/reminder is set. The model is now user-reported Huawei HG8145V6, Safaricom,
direct fibre. A suitable model/firmware-specific interruption method remains unverified. Agree a
future window or separate test network before running the outage procedure below. Old node expiry/
passwords/URLs in the historical updates do not describe a currently running session.

**Running-node update:** [the actual learner app/API is now available](running-member-lan-node.md)
for synthetic sign-in, local approved answers and scoped notes/history. Model calls are disabled.
Desktop browser testing passes; user-observed phone sign-in/chat is requested. This supplies the
previously missing isolated node prerequisite for the bounded session, not an uplink-loss result.

**Later same-day update:** Edmund confirmed the iPhone is on the existing internet-enabled Wi-Fi
and asked to use it. [Temporary review-page LAN links](live-answer-human-review.md#open-on-the-current-wi-fi)
are now served for the phone reachability check; Edmund confirmed the page loads on his iPhone. Internet
need not be disabled for that first check. Full synthetic chat-node deployment and the uplink-loss
sequence below have not run; serving the review page alone does not establish AI/API availability.
The [software rehearsal](../evaluation/trials/2026-10-28-review-and-network-acceptance.md)
closes and restores an actual loopback compute socket while the member HTTP API stays available.
Its model replies are fixtures. This procedure checks the separate physical-network boundary later.

## Prepare the session

**29 October planning update:** Edmund selected "Internet enters directly by fibre or SIM".
The precise medium and router make/model are still unknown. No cable/SIM was removed, router
setting changed or internet outage observed. Obtain the model before choosing an internet-only
pause that preserves Wi-Fi/LAN; leave the fibre/SIM and router power in place meanwhile.
The current synthetic node expires11:35 Nairobi29 October. If it expires before the procedure is
ready, use a new bounded session and account sheet rather than interpreting expiry as uplink failure.

**Later identification:** Edmund confirms Huawei/Safaricom/direct fibre at192.168.100.1.
[Read-only checks](../evaluation/trials/2026-10-29-outage-method-preparation.md) could not identify
the model: HTTPS trust failed and browser navigation stopped at a certificate warning. No warning
bypass, login or configuration change. Obtain the printed model code before choosing a WAN control;
do not assume consumer-router menu instructions apply to this fibre unit.

Use a phone, Wi-Fi router and community test computer on the same LAN, with an operator who can
remove and restore only that test computer/router's internet uplink. Keep the router and LAN powered.
Record a new UUID, source revision/hash, operator, devices, browser, LAN arrangement and start/end
times in a copy of [the pending evidence template](../examples/member-lan-acceptance.template.json).
Leave unknown fields null and unobserved checks pending. Keep failed attempts as separate records.

An isolated **synthetic** node must be running before this test: two fictional communities, two
accounts each, approved schedule cards and distinct fictional private notes. The ordinary production
database is not a test fixture. The existing [community-node deployment guide](../../deploy/community-node/README.md)
describes the deployment; it is not permission to run its first-install/model-download steps on the
current laptop. A prepared node, its reachable LAN URL and credentials are still prerequisites.
Do not publish it to the internet or disable authentication. Never put passwords/tokens in evidence.

Make the web app and its API reachable through the same LAN origin; a localhost URL on a phone means
the phone itself. Check that the web app's API configuration points to this node. Use a trusted local
HTTPS setup if testing service-worker/PWA behavior. Plain LAN HTTP may demonstrate API reachability
but does not establish installable/offline PWA behavior. Record which was used. Do not alter the
working computer's firewall, default route or Tailscale settings as part of this kit preparation.

Choose and record the compute mode before starting:

| Mode | What may be observed | Limits |
|---|---|---|
| Reviewed-only, no remote endpoint | Local facts and account access during uplink loss | Remote generation/recovery is skipped |
| Owned synthetic fixture endpoint across the uplink | Transport loss, labels and recovery | Outputs are fixtures; no AI quality or GPU evidence |
| Separately funded approved model endpoint | Actual model availability and recovery | Needs an active supervised endpoint and explicit budget accounting |

**No rental is running. This kit does not start one.** The original $10 experiment has $9.995020
conservatively held/allocated, including $2 held aside. Do not reset reservations or reuse an expired
lease. A real-compute test needs a reconciled spending decision first.

## Run on the physical phone

1. Disable mobile data and any cellular Wi-Fi failover on the test phone. Connect to the test LAN.
   Record the setting and observed node URL without recording the Wi-Fi password. Load the app and
   sign in as fictional A1. Confirm the expected approved card is retrievable. Record answer source,
   processing label and wall-clock elapsed time; do not call that elapsed time model latency.
2. With uplink available, ask the approved schedule question in reviewed-only mode. Expect local
   approved facts with no inference dispatch. If a qualified remote endpoint is active, also make
   one allowed synthetic model request and retain its request ID/source; otherwise mark it skipped.
3. Sign in independently as A2/B1 in a separate browser profile or after sign-out. Confirm A1's saved
   private note and history are absent. Try a known A1 conversation URL/ID through the normal API
   with B1's valid credentials: expect refusal, no content and zero inference. Do not copy auth
   tokens into the evidence. Record refusal status/request ID only.
4. Return to A1. Remove **only the internet/backhaul uplink**, keeping local Wi-Fi/LAN and the node
   running. Confirm the phone can still reach the local node but an external endpoint cannot be
   reached from the test node. Record how this was observed. Merely turning mobile data off is
   not evidence that the hub lost its internet access.
5. Ask the approved schedule question in reviewed-only mode. Expect the same approved local facts
   and zero remote calls. Try local-only mode: expect a local model answer if one is installed,
   otherwise the explicit reviewed fallback. The fallback does not prove a local LLM ran.
6. If remote mode was qualified, ask an allowed remote question in a new conversation during the
   outage. Expect an explicit reviewed fallback or unavailable/error state consistent with the
   application policy, no second provider and no privacy downgrade. Record what the UI actually
   shows. Do not accept an unlabeled fixture/fallback as a successful model answer.
7. Restore only the uplink. In that same outage conversation send one follow-up. If remote mode
   was qualified, expect model transport to return with history scoped to A1. Check stored message
   IDs/counts for exactly two user turns and two assistant turns for this two-question sequence;
   record any retry/interruption separately. Verify that A2/B1 still cannot access it.
8. Stop test resources, restore the test uplink/settings, sign out and record cleanup. Retain
   redacted screenshots, request IDs, source labels, node-side dispatch counts and observations
   under the trial UUID. Mark failed/pending/skipped checks explicitly. Never overwrite a failure
   with a later run's pass or include credentials/private conversations in public notes.

For a fixture-only or reviewed-only session, leave actual remote-model generation and recovery
**skipped**, rather than marking all of P5 complete. Phone/local LAN acceptance, Mesh routing,
Tailscale access, service-worker behavior and a genuine local model are separate observations.
Browser developer-tools "offline" blocks browser networking and is not a substitute for this
uplink-only test. The app may react differently to loss of all connectivity than to a working LAN
with no backhaul; observe the actual phone behavior.

## Review the outcome

Complete P5's device/network gate only after the required physical observations and their artifacts
are reviewed. This kit and its automated rehearsal do not qualify community hardware economics,
production deployment, root/admin isolation, 4-of-7 governance or confidential GPU processing.
No real learner, patient or student data is needed for this test.
