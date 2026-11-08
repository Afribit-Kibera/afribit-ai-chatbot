# F-022 — Verified portable runtime and an actual local inference trial

**Status:** Built; real CPU execution documented, model quality held · **Roadmap:** Mesh proof P4 · **Date:** 27 October 2026.
Continue from public metadata to a synthetic real-model trial on the available laptop, without renting
compute. Hardware inspection reports an i7-13650HX, about 16 GB RAM and an RTX 3050 6 GB; this first run
uses CPU only. Docker is unavailable and no Ollama/QVAC/llama-server command is installed. This machine
does not establish the minimum affordable community-box specification.

Use a portable, pinned official llama.cpp Windows CPU release and a pinned upstream Qwen3.5-0.8B GGUF
instruction checkpoint. Verify download byte counts and published SHA-256 before extraction/loading.
Keep files in an isolated output directory; no global install, PATH change or real learner data.
Safe extraction, bounded downloads, loopback-only serving, temporary generated authentication, CPU/thread/
context/time limits, owned-process cleanup and documented outcomes are required.

Reuse the existing gateway/local provider and F-019 synthetic bare/supplied-context comparison. No model
fallback, training, remote inference, application DB or production configuration change. Record actual
outputs, first-token/full times, reported usage, hardware/runtime settings and process peak working set.
Test missing/wrong credentials before valid generation. Retain failures and distinguish a passing
transport trial from unmeasured human language quality, actual retrieval, Mesh or host confidentiality.

Acceptance: checksum/length/redirect/path refusal cases; synthetic actual generation with scoped model,
authentication, no rented provider, evidence and bounded cleanup. Mark unsupported runtime or failed
generation honestly rather than substituting a mock success. All trial invocations are documented.

Actual result: eight technical completions, but inadequate internal language/safety outputs. No learner
release or quality approval. See the [trial report](../evaluation/trials/2026-10-27-local-cpu.md) and
[operator guide](../guides/local-cpu-trial.md).
