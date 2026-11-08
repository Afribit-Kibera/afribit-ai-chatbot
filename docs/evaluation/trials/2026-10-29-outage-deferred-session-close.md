# Outage test deferred; physical-session checkpoint saved - 29 October 2026

**Deferred at Edmund's request because the household needs internet. No outage performed or new
date/reminder set. The temporary node is now closed; household internet/router settings unchanged.**

Edmund supplied router model **HG8145V6** (user-reported), then said: "Okay, we cannot pause, we
use the internet house wide. Maybe lets reschedule for later?" This supersedes further outage-method
work in this session. No router login/change, fibre removal, household disconnection or model-specific
WAN procedure was performed. Do not resume an outage merely from a general request to continue;
agree a suitable window first. The model/firmware's appropriate internet-only control remains unverified.

## Trials and cleanup

| Trial | Result |
|---|---|
| [54b40282](../../../output/trials/54b40282-31b1-4902-9353-0c68f7c3517a.json) | Owned node completed graceful local-stop request at11:34:14 Nairobi29 October, ahead of11:35 expiry. Exported metadata; app/database closed. No network setting changed |
| [dfe9af1d](../../../output/trials/dfe9af1d-4d75-444a-98e8-16ed3933277c.json) | Initial close/checkpoint verifier recorded needs-attention after successfully closing node. Its overly strict assertion expected every assistant row to be reviewed-card; actual data also contains1 legitimate unavailable result |
| [a9d54114](../../../output/trials/a9d54114-f037-4661-bb08-9717eb905062.json) | Corrected verifier completed: model/egress0, saved-card/unavailable sources preserved, closed lifecycle and unreachable listener confirmed; partial physical checkpoint saved with outage deferred |

[Final checkpoint](../../../output/member-lan-checkpoints/a9d54114-f037-4661-bb08-9717eb905062/physical-acceptance-checkpoint.json),
[cleanup summary](../../../output/member-lan-checkpoints/a9d54114-f037-4661-bb08-9717eb905062/summary.json),
[host metadata](../../../output/member-lan-node/54b40282-31b1-4902-9353-0c68f7c3517a/shutdown-metadata.json).
The first attention record remains; the completed follow-up resolves cleanup verification without
relabeling unavailable answers or rewriting earlier observations. No full test rerun: operator-only
recording/verification changed, no app/config/build change.

Shutdown counts:2 sessions,12 stored messages,4 personal notes; assistant sources5 reviewed-card
and1 unavailable;15 lexical retrieval queries,0 model calls,0 denied egress attempts. Counts are
not unique-person/task counts. Probe conversations had been removed earlier, so these are remaining
rows at closure, not a cumulative workload ledger. Prompt/question/note text was not exported, so
the unavailable result cannot be attributed to a specific input from this metadata. No claim that
every request succeeded. The node had no model endpoint; unavailable is not model completion.

## Preserved physical observations

- iPhone/Safari opened the fresh node on the shared Wi-Fi (explicit user report).
- A1 signed in and received Tuesday2-4pm/free (explicit user report).
- B1 showed its community's facts/notes with no A1 history (explicit user report).
- A2 within CommunityA showed its own note with no A1 conversation (explicit user report).
- The owned node subsequently closed, and the local URL became unreachable (agent-observed cleanup).

The checkpoint retains the distinction between user reports and automated evidence. Known foreign-ID
authorization attacks were covered in earlier API tests, not physically performed on the iPhone.
Exact phone interaction times/device versions and cellular failover settings remain unknown. Internet
loss/local answers during loss/reconnection are explicitly deferred. Remote generation/recovery was
not exercised because this session had no remote model. Full P5 acceptance remains incomplete.

Ephemeral test data disappeared with database closure; the count checkpoint and prior UUID evidence
remain. Archived passwords/session tokens are no longer usable. Do not share archived credentials.
No appointment, calendar event, automatic reminder or future restart was created. Later work needs
a fresh bounded node/account sheet, planned interruption window and verified router procedure or a
separate test network. Never interpret a stopped/expired test node as internet-outage evidence.
No paid compute, training, new model download or external message; original spending/reservations
unchanged. Existing language-candidate work and other milestones may continue independently of this
deferred household-outage check.
