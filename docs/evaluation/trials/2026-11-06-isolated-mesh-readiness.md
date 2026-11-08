# Isolated Huawei network: fresh Ethernet member node

**Session completed and closed at14:03 Nairobi, 6 November 2026.** The isolated-phone local path
passed the user-observed checks below. Full P5 acceptance remains partial: the computer retained
separate Wi-Fi, providers were disabled, and no PWA, DNS, TEE or remote-recovery test ran.
Old URLs and temporary passwords are archived and inactive. Household networking was unchanged.

| Check | Result and evidence scope |
|---|---|
| Local app reachable while external page fails, mobile data off | Confirmed by Edmund on iPhone |
| A1 sign-in and correct approved local answer | Confirmed by Edmund under requested unchanged network conditions |
| Existing A1 note edited and survives refresh | Confirmed by Edmund; editing clarified after count review |
| A2 own note/history only within the same community | Confirmed by Edmund; UI separation, not a known-ID attack |
| No saved card for the quasar question | Clear no-matching-approved-card response reported by Edmund |
| Model calls and attempted application fetch egress | Both0 in node shutdown counters; not independent packet capture |
| Owned app/database closed and listener absent | Verified by assistant, host lifecycle completed |

[Final checkpoint and note clarification](../../../output/isolated-mesh-phone/1d619a24-4f5f-4df4-8254-baa524280885/physical-acceptance-checkpoint.json)
preserve all observations without changing earlier records. No new paid compute.

6 November 2026. Edmund connected the computer by Ethernet to a separate Huawei HG8145V6
and kept household internet on computer Wi-Fi. Phones will join the test SSID `mesh`, reported
to have no uplink. This reopens physical offline testing without disrupting household internet.

Readiness trial [e3f71348-6a1a-473e-bfd6-89b93e951bf9](../../../output/trials/e3f71348-6a1a-473e-bfd6-89b93e951bf9.json)
completed six checks. Fresh host [95811237-adb9-475b-ab74-477c5b32c7d3](../../../output/trials/95811237-adb9-475b-ab74-477c5b32c7d3.json)
was deliberately left active with planned expiry **15:49 Nairobi on 6 November**, then closed
early at14:03 after the phone sequence. The completed lifecycle is separate from readiness.

[Operator helper](../../../output/isolated-mesh-session.mts) retained
[network observations](../../../output/isolated-mesh-session/e3f71348-6a1a-473e-bfd6-89b93e951bf9/network-readonly.json),
[source/build hashes](../../../output/isolated-mesh-session/e3f71348-6a1a-473e-bfd6-89b93e951bf9/source-and-build.json),
host logs, and [results](../../../output/isolated-mesh-session/e3f71348-6a1a-473e-bfd6-89b93e951bf9/summary.json).

Observed Ethernet `192.168.1.2/192.168.1.1` and Wi-Fi
`192.168.100.192/192.168.100.1`. IPv4 forwarding is disabled on both. Internet Connection Sharing
COM inspection returned no matching adapters, so sharing status is **unverified**, not confirmed
disabled. The summary's `noInternetSharingEnabled: false` means the inspector could not establish
that condition; it is not evidence that sharing is enabled. SharedAccess running alone also does
not establish that either adapter shares internet. Physical phone external-reachability testing
is required. Ethernet metric25 currently takes priority over Wi-Fi35; host WAN reachability was
not measured and no routes were changed.

Six checks: separate interface addresses/IPv4 forwarding; free port before start; fresh bounded
Ethernet node; page and referenced local assets; real A2 HTTP authentication/local approved
answer plus foreign-community403 and deletion of the probe conversation; household Wi-Fi URL
unreachable plus anonymous private-memory401. A subsequent listener read confirmed only
`192.168.1.2:4189` for this node. Temporary secrets remain in unserved operator files.

The actual API/config/shared source fingerprint is unchanged from the October node:
`025d37a412ab03a0ea39cbea5f85796882e14586351505e7912f0feedb51fad1`, base commit
`965d4c3f13747679391ecd2e1bd362acb4940f2d`, dirty workspace. Existing built app was reused;
no API/web behavior changed and no broad test suite was repeated. The trial exercises actual
running HTTP routes, rather than another model fixture.

At readiness completion, no new phone observation, PWA installation, local DNS mapping, full box uplink loss, compute
recovery, multi-hop mesh behavior or confidential-compute result is established. This is an
isolated-member-network test with a separately connected dual-homed host. Saved approved cards
are retrieval responses, not model generation. All providers remain disabled; paid compute $0.
No router, firewall, Wi-Fi project or internet-sharing configuration was changed.

Read-only inspection of `D:\dev\wifi\mikrotik` found RouterOS scripts with different subnet/VLAN
assumptions, HotSpot template syntax and external-service dependencies. They were not imported
into the Huawei. [Phone procedure and product design](../../guides/isolated-mesh-and-local-domain.md)
describe naming, trusted HTTPS, portal limits, offline behavior and member authentication.

## Physical phone reachability follow-up

Edmund explicitly replied **“App loads; internet page fails; Mobile Data off”** to the request
to join `mesh`, open the local app and try the fresh external probe in Safari. Recorded in trial
[bbe128e1-3d89-47ea-ba88-774c5c009f5b](../../../output/trials/bbe128e1-3d89-47ea-ba88-774c5c009f5b.json)
with [the exact observation and limitations](../../../output/isolated-mesh-phone/bbe128e1-3d89-47ea-ba88-774c5c009f5b/observation.json).
This supports physical phone access to the local app while the attempted internet page was
unavailable and mobile data was reported off. It is a user report, not assistant-operated device
instrumentation. Phone IP, OS/browser version, VPN state, exact interaction time and the technical
reason for the external request failing remain unknown. Login/local answer under these conditions
was requested next and is confirmed in the follow-up below. Full host WAN loss/recovery is still untested.

## Physical phone sign-in and local answer follow-up

Edmund replied **“Signed in; Tuesday, 2–4pm, free; approved card shown”** after being instructed
to keep mobile data off, stay on `mesh`, sign in as A1 and ask the ledgerdesk question. Trial
[74cfe3c6-f977-4adb-bc42-107fe8f58e68](../../../output/trials/74cfe3c6-f977-4adb-bc42-107fe8f58e68.json)
records [the exact report](../../../output/isolated-mesh-phone/74cfe3c6-f977-4adb-bc42-107fe8f58e68/observation.json)
and a [partial physical checkpoint](../../../output/isolated-mesh-phone/74cfe3c6-f977-4adb-bc42-107fe8f58e68/physical-acceptance-checkpoint.json).
This confirms user-observed authentication and the expected approved-card answer under the
requested unchanged isolated-member-network conditions. Mobile data off was explicitly reported
in the preceding observation; its state was not separately instrumented or rechecked for this reply.

The account-note save/refresh and same-community A1/A2 separation check was requested next and
is confirmed below. October's separation results remain separate historical evidence. Whole-box WAN loss,
live remote-compute recovery, PWA installation, local DNS and complete P5 acceptance remain open.
The node still uses no model, rental or paid compute; household connectivity is unchanged.

## Physical phone note refresh and same-community separation follow-up

Edmund replied **“A1 note survives refresh; A2 sees only its own note/history”** after being
asked to keep mobile data off on `mesh`, save `FICTIONAL-OFFLINE-A1` in A1 with remote permission
off, refresh, then sign out and inspect A2's memory/history in the same community. Trial
[eeca3eed-8274-4cb2-af13-4a4fab228788](../../../output/trials/eeca3eed-8274-4cb2-af13-4a4fab228788.json)
preserves [the observation](../../../output/isolated-mesh-phone/eeca3eed-8274-4cb2-af13-4a4fab228788/observation.json)
and [updated partial checkpoint](../../../output/isolated-mesh-phone/eeca3eed-8274-4cb2-af13-4a4fab228788/physical-acceptance-checkpoint.json).
The earlier checkpoints remain unchanged. This establishes user-reported note save/refresh and
same-community account display separation under the requested unchanged network conditions.

It does not establish note survival after server restart: the node database remains in memory.
Remote permission was requested off, not independently inspected in this observation. This is
not a phone known-foreign-ID attack, host-root or infrastructure-operator privacy test. The network
conditions were requested unchanged, without repeating the external probe or instrumenting the phone.

Next in the sequence was an unrelated question with no saved card; its result and cleanup follow.
Since this node deliberately has no model provider, this checks the local retrieval-miss path,
not a failed or recovered remote GPU connection. No new model call/spend or network change.

## No-card response and clean shutdown

Edmund replied **“It says no matching approved card is available”** after being instructed to
start a new A2 conversation, stay on `mesh` with mobile data off, and ask “Describe quasar
spectroscopy in Japanese.” Observation and cleanup trial
[263f2e6c-0146-440e-9aba-07d6b4a8adde](../../../output/trials/263f2e6c-0146-440e-9aba-07d6b4a8adde.json)
retains [the exact report](../../../output/isolated-mesh-phone/263f2e6c-0146-440e-9aba-07d6b4a8adde/observation.json).
The reply is a clear retrieval miss, not a generated answer or evidence of a remote-provider failure.

The helper requested shutdown using this host's owned `stop-request.json`. Host state is closed,
lifecycle completed at **14:03:01 Nairobi**, reason `operator-local-stop-request`. The app URL was
unreachable and a separate read-only listener check found no matching listener. No other process,
router, internet connection or network settings were changed.

[Shutdown summary](../../../output/isolated-mesh-phone/263f2e6c-0146-440e-9aba-07d6b4a8adde/summary.json):
2 remaining sessions,4 messages,4 notes;1 reviewed-card and1 unavailable assistant reply;
5 retrieval queries,0 model calls,0 denied application fetch-egress attempts, paid compute$0.
Remaining-row counts exclude the deleted A2 readiness probe conversation. Aggregate source counts
do not attribute individual inputs; they corroborate categories without exporting message text.
Temporary credentials/tokens no longer authenticate against this closed ephemeral database.

## Clarification of the memory operation

The four final notes matched the four seeded notes. Rather than infer an additional saved item,
the assistant asked which operation was performed. Edmund replied **“Edited or replaced the
existing note.”** Trial
[1d619a24-4f5f-4df4-8254-baa524280885](../../../output/trials/1d619a24-4f5f-4df4-8254-baa524280885.json)
and [clarification](../../../output/isolated-mesh-phone/1d619a24-4f5f-4df4-8254-baa524280885/observation.json)
record that this was **edit-and-refresh**, not creation of a fifth note. Four remaining notes are
consistent with the clarified operation; counts alone do not prove content. No note-addition,
restart persistence, host-root privacy or complete security claim is inferred. Final checkpoint
keeps `acceptedAt:null` and the broader physical acceptance partial.

The next product work is stable local naming and trusted HTTPS for a separately verified PWA
installation/offline-relaunch flow. Any generated-answer or live GPU loss/recovery session needs
its own provider setup, evidence and reconciled spending allocation; no new rental is authorized
by completion of these local checks.
