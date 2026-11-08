# Try the running community node on your iPhone

**Ethernet session completed and closed6 November at14:03 Nairobi.** The isolated Huawei `mesh`
test confirmed phone page access, external page failure/mobile data off, then A1 sign-in, the
approved local answer, existing-note edit/refresh, A2 own note/history only and a clear no-card
response under requested unchanged conditions. [Results and archived procedure](isolated-mesh-and-local-domain.md).
Node/listener closed,0 model/egress attempts; household networking unchanged. Both November and
October links/passwords below are archived. A fresh bounded session is needed to use the app again.

**Session closed29 October at11:34 Nairobi.** Edmund deferred the outage check because the household
needs internet. The temporary app is stopped; links/passwords below are archived, not currently live.
[Saved checkpoint and cleanup](../evaluation/trials/2026-10-29-outage-deferred-session-close.md)
preserve the successful phone sign-in/local-answer and cross-/same-community display checks. No new
date or reminder is set. Resume later with a new bounded session and fresh account sheet.

## Archived session instructions

29 October 2026. **A1 sign-in and local approved answer confirmed by Edmund on iPhone.**
Edmund reported "Signed in; Tuesday, 2–4pm, free appears". This confirms the physical phone's
authenticated local-answer journey; models remain disabled. [Observation record](../../output/trials/15f7ed1c-3dee-446a-b971-ae728bc85a6a.json).
Edmund also confirmed B1 facts/notes only, with no A1 history after switching to Community B.
[Cross-community observation](../../output/trials/2d7878c3-31b9-4b03-b2ac-f99df0c88205.json).
Edmund also confirmed the same-community A2 check: "A2 note only; no A1 conversation".
[Partial physical acceptance checkpoint](../../output/member-lan-phone-observations/21b9ca77-1a4c-469f-a226-8378455adf80/physical-acceptance-checkpoint.json)
records page access, approved local answer and account display separation. Actual uplink-loss remains pending.
Edmund clarified that Safari previously could not connect and confirmed "The page loads now" on
the fresh session. Yesterday's session is confirmed expired; the underlying cause/time of the
earlier failed attempt is unverified. Today's Wi-Fi/listener, page/assets, sign-in and approved-card
API checks pass. [Retry diagnostics and all attempts](../evaluation/trials/2026-10-29-member-lan-retry.md).
The actual learner app/API now run on this computer, using two separate fictional communities and
four password-protected test accounts. Internet can stay enabled. Every chat uses local approved
cards; model/GPU calls are disabled. The page banner and each answer identify that behavior.

## Open and sign in

1. Keep this computer awake/on Wi-Fi and the iPhone on the same Wi-Fi.
2. On the computer, open [the current test account sheet](../../output/member-lan-node/54b40282-31b1-4902-9353-0c68f7c3517a/TEST-ACCOUNTS.md).
   Use **A1** (`a1@lan.invalid`) and its temporary password. These are different credentials from
   yesterday's node; no registration or invitation is needed. Share only an assigned test account.
3. On iPhone Safari open [Community A](http://192.168.100.192:4189/app/?pack=lan-a).
   Complete or skip the initial language setup, open **My learner account**, then sign in with A1.
4. Ask: **When is the fictional ledgerdesk open, and what does a session cost? ledgerdesk**
5. Expect **Tuesday,2:00pm-4:00pm,free**, and **Approved card: no AI generation**. Report the answer
   you actually see; the page loading by itself does not confirm sign-in or chat.

This service was scheduled to expire11:35 Nairobi29 October and was closed at11:34 after the test
was deferred. The service lifecycle journal is complete. The following steps describe that historical
session; a new session will have a new account sheet/expiry and may have a different LAN IP.

## Check notes and community separation

Open your account's **Personal memory** panel. Its seeded note is labeled `FICTIONAL-OWNER-A1`.
Add only a fictional note, leaving remote permission off. Saving/listing/deleting notes works locally;
reviewed-card answers do not use an LLM or personalize their wording from your notes in this run.

Sign out. For a second community, use **B1** from the same operator sheet and open
[Community B](http://192.168.100.192:4189/app/?pack=lan-b). Ask the same question. Expect
**Friday,9:00am-11:00am,KSh50** and only B1's private notes/history. A2/B2 are reserved for automated
checks. B1 was subsequently checked on the iPhone: its own facts/notes, no A1 history.
Do not treat people with access to another test account's password as independent attackers.

For the next same-community check, sign out of B1 and open Community A again. Sign in as **A2**
using today's sheet. Inspect **Personal memory** and account conversations: expect `FICTIONAL-OWNER-A2`,
no `FICTIONAL-OWNER-A1`, and no A1 conversation. The automated A2 probe conversations were deleted
through owner routes during readiness checks. An A1-versus-A2 check tests account privacy inside
one community; the completed A1-versus-B1 check also changed community, so it is narrower evidence.
Edmund has now performed that A2 check and confirmed its own note with no A1 conversation. These are
user-observed UI results; automated known-ID authorization tests remain separate evidence.

The browser check already exercised A2/B2 sign-in, distinct answers, a private note, sign-out and
absence of the other account's memory. API tests check known foreign conversation IDs and membership
refusals. [Trial report and failures](../evaluation/trials/2026-10-28-running-member-lan-node.md).

## Scope and shutdown

Use fictional inputs only. Plain LAN HTTP is suitable for this disposable synthetic test; it does
not protect credentials/content against a network observer or prove production privacy. No router,
firewall or Tailscale change, public tunnel, model download or paid compute. No admin account or
unrestricted registration. The language candidate from F-032 is still draft and is not activated here.

The database exists only in this process; notes/history disappear when it closes. Approved records
and accounts are synthetic seeds, not copies of the configured application database. Text is not
included in shutdown metrics; only counts/source metadata are exported. No arbitrary operator files
or source maps are served. The private account sheet is not accessible through the web server.

Automatic expiry gracefully closes the listener/database. To stop this exact session early, create
its local stop marker on the computer:

```powershell
New-Item -ItemType File -Path 'D:\dev\afribit-ai\output\member-lan-node\54b40282-31b1-4902-9353-0c68f7c3517a\stop-request.json'
```

The server checks that owned path and closes within about a second; keep its journal/metrics as
evidence. Do not stop other Node processes or edit firewall rules. Restarting needs a new UUID,
fresh credentials and a new expiry, using `pnpm --filter @afribit/api showcase:member-lan WIFI_IPV4`.

This demonstrates the local account/retrieval side once the phone observation is supplied. Physical
uplink-loss/reconnection remains a separate [LAN acceptance procedure](member-lan-acceptance.md).
Actual local-model inference, rented heavy inference, approved language improvement, Mesh routing,
governed administration and TEE each retain their separate evidence requirements.
