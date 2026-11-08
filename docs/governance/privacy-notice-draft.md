# What happens to your questions ? plain-language notice (DRAFT)

> **Draft, updated 8 November 2026.** Community reviewers must check the English wording and prepare
> Kiswahili/Sheng versions. Legal and operational review remain pending before participant release.
> This describes the home Proxmox education staging service; other deployments need their own notice.

## The short version

- This education pilot requires a community invitation and account. Other members cannot browse
  your conversations, personal notebooks, notes or saved learning progress through the app.
- The community server operator can access stored plaintext. We have **not** implemented a
  phone-key encrypted vault, passkeys or a hardware enclave that hides your data from that operator.
- Never enter recovery words, private keys, PINs or passwords. The app checks for recognizable
  secrets and refuses detected messages; detection is not a guarantee that every secret is found.
- AI can be wrong. Check supporting material and ask a trusted educator when unsure.
  This is education, not a recommendation to invest or a service for handling your money.

## What we keep

| Information | Purpose and handling |
|---|---|
| Account email and password hash | Community sign-in. Staff manage membership and review roles. Passwords are not intentionally stored as plaintext. |
| Questions and answers | Conversation history under the deployment's configured retention setting. Server storage and browser history settings must be explained before enrollment; this draft does not promise a universal 30-day period. |
| Personal source notebooks | Text you deliberately import, plus titles and ownership records. Stored in the community-hosted source service with account/community access checks. Only import material you have permission to use. |
| Learning notes and progress | Notes you deliberately save and your place in a published chapter, scoped to your account and community. Study notes are separate from AI memory and are not automatically inserted into prompts. |
| Optional AI memory | Separately enabled personal memory can be retrieved for your questions. Each note's remote permission is separate; local-only notes must not be routed to a hosted model. |
| Operational evidence | Service, security, compute and trial records used to operate and evaluate the system. Do not assume these records are anonymous or that deleting a chat removes all logs or backups. |

We do not sell your information or automatically train model weights on your chats, sources or notes.
Importing a source is not model training. Explicit proposals to share community knowledge require a
separate review process; they do not automatically publish a private notebook or conversation.

## Where processing happens

The current private staging configuration uses the home Proxmox server and a local model. Hosted
model allowance is zero. Selected personal notebook context is locked to local model processing.
This does not mean storage is confined to your phone or unreadable to the server operator.

For a future public pilot behind Cloudflare, browser traffic crosses the internet and Cloudflare
terminates HTTPS. Cloudflare and the server operator are part of the trust boundary. Tailscale
encrypts the hop to the origin. A local model does not make this an end-to-end encrypted service.

Other deployments may offer an optional hosted provider for heavy questions. They must disclose the
provider, what is sent and the applicable policy before enabling that route. Removing names is not
a guarantee of anonymity. The current private staging service does not enable that route.

Voice input is optional. Browser/device speech services may process audio outside the community;
the app must disclose that and does not promise private or offline speech. Typing remains available.

## Your choices and limits

Delete chats using the conversation controls, remove imported notebooks/sources in My library, and
remove study notes in My space. Optional AI memory has its own controls. Ask the operator to delete
your account if no account-deletion control is available. These actions do not recall earlier answers, downloaded material
or copies already shared and approved elsewhere; reviewed contributions have separate withdrawal
handling. Contact the operator if a deletion or access request cannot be completed through the app.

**Before inviting participants**, the operator must publish actual retention periods, log handling,
backup retention and erasure procedures and verify a restore. Current evidence is an access-controlled
local database dump, not a proven encrypted backup system. We do not claim that deleted information
disappears from all backups within 14 days. These unresolved details keep this notice in draft.

## Questions or worries

Contact **eddie@afribit.africa** to ask about access, correction, deletion, an unsafe answer or privacy.
Do not include recovery words, passwords or unnecessary personal data in that message.

Maintainers: keep this notice aligned with [data stewardship](data-stewardship.md), the
[personal memory guide](../guides/personal-memory.md) and
[the pilot release gates](../guides/proxmox-education-pilot.md).
