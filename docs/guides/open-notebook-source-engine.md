# Open Notebook behind Afribit AI

6 November 2026. First integration: private notebooks, permitted text/Markdown imports, source
reading and local-only source-grounded chat. Not a public deployment or an encrypted personal vault.

## What runs where

The Afribit frontend calls **Afribit's API**, never Open Notebook directly. Afribit authenticates
the member, checks community membership and owns the account/notebook mapping in PostgreSQL.
Open Notebook holds source text in its own private store. Its shared API password never reaches
the browser. Personal source notebooks are not approved community knowledge or a training corpus.

The adapter uses Open Notebook for source management; inference stays in the Afribit gateway.
This preserves community language packs, Sheng guidance, compute controls and processing policy.
Text imports explicitly disable embeddings, transformations and asynchronous processing. No
model-provider key is installed in the source-engine containers. The current excerpt baseline
selects bounded lexical windows from up to six sources, up to4,000 characters each and12,000 total; it is not
semantic retrieval across a whole library. Long documents can contain relevant passages beyond
this window. Validate retrieval/citations before promising complete-book answers.

## Private local setup

Use `infra/open-notebook.compose.yml` with a **private ignored env file** containing:

```dotenv
OPEN_NOTEBOOK_IMAGE=lfnovo/open_notebook@sha256:e4e18f12653df5bf48674b7b187c4252be52238b4d706330fd30d9b177b95812
SURREALDB_IMAGE=surrealdb/surrealdb@sha256:e5d7387e3727bbe2f7cd6d869e48cd34777272258572ead37c9656b25f745723
SOURCE_GATEWAY_IMAGE=alpine/socat@sha256:5f275aa1b6e9889c851f61097142ee050fc6ac4615b4ea64ac1f2b0e81ff8d7f
SURREAL_PASSWORD=<generate a unique strong secret>
OPEN_NOTEBOOK_PASSWORD=<generate a different strong secret>
OPEN_NOTEBOOK_ENCRYPTION_KEY=<generate a different strong secret>
```

These are the image digests exercised in the dated local proof, not a guarantee about future tags.
Do not copy placeholder secrets into a live service. The local proof configuration is in ignored
`output/open-notebook-runtime/runtime.env`. Do not print it or include it in a shared deliverable.

From the repository root:

```powershell
docker compose --project-name afribit-study-proof --env-file output/open-notebook-runtime/runtime.env -f infra/open-notebook.compose.yml up -d
```

The database and source engine are on an internal Docker network. A fixed-destination TCP relay
on a second network publishes **only127.0.0.1:5055**; no source-engine UI, database or LAN port is
published. Docker Desktop did not publish a port attached only to the internal network during
the first attempt; the relay resolves that without giving the source engine outbound access.

For the normal Afribit API, set `OPEN_NOTEBOOK_API_URL=http://127.0.0.1:5055` and the same API
password through its private environment, then apply repository migrations including
`025_private_study_notebooks.sql` to the **intended database**. No existing application database
was migrated in the proof: all Afribit SQL tests used a fresh PGlite instance. Run the normal API
and frontend processes only after configuring that database. Do not expose the source service
as a substitute for the authenticated Afribit application.

To stop just the proof's three containers, preserving their volumes:

```powershell
docker compose --project-name afribit-study-proof --env-file output/open-notebook-runtime/runtime.env -f infra/open-notebook.compose.yml stop
```

Do not remove unrelated containers/volumes or reset a shared database. The user controls when to
make a persistent pilot deployment; Proxmox/domain/TLS qualification is still separate.

## Source lifecycle and permissions

- Signed-in members create notebooks and add text they have permission to use. Current imports
  accept pasted text or `.txt`/`.md` files, up to20,000 characters per source. No URL fetching,
  PDF/OCR, audio transcription or automatic cloud embeddings in this slice.
- Every source/list/read/import/delete checks notebook ownership and the selected community.
  Source association is verified before reading text into a prompt. Untrusted text is inserted
  as user-level context, never promoted into system instructions or shared facts.
- A notebook conversation stays bound to its original notebook in the database. Local-only
  processing is sticky, including when a resumed request omits the notebook ID. Hosted inference,
  remote fallback and remote embeddings cannot receive that context through this path.
- If local inference is unavailable, the app labels the response unavailable; reading sources is
  still possible while the source service is reachable. A cached app shell is not offline inference.
- Notebook erasure remains available after membership revocation, with owner authorization.
  Deletion requests upstream deletion of exclusive sources. Existing chat answers are a separate
  deletion action. Account deletion refuses while notebook mappings remain so source text cannot
  silently become orphaned by a foreign-key cascade. Coordinated erasure/backups still need
  production operational procedures; this is not cryptographic erasure.

## Phone storage and passkeys

The current account system uses existing member authentication. Browser session credentials and
in-memory account conversations are not an encrypted vault; guest history still uses the existing
device-storage behavior. New onboarding can remember non-sensitive learning preferences, scoped
by account/community. It does not automatically copy raw notebook text into local storage.

Passkeys are **authentication**. A claim that only a learner can decrypt stored context requires
client-side encryption and key management, not merely a successful WebAuthn sign-in. A future
design may use a supported WebAuthn PRF extension to protect a randomly generated vault key,
with explicit recovery, device enrollment, revocation and compatibility tests. This has not been
implemented. HTTPS alone protects transport, not plaintext from an ordinary host administrator.
Sources: [WebAuthn](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API),
[PRF extension](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/WebAuthn_extensions#prf).

Any decrypted material handed to an ordinary local model becomes visible to that processing
environment during inference. Future attested confidential execution or strictly on-device
processing needs separate evidence. Do not describe this build as passkey-only access to plaintext,
host-proof confidentiality, TEE-backed processing or end-to-end encrypted AI inference.

## Verification and upstream references

Unit checks: `pnpm --filter @afribit/api test:notebooks`. Browser UTF-8 limits:
`pnpm --filter @afribit/web test`. Real source-engine proof, with the private runtime above:

```powershell
pnpm --filter @afribit/api exec tsx src/notebooks/notebookLiveProof.ts
```

That command creates fictional members in fresh PGlite, exercises the real upstream API behind
Afribit's routes, and deletes its created sources/notebooks. It does not connect the configured
PostgreSQL pool to its real database. Its inference provider is a **synthetic fixture**, not an
LLM, and it denies every outbound fetch except the loopback source engine. Recorded results live
in trial journals and the green design folder. Never present that fixture response as a language
or comprehension benchmark. Image/video design calls are separate documented trials.

API contract inspected at upstream commit
[`5e285b7a2e435895c4ee99ad7e4b8d2af64c3239`](https://github.com/lfnovo/open-notebook/tree/5e285b7a2e435895c4ee99ad7e4b8d2af64c3239).
See [Open Notebook](https://github.com/lfnovo/open-notebook), its
[MIT license](https://github.com/lfnovo/open-notebook/blob/main/LICENSE),
[source routes](https://github.com/lfnovo/open-notebook/blob/5e285b7a2e435895c4ee99ad7e4b8d2af64c3239/api/routers/sources.py)
and [password middleware](https://github.com/lfnovo/open-notebook/blob/5e285b7a2e435895c4ee99ad7e4b8d2af64c3239/api/auth.py).
