# Branding policy: "Powered by Afribit AI"

> **Plain-language policy, not yet legally reviewed.** It says what we ask and what we allow, in ordinary words. It does not change the licences in [LICENSE](../LICENSE) and [LICENSE-CONTENT](../LICENSE-CONTENT) or the trademark item in [NOTICE](../NOTICE). Where this page and those files differ, they win. We will have it reviewed before we rely on it.

## What you may do

- **Use the "Powered by Afribit AI" line and badge.** Any deployment of this engine may show it. You do not need to ask.
- **Run the engine under your own name.** Give it your name, colours and logo through the `branding` block of your pack ([white-label guide](guides/white-label-guide.md)). The code is AGPL-3.0-only and the content CC BY-SA 4.0. Follow the applicable source-sharing and attribution terms.

## What we ask

- **Please keep the "Powered by Afribit AI" line.** The engine is built and paid for in the open by a small team and its community reviewers. The line is how a person using your service can find the source, check what it does, and how the next community finds it. It is small, sits at the bottom of the chat and settings screens, and links to the project.
- Keep the attribution that the licences already require (NOTICE; "Afribit Africa and the Afribit AI contributors, CC BY-SA 4.0" for the content).

You *can* switch the line off (`"poweredBy": { "show": false }` in your pack): the code does not stop you and the licence does not forbid it. The Kibera pack does, because it is Afribit's own service. If you switch it off, please keep a visible credit somewhere else, such as an "About" page.

The requested badge is optional. It does not replace the applicable license/source notices, and this
branding policy adds no condition to the software license. Modified network deployments must provide
the corresponding source required by AGPL, whether or not they show the badge.

## What you may not do

- **Do not use the names or logos of Afribit or Afribit AI to suggest that your deployment is run, endorsed or checked by Afribit Africa.** That includes using the Afribit logo as your own, naming your service "Afribit AI" or something easily mistaken for it, or putting Afribit's name in your page title, icons or share images as if it were yours. The "Powered by" line says what software you use; it does not say who runs the service, and it must not be made to look as if it does.
- Do not change the line's wording to claim more than it does ("Official Afribit partner", "Approved by Afribit"). The `label` setting is for translation or small wording changes such as "Inatumia Afribit AI".
- Do not present answers as reviewed by Afribit's reviewers unless they were. Your community's reviewers answer for your pack.

## Where this shows up in the code

| What | Where |
|---|---|
| The setting | `branding.poweredBy` in `pack.json`: `show` (default true), `label` (default "Powered by Afribit AI"), `url` (default the project repository; https only) |
| The line in the app | `apps/web/src/components/PoweredBy.tsx`, shown on the chat and settings screens |
| Afribit's own marks | `logo/` and `apps/web/public/brand/` are not licensed for reuse (NOTICE, item 4) |

Questions, or a use you are unsure about: open an issue on the project repository.
