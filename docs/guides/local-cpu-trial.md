# Reproduce the verified local CPU trial

**27 October 2026.** This Windows x64 tool exercises real synthetic generation without rented compute.
The first model completed eight requests but was **held for answer-quality/safety problems**. Read the
[actual trial report](../evaluation/trials/2026-10-27-local-cpu.md), not just its completion count.

Preview without downloads or generation:

```powershell
pnpm --filter @afribit/api showcase:local-cpu
```

Acquire/recheck the pinned runtime/model and inspect the runtime flags, without generation:

```powershell
pnpm --filter @afribit/api showcase:local-cpu --acquire
```

Run the actual benchmark with those verified artifacts:

```powershell
pnpm --filter @afribit/api showcase:local-cpu --acquire --execute
```

Every invocation creates a UUID trial before work. Fresh acquisition transfers 853,129,982 bytes plus
HTTP overhead; extracted runtime files need additional disk. The model is approximately 834 MB on
disk, not a guarantee of RAM consumption. Cached files are rehashed, not silently trusted; cached
verification reports zero transferred bytes. A mismatch refuses use and preserves evidence instead of
overwriting an unexpected file. Failed partial downloads remain for investigation, with no automatic
recursive deletion. Ensure sufficient local disk/connectivity before requesting acquisition.

The tool pins official [llama.cpp b11669](https://github.com/ggml-org/llama.cpp/releases/tag/b11669) CPU
binaries and an exact upstream [Qwen GGUF](https://huggingface.co/ggml-org/Qwen3.5-0.8B-GGUF) revision/file.
It checks published byte counts and SHA-256, including a read-back of written files. Redirects are
bounded and limited to the known HTTPS publisher/CDN hosts, with no credentials. This verifies byte
identity against publisher declarations, not absence of vulnerabilities or a reproducible build audit.
No QVAC SDK, Python dependency, driver, global install or PATH modification is performed.

ZIP entries are checked before native PowerShell extraction: no absolute/parent paths, alternate data
streams, ambiguous trailing segments or Unix symlink entries. A fresh per-trial runtime directory and
the model cache live under `output`; downloads/executables are git-ignored. Other evidence remains
available. Nothing is deleted automatically when the trial ends.

Generation requires at least 3 GB currently free RAM, checked before and after acquisition. That is a
protective threshold, not a tested universal machine requirement. The server is CPU-only, six threads,
one slot, 16,384 context tokens, thinking disabled, no web UI, loopback bind and offline model loading.
This is a process-local trial, not a multi-user deployment. A random temporary key goes only to the
server environment/request headers; provider/account credentials are omitted from its environment.
Missing/wrong key and authenticated alias checks precede benchmark dispatch.

The gateway uses a zero-monetary local route, strict bounds, no fallback and the existing four-question
synthetic benchmark. It does not read learner data or run live retrieval, training, account memory or
the normal product's safety post-filters. The long product prompt is deliberately contrasted with a
bare instruction; a short-prompt variant remains a separate comparison. Actual word count is not
enforced; output tokens and durations are bounded. Returned text must receive separate human review.

Each execution saves acquisition sources/digests, revision/source hash, hardware, server settings/log,
plan, per-attempt outputs, timing/usage and anonymous review sheets. Windows peak process working set
is recorded separately; it excludes GPU VRAM and is not whole-machine RAM. Trial metadata excludes raw
prompts/key material; raw artifacts contain synthetic outputs. Keep operator mappings separate from
blind reviewer files and inspect artifacts before publication.

The tool aborts on its execution deadline and attempts to stop only the child process it created,
recording confirmed exit. SIGKILL, parent crash or host failure cannot guarantee cleanup; use the
recorded owned PID for manual investigation rather than stopping unrelated processes. A real rental
still needs its own [watchdog/supervision and billing gates](rental-watchdog.md). Paid provider charges
were zero in this local trial; local power, storage and internet expenses were not measured.

Controls: `pnpm --filter @afribit/api test:artifacts` tests exact size/digest/cache handling, origin and
redirect rejection, bad payloads and actual Windows ZIP path refusal. It uses synthetic fixtures and
records each suite/case. On non-Windows systems, the native archive case is explicitly unexercised.
