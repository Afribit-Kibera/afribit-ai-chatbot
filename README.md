# Afribit AI

Community-controlled AI learning workspaces, starting with Bitcoin education in Afribit Kibera.
Learners ask questions in English, Kiswahili or community Sheng, bring permitted source material,
and study one idea at a time. Community operators curate sources and teaching guidance; individual
accounts keep their notebooks, conversations and study progress separate.

[Application license: AGPL-3.0-only](LICENSE) ? [Content: CC BY-SA 4.0](LICENSE-CONTENT) ?
[Contributing](CONTRIBUTING.md) ? [Roadmap](ROADMAP.md) ? [Security](SECURITY.md)

## Deployment status

**8 November 2026: the new education workspace is privately staged, not open for participant enrollment.**

| Link | What it serves |
|---|---|
| [ai.afribit.africa/app/](https://ai.afribit.africa/app/) | Existing public demo frontend; not the new learning release. |
| [Public API health](https://ai-api.afribit.africa/health) | Existing API responds; new membership and learning-library routes are not deployed there. |
| New community learning app | Home Proxmox staging, accessible only through the operator's private network and test accounts. |

Do not send learners to the old demo expecting the new privacy and notebook features.
Public HTTPS routing, faster inference, reviewed short Bitcoin lessons and operational acceptance
remain open. [Release evidence](docs/evaluation/trials/2026-11-08-open-source-release.md) ?
[Proxmox deployment guide](docs/guides/proxmox-education-pilot.md).

## What the application does

- **Learn:** ask a question, request a simpler explanation or follow a published chapter in small steps.
- **My library:** create personal notebooks, import permitted text and read the passages behind an answer.
- **My space:** save deliberate study notes and return to an account's own learning position.
- **AI Studio:** authorized operators propose sources, language guidance and chapters. Independent review
  controls publication; trainers do not browse members' private notebooks or automatically train weights.
- **Community packs:** configure languages, knowledge, voice and branding for another community.
- **Compute coordination:** keep private context local by policy, use reviewed cards where appropriate,
  and account for separately permitted remote processing. Routing is distinct from model training.

The green app includes onboarding, an introduction, source-aware chat, streaming/Stop, text attachment
and paste. Optional browser dictation has a separate disclosure and is unavailable for local-only
processing. Work and Development are reserved for later releases.

## Privacy and limits

Membership and ownership checks separate accounts and communities inside the application. They do
not hide plaintext from the server operator. The staged service has no hosted-model allowance;
selected personal notebook context is local-only. A public service behind Cloudflare also trusts
Cloudflare's HTTPS termination. Passkey vaults, end-to-end encrypted storage and confidential GPU
attestation are not implemented.

No automatic model-weight training uses chats or notebooks. Adding sources is retrieval/context,
not fine-tuning. Model weights are separate dependencies with their own licenses and quality limits.
The source engine uses [Open Notebook](https://github.com/lfnovo/open-notebook) behind Afribit's
account checks; its dashboard and database are not exposed to learners.

The current home CPU test produced one source-grounded answer in179.2 seconds. That proves a narrow
functional path, not acceptable multi-user performance or teaching quality. Earlier network tests
proved approved-card access and account separation on an isolated Wi-Fi network, not offline model
inference. [Detailed trials](docs/evaluation/trials/2026-11-06-community-learning-release.md).

Never enter recovery words, private keys, PINs or passwords. AI can be wrong. This is education,
not investment advice or a wallet. [Draft privacy notice](docs/governance/privacy-notice-draft.md).

## Develop locally

Requires Node.js22+, pnpm11.25.0, and Docker with Compose for Postgres/pgvector.

```sh
git clone https://github.com/Afribit-Kibera/afribit-ai-chatbot.git
cd afribit-ai-chatbot
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev:api
# In another terminal:
pnpm dev:web
```

Development serves the API on localhost:3001 and the web app on localhost:5173. Configure inference
and account invitations before testing model answers or private notebooks; the database setup alone
does not provision a model. No API key or GPU rental is required for the automated tests below.
See [community node setup](deploy/community-node/README.md),
[Open Notebook setup](docs/guides/open-notebook-source-engine.md) and
[community packs](docs/guides/community-pack-guide.md). Do not promote imported teaching material
without the required community review. Keep `.env`, operator tokens, learner exports and model
weights out of Git.

## Validation

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @afribit/web test:e2e
```

GitHub Actions is currently disabled for this repository. PRs record local commands, results and
limitations; an absent CI run is not a passing check. Live model evaluations and rentals require a
separate spending decision. [Evidence log](docs/book/test-and-evaluation-log.md).

## Licensing and stewardship

Afribit Africa maintains the application. Original application code is **AGPL-3.0-only**: people can
use, modify and sell services, and modified versions offered over a network must offer their
corresponding source under the license. [License scope and history](docs/governance/licensing.md).

Original teaching content and documentation use **CC BY-SA 4.0**. Third-party software, data, fonts,
models and retained notices keep their own terms. The Afribit name and logos do not grant an
endorsement or trademark license. [NOTICE](NOTICE) lists the boundaries and credits.

[Report a bug](https://github.com/Afribit-Kibera/afribit-ai-chatbot/issues) or see
[CONTRIBUTING.md](CONTRIBUTING.md) for code and community-language review.
