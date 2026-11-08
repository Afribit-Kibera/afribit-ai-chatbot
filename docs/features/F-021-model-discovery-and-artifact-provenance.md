# F-021 — Model discovery and artifact provenance

**Status:** Built and tested locally; public metadata trial complete · **Roadmap:** Mesh proof P4 · **Date:** 26 October 2026.
Continue the authorized proof roadmap after reviewing QVAC. Discover models by intended task, not only
parameter count or a text-generation tag. Keep publisher claims separate from measured suitability.

A new CLI defaults to a catalog preview with no network. An explicit public-metadata mode requests only
Hugging Face model metadata, without tokens, weight downloads, inference, SDK installation or paid GPU
use. Record public repository revision, declared license, selected artifact names/sizes and reported
SHA-256, source links, input/source hashes and trial outcome. A missing hash is unknown, not verified.
All models remain inactive and pending runtime/language/human review; discovery cannot enable API policy.

The initial catalog covers QVAC's translation candidates, a base-model research checkpoint and biomedical
adapters, plus an upstream conversational baseline. It distinguishes software/model/data license claims
and blocks automatic use of research/adapter/specialist artifacts as the general chat showcase. It makes
no blanket licensing clearance, Sheng quality, RAM-fit, TEE or clinical claim.

Acceptance: strict catalogs/repository identity, no arbitrary URL fetch or credentials, bounded metadata
size/time and no redirect, safe artifact paths, immutable provenance/fingerprints, explicit missing
information, per-entry failures preserved and nonzero exit on incomplete metadata, no activation or
model execution. Test with local HTTP fixtures and record every suite/preview/metadata attempt.
