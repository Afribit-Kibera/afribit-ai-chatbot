# Voice Lab guide

For the people who decide how the assistant talks to learners. You do not need to be technical. You need to know the language, and to be willing to read a lot of answers.

The Voice Lab is a web page, `/voice`, where you change the assistant's wording and **try an answer straight away**, without a developer and without a redeploy. It is built on the [community pack](community-pack-guide.md): everything that makes the assistant sound like your community already lives in text files, and this page edits those files safely.

## Logging in

Open `/voice` on your community's service (for example `https://your-service/voice`) and log in with a **reviewer** or **administrator** account, the same login as the [review page](reviewer-guide.md). If the server runs several packs, a pack picker appears at the top (or open `/voice?pack=<id>`). Works on a phone, though editing a long guide is easier on a computer.

If the page says it cannot be found, the Voice Lab is switched off on that server; see "For the person who runs the server" below.

## Three tasks, one change at a time

- **Teach the AI.** Choose a language and write its instructions. Your edits stay in this browser tab as drafts until you save. The editor shows what the file does and its size against the 20 KB limit. This edits guidance and messages; it does not train model weights.
- **Try an answer.** Type a question and press **Try this question**. The test uses all your unsaved files together. **Answer options** lets you change the explanation level or test the short instructions; neither changes the live service. **Knowledge and test details** shows the cards found and the instructions sent to the model.
- **Compare answers.** Ask the same question with the saved wording and your drafts. This makes two model calls. Read the answers together before deciding whether a change helped.

**More to edit** opens the other files, grouped as *How the AI speaks*, *Messages people see*, *Safety rules* and *Advanced settings*. Search by a file's name or path. **Changed** means the saved wording differs from the original. **Unsaved** means a change exists only in this tab. **Administrator only** means a reviewer can read the file but cannot change it.

The **Your changes** panel has **Change instructions**, **Previous versions**, **More details** and **Save changes**. On a phone, open **Your instructions and changes** to see it. Saving asks you to confirm because the selected file takes effect for everyone immediately. Other files remain drafts. Changing tasks or languages keeps your drafts. Refreshing or leaving the page loses them; switching community or signing out asks before discarding unsaved changes.

Tests do not save a chat or your draft wording. Each test is a real model call, counted in the service's usage meter, with a limit of 10 tests a minute. If you edit the question, instructions or options after a test, the page marks the old answer so you know to test again.

## Which file changes which answer

The assistant has two ways of being instructed, and the live service uses **one** of them:

| Prompt | What it is | In use today? |
|---|---|---|
| **Full prompt** | The long instructions: identity, safety rules, the full style guide for the mode, examples | **Yes**, unless the operator set `PROMPT_MODE=compact` |
| **Compact prompt** | A short version for small models | Only if `PROMPT_MODE=compact` |
| **Serve prompt**, **Waiter**, **Chef** | The optional "restaurant" pipeline with helper models | Only if `CHAT_PIPELINE=restaurant` |

Each file in the page is tagged with where it is used. So:

- To change how Sheng sounds **today**, edit **Sheng guidance**, the *Example conversations*, or the *General communication guide*. A `.compact` file changes nothing on a service using the full prompt. You can still test it: choose **Short instructions** under **Answer options**. The page marks which instructions the live service uses and warns when a file belongs to an inactive pipeline.
- *Fixed messages* (the warning when someone pastes a password, the message when an answer is withheld, "service unavailable", the push notification) are shown exactly as written; the model never rewrites them.
- *Clean-up rules* (`postprocess.json`) are find-and-replace rules applied to every answer. *Search synonyms* change which cards are found, not how the assistant speaks.

## A good way to work

1. Open the mode's guide and read what is there. Change **one thing at a time**.
2. Open **Try an answer** and type a real question the way a learner would. The language you chose stays selected.
3. Press **Try this question**. Read the answer aloud. Is it how a person would say it? Check the facts against the cards under **Knowledge and test details**.
4. Open **Compare answers** to see whether you improved it. One answer proves little: models vary from one try to the next, so try three or four different questions, including a hard one (a scam, a failed payment).
5. Open **Instructions sent to the model** within the test details if the answer surprised you. If the model ignored your instruction, it may be buried or contradicted by another file.
6. Press **Save changes** when you are happy, then read the confirmation. The selected file goes live for every learner at once. Write down in your own notes what you changed and why; the page keeps who and when, not why.

Do not machine-generate Sheng or Kiswahili wording and paste it in. The guide the model reads should be written by people who speak it, and reviewed by a second person. This page makes a change fast; it does not make it right.

## What is safe to change, and what is not

**Safe for a reviewer:** the mode guides, the example conversations, the general communication guide, the fixed messages (keep their meaning: for example the password warning must still say that nobody legitimate will ask for these), starter questions, the identity lines and vocabulary headings.

**Only an administrator:** the five files that decide what the assistant must never do or what happens to a learner's private details:

- `prompts/safety.full.md` and `prompts/safety.compact.md` (the safety rules)
- `prompts/serve-safety.md` (safety rules of the optional pipeline)
- `prompts/ticket.md` (the waiter's instructions, which also strip personal details)
- `prompts/chef.md` (the chef's instructions)

A reviewer can read them but not save, revert or even try a draft of them.

**Take care:** the clean-up rules apply to every answer and a careless rule can delete or change a warning. The page refuses rules that are invalid, too long, or so slow that they could freeze the service, but it cannot tell whether a rule is *wise*. Prefer fixing the guide over adding a rule.

**What the page can never change:** `pack.json` (the manifest), the knowledge cards, the evaluation set, and anything outside the list. Cards are changed on the [review page](reviewer-guide.md). The engine's own safety nets (the secret detector and the output safety check) also stay in the code.

## Placeholders

In the `prompts/` files you can write `{{name}}`, `{{community}}`, `{{domain}}` and `{{contact}}`; they are filled in from the pack's manifest. Use exactly those, with no spaces inside the braces. The editor shows them as buttons that insert them where your cursor is. Language guides and JSON files do not use placeholders.

## If a save is refused

The page checks the whole pack with your change applied before it saves anything, and tells you every reason it refuses. Typical reasons: the text is over 20 KB; a JSON file has a missing comma; a placeholder is misspelled; example conversations are not in question-and-answer pairs; starter questions name a mode the pack does not have. The old wording stays live when a save is refused.

## History, revert and the reviewed baseline

- The pack that was installed with the server, reviewed and kept in git, is the **baseline**. Your saves are **overrides**, kept in a separate folder on the server. They do not change git.
- **More details** shows the original wording and where the file is used. **Use original wording** removes your override, so the reviewed text is served again. Your text stays in Previous versions.
- **Previous versions** lists saved versions with who saved them and when. **Use this version** puts an old one back after confirmation. It is saved as a new version and checked like any save.
- The server also keeps an audit record of each save and revert (who, which file, when). It does not keep what you were thinking: write a change note elsewhere.

## Making an edit permanent

An override lives only on that server. To make your tested wording part of the reviewed pack, so other communities and new installs get it, the operator exports it:

```bash
pnpm --filter @afribit/api pack:overrides-export kibera-bitcoin ./exported
```

This writes the edited files into `./exported` using the pack's own folder layout and tells you which differ from the pack. Copy them over `packs/kibera-bitcoin/`, review with `git diff`, commit, and redeploy. After that the exported overrides can be deleted: the baseline now matches them. (Without this step, a server rebuilt from git still has the old baseline plus whatever is in the overrides folder, so **back up that folder**.)

## For the person who runs the server

The Voice Lab is **off** unless you set one environment variable:

```bash
COMMUNITY_PACK_OVERRIDES_DIR=/data/overrides
```

and give that path a **persistent volume** that survives redeploys (Docker: a named volume or a bind mount; it must be writable by the API's user). In the community node kit set `VOICE_LAB=true` in `.env` (see [the node kit](../../deploy/community-node/README.md)). Unset, the routes do not exist and the server behaves exactly as without this feature.

Behind a reverse proxy, send `/voice*` (the page) as well as `/api/*` to the API, as you already do for `/review*`.

The frontend source is in `apps/api/voice`, built with React, Vite, Tailwind and Radix Dialog. Brand fonts and assets are served by the API; no external font service is required. The normal API build and Docker image include it:

```bash
pnpm --filter @afribit/api build
```

For frontend development, run the API on port 3001 and `pnpm --filter @afribit/api dev:voice` in a second terminal. Open `http://127.0.0.1:5186/voice/`; `/api` requests are proxied to the local API. To rebuild only the page, use `pnpm --filter @afribit/api build:voice`. An unbuilt development checkout can still serve the original plain page as a fallback.

What to know:

- **One process.** A save reloads the pack inside the running server. If you ever run several API instances behind a load balancer, each keeps its own copy until restarted or until `POST /api/v1/voice/reload` (administrator) is called on each; the overrides folder would also have to be shared. The reference deployment runs one instance.
- **Startup is safe.** If someone hand-edits an override file and breaks it, the server still starts and serves the reviewed baseline, and logs that the overrides were ignored. A bad *save* through the page is refused, never applied.
- **Requests in flight** finish with the wording they started with; the next request gets the new wording.
- **Files in the folder:** `<dir>/<packId>/<same path as in the pack>` for each override, and `<dir>/.history/<packId>/<UTC time>-<user id>-<flattened path>` for each saved version (the newest 100 per file are kept). Symbolic links, folders and files over 20 KB in that folder are ignored.
- **Cost:** *Try it* makes real model calls (two for Compare), limited to 10 requests a minute per person. They are recorded in the usage meter like any call.
- **Audit:** `audit_logs` rows with action `voice:edit` (a save or restore) or `voice:revert`, entity `pack_file`, and details `{ pack, path }`.

## What has been verified, and what has not

Built and tested (`pnpm --filter @afribit/api test:voice`): which files can be edited and by whom, traversal and path rejection, size/JSON/placeholder/pattern checks, that a change which would break the pack is refused and the old pack keeps serving, atomic writes, history and restore, reload that keeps the old pack on failure, requests in flight keeping their pack, and that with no overrides the prompts are byte-identical to before. The earlier plain frontend was also exercised on a throwaway database with the real server and model calls.

The rebuilt React frontend was checked in a real browser against isolated local API fixtures using the Kibera and example library pack files. Checks covered login, editing, preview and comparison, save/history/restore/revert, reviewer restrictions, unsaved drafts, server errors, offline recovery, expired sessions, community switching during a pending test, keyboard focus, reduced motion and 320 to 1487 px layouts. These browser fixtures simulate answers and saves; they do not verify a live model or deployment. Automated accessibility scans reported no violations, with modal focus also checked directly. Run `pnpm --filter @afribit/api test:voice-ui-assets` after building to verify compiled assets, self-hosted fonts, CSP and rejection of asset path traversal.

Not verified: more than two people editing at the same moment (changes are applied one at a time per pack, but there is no "someone else changed this file" warning yet: the last save wins, and History keeps the other); several API instances; the rebuilt frontend on a live deployment; a second community using the page with a real model; whether any particular wording is *good*. That is what you are here to judge.
