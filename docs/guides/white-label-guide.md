# White-label guide: run Afribit AI under your own name

For a community that wants its own assistant, with its own name, colour and logo, and a small "Powered by Afribit AI" line. You do not need to write code. You do need someone who can follow a checklist on a command line, or run a few commands on a server.

There is no software kit to install into your own app. What you reuse is **the app we run** plus **your community pack**, a folder with your settings and knowledge. Read the [community pack guide](community-pack-guide.md) for the knowledge and language side; this page is about how it looks and how to put it online. The rules about the "Powered by" line are in [BRANDING.md](../BRANDING.md) (a plain-language policy, not yet legally reviewed).

## What you can change

You change these in your pack, in the `branding` block of `pack.json`. The app reads them when it starts, so there is nothing to rebuild for them.

| Setting | What it does | Limits |
|---|---|---|
| `shortName` | The name in the app header and the browser tab | Required. Up to 24 characters |
| `tagline` | One line about the service (sidebar, and the description in search and link previews once you run the static step below) | Up to 120 characters |
| `welcomeTitle` | The big line on the first chat screen (instead of "Start with a little curiosity.") | Up to 80 characters; write it in your community's language |
| `welcomeText` | The sentence under it | Up to 220 characters |
| `composerPlaceholder` | The hint in the message box (instead of "Ask a Bitcoin question…") | Up to 60 characters |
| `accentColor` | The colour of buttons, highlights and focus rings | `#rrggbb`. Must be readable with white or near-black text (WCAG AA, 4.5:1). If it is not, `pack:validate` refuses it and tells you the numbers |
| `logo` | Your logo in the header, instead of the Afribit mark and name | A file in the pack's `brand/` folder: `.svg`, `.png` or `.webp`, 200 KB at most |
| `poweredBy` | The small attribution line | See below |

Your logo **replaces** the Afribit mark and name in the header, so put your name in it if you want the name visible. A logo about three times wider than tall (like a badge with the name next to a symbol) works well on a phone. If a logo cannot be loaded, the app shows your short name as text.

An SVG logo must be a plain picture. A file with scripts, event handlers (`onclick` and the like), `foreignObject`, or links to other sites is refused when the pack loads. If you draw it in Inkscape or Illustrator, "Save as plain SVG" and avoid embedded external images.

```json
"branding": {
  "shortName": "Reading Room",
  "tagline": "Your neighbourhood library guide",
  "accentColor": "#1f6f5c",
  "logo": "brand/logo.svg",
  "poweredBy": { "show": true }
}
```

A complete example is in [`packs/example-community-library`](../../packs/example-community-library) (look at `pack.json` and `brand/logo.svg`).

## "Powered by Afribit AI": what it is, and why we ask you to keep it

It is one small line at the bottom of the chat and settings screens, linking to the project's source code. It tells people what software their community's assistant runs on, and lets the next community find it. We built the engine in the open and we ask every deployment to keep the line. You may use it freely, you do not need to ask. You can turn it off in your pack (`"poweredBy": { "show": false }`) and nothing will stop you, but please keep a credit somewhere visible if you do.

You may change the wording (`label`, up to 60 characters, for example in your own language) and the link (`url`, https only). You may **not** use Afribit's name or logo to suggest that Afribit Africa runs or endorses your service. Read [BRANDING.md](../BRANDING.md).

## Set up your look, step by step

1. **Make your pack** (if you do not have one yet):

   ```bash
   pnpm install
   pnpm --filter @afribit/api pack:init ../../packs/my-community \
     --id my-community --name "My Community Guide" --short-name "My Community" \
     --community "My community" --domain health --label "health information" \
     --modes plain_en --contact you@example.org
   ```

   The new pack already has a `branding` block with the Powered-by line on, and an empty `brand/` folder.
2. **Add your logo**: copy it to `packs/my-community/brand/logo.svg` and add `"logo": "brand/logo.svg"` to `branding`.
3. **Choose your colour**: add `"accentColor": "#1f6f5c"` (use your own).
4. **Check it**:

   ```bash
   pnpm --filter @afribit/api pack:validate ../../packs/my-community
   ```

   It prints one `branding:` line saying what the app will do ("accent #1f6f5c with white text (6.0:1), logo brand/logo.svg"), and lists every problem in plain words.
5. **Look at it**: run the API with `COMMUNITY_PACK_DIR` pointing at your pack and the web app with `VITE_API_URL` pointing at the API (see the [README](../../README.md)); open `/app` on a phone-sized window.

## Put your own copy online

You need the engine in two parts: the **web app** (static files) and the **API** (a server with a database). Pick one of the two ways.

### Way 1: the node kit (one machine, easiest)

The [community node kit](../../deploy/community-node/README.md) runs the database, the model and the app on one machine you control, with HTTPS. Steps:

1. Put your pack folder under `packs/` in the repository on that machine.
2. In `deploy/community-node/.env` set `COMMUNITY_PACK=my-community` (the folder name), a `POSTGRES_PASSWORD`, a `JWT_SECRET` and your `NODE_HOSTNAME`. See the kit's README for the rest.
3. Run `./first-run.sh`. It builds the web app with your pack's name on the page title and the app manifest (that is the `COMMUNITY_PACK` build setting), loads your cards, and starts everything.
4. Open `https://<your NODE_HOSTNAME>/app`. Your name, colour and logo are there.
5. After changing the `branding` block later: `docker compose up -d --build web api`.

### Way 2: Vercel for the web app, your own server for the API

The API is a long-running server with a database and cannot run on Vercel's serverless functions.

1. **The API**, on any server that can run Docker or Node 22 and has Postgres with pgvector (a small cloud server is enough). Build it from `apps/api/Dockerfile`, copy your pack folder to the server, and set: `DATABASE_URL`, `JWT_SECRET` (a long random value; the server refuses to start without a real one in production), `COMMUNITY_PACK_DIR=<path to your pack>`, `CORS_ORIGIN=https://<your web address>`, and the model settings (`OPENROUTER_API_KEY` for a hosted model; see `.env.example`). Run `pnpm --filter @afribit/api db:migrate` and `pnpm --filter @afribit/api pack:install <your pack folder>` once. Put it behind HTTPS at an address such as `https://api.example.org`.
2. **The web app on Vercel**: import your fork of the repository, then set
   - Build command: `pnpm --filter @afribit/web brand ../../packs/my-community && pnpm --filter @afribit/web build`
   - Environment variable `VITE_API_URL=https://api.example.org` (no trailing slash)
   - Environment variable `VITE_SITE_URL=https://<your web address>`
3. Open `https://<your web address>/app`.

The `brand` step writes your name into the page title, the app manifest and the pre-rendered app page, which a static host cannot change when the page loads. Skip it and everything inside the app still shows your branding, but the browser tab before the app loads and the "install app" name will say Afribit AI. It edits two files in place (`apps/web/index.html`, `apps/web/public/manifest.webmanifest`); `git checkout` them to undo it on your own machine. It is safe to run twice. With no pack folder it does nothing.

**Your app icons:** replace `apps/web/public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` and `apps/web/public/brand/afribit-mark-icon.png` with your own files of the same names and sizes. The `brand` step cannot make icons for you.

## What is NOT white-labelable yet

Be aware of these before you launch.

- **Words in the app.** The buttons, settings and help text in `apps/web/src/locales` (`en.json`, `sw.json`, `sh.json`) are Afribit's wording, written for Bitcoin learners in Kenya. The Kiswahili and Sheng files are marked as awaiting review. Replace the strings your screens show with your own, and do not ship machine-translated wording to people who speak the language. There is no per-pack language file yet.
- **The public pages.** The home page (`/`), `/privacy` and `/community` are Afribit's own marketing and privacy text and mention Afribit and Bitcoin. The privacy notice is a draft and describes Afribit's service, not yours; you must write your own for your deployment. The simplest approach is to send people straight to `/app` (the PWA starts there).
- **Share previews.** Link previews (WhatsApp, social) use the Afribit share image. The title and description follow your pack once you run the `brand` step; the image does not.
- **App icons, as above.**
- **Starter questions and the Bitcoin-specific screens.** Starter questions come from your pack (`starter-questions.json`). If your pack's `domain.id` is not `bitcoin`, the app hides Afribit's built-in Bitcoin starter questions and the "someone asked for my seed phrase" shortcut, and shows only what your pack provides. A pack with `domain.id` `bitcoin` and no starter questions still gets Afribit's. The "Review" / contributor screens are written for Afribit's volunteer flow.
- **One pack per web app.** The web app does not choose a pack: it shows the server's default pack, and so does its branding. A server that serves several packs shows the default one's branding to the web app (other front ends can pass `?pack=<id>`).
- **Fixed text in the engine:** the safety checks (secret detection, output checks) and their English and Kiswahili patterns are shared by all packs. See the [pack guide](community-pack-guide.md#what-is-the-communitys-and-what-stays-in-the-engine).

If something here blocks you, open an issue and tell us what you needed; that is how this list gets shorter.
