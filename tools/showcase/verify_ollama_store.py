"""Read-only, offline verification of a rented host's Ollama store. Never pulls a model."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import math
import os
from pathlib import Path
import re
import stat
import time
import uuid

MAX_METADATA = 2 * 1024 * 1024
MAX_BLOBS = 32
MAX_TOTAL = 24_000_000_000
DIGEST = re.compile(r"sha256:[a-f0-9]{64}\Z")
MODEL = re.compile(r"gemma4:(?:e4b-it-q4_K_M|26b-a4b-it-q4_K_M)\Z")


def regular(path):
    """Refuse links/junctions in every existing path component."""
    for p in [path, *path.parents]:
        s = p.lstat()
        if stat.S_ISLNK(s.st_mode) or getattr(p, "is_junction", lambda: False)():
            raise ValueError("linked-path")
    if not stat.S_ISREG(path.lstat().st_mode):
        raise ValueError("not-regular-file")


def metadata(path):
    regular(path)
    if path.stat().st_size > MAX_METADATA:
        raise ValueError("metadata-bound")
    with path.open("rb") as f:
        raw = f.read(MAX_METADATA + 1)
    if len(raw) > MAX_METADATA:
        raise ValueError("metadata-bound")
    return raw, json.loads(raw)


def descriptors(manifest):
    if not isinstance(manifest, dict) or not isinstance(manifest.get("layers"), list):
        raise ValueError("manifest-shape")
    values = [manifest.get("config"), *manifest["layers"]]
    if not 2 <= len(values) <= MAX_BLOBS:
        raise ValueError("descriptor-count")
    for value in values:
        if (not isinstance(value, dict) or not isinstance(value.get("digest"), str)
                or not DIGEST.fullmatch(value["digest"])
                or type(value.get("size")) is not int or not 0 <= value["size"] <= MAX_TOTAL
                or not isinstance(value.get("mediaType"), str)):
            raise ValueError("descriptor-shape")
    if sum(v["size"] for v in values) > MAX_TOTAL:
        raise ValueError("total-bound")
    return [{k: v[k] for k in ("mediaType", "digest", "size")} for v in values]


def load_pin(snapshot, model):
    if not MODEL.fullmatch(model):
        raise ValueError("unsupported-model")
    raw, data = metadata(snapshot)
    if not isinstance(data, dict) or data.get("schema") != 1 or not isinstance(data.get("models"), list):
        raise ValueError("snapshot-shape")
    matches = [m for m in data["models"] if isinstance(m, dict) and m.get("name") == model]
    if len(matches) != 1:
        raise ValueError("ambiguous-or-missing-model")
    pin = matches[0]
    if not isinstance(pin.get("manifestDigest"), str) or not DIGEST.fullmatch(pin["manifestDigest"]):
        raise ValueError("manifest-digest")
    ds = pin.get("descriptors")
    if not isinstance(ds, list) or not ds:
        raise ValueError("descriptors-missing")
    ds = descriptors({"config": ds[0], "layers": ds[1:]})
    return pin["manifestDigest"], ds, hashlib.sha256(raw).hexdigest()


def installed_manifest(store, model, expected_digest):
    """Prefer Ollama's current v2 named tree; never fall back from an invalid v2 entry."""
    tag = model.split(":")[1]
    v2 = store / "manifests-v2/ollama.com/library/gemma4" / tag
    if os.path.lexists(v2):
        if stat.S_ISLNK(v2.lstat().st_mode):
            # Only this leaf may be a link, and only to the exact pinned manifest blob.
            for parent in v2.parents:
                s = parent.lstat()
                if stat.S_ISLNK(s.st_mode) or getattr(parent, "is_junction", lambda: False)():
                    raise ValueError("linked-path")
            link = os.readlink(v2)
            target = Path(os.path.abspath(v2.parent / link))
            expected = store / "blobs" / expected_digest.replace(":", "-")
            if target != expected:
                raise ValueError("v2-manifest-target-mismatch")
            raw, data = metadata(expected)  # Reject links in blob path and verify bytes below.
            if os.readlink(v2) != link:
                raise ValueError("manifest-changed")
            return v2, raw, data, "v2-pinned-blob-link"
        raw, data = metadata(v2)
        return v2, raw, data, "v2-regular-copy"
    legacy = store / "manifests/registry.ollama.ai/library/gemma4" / tag
    raw, data = metadata(legacy)
    return legacy, raw, data, "legacy-regular-file"


def verify(snapshot, model, store, seconds=300, monotonic=time.monotonic):
    if not math.isfinite(seconds) or not 1 <= seconds <= 600:
        raise ValueError("deadline-bound")
    manifest_digest, expected, snapshot_hash = load_pin(snapshot, model)
    start = monotonic()
    def deadline():
        if monotonic() - start >= seconds:
            raise ValueError("deadline-exceeded")
    # Keep the original absolute path: resolving first would hide a symlink from regular().
    store = Path(os.path.abspath(store))
    manifest, raw, data, storage_format = installed_manifest(store, model, manifest_digest)
    if "sha256:" + hashlib.sha256(raw).hexdigest() != manifest_digest:
        raise ValueError("installed-manifest-mismatch")
    if descriptors(data) != expected:
        raise ValueError("snapshot-descriptor-mismatch")
    verified = []
    for d in expected:
        deadline()
        blob = store / "blobs" / d["digest"].replace(":", "-")
        regular(blob)
        with blob.open("rb") as f:
            before = os.fstat(f.fileno())
            if before.st_size != d["size"]:
                raise ValueError("blob-size-mismatch")
            digest = hashlib.sha256()
            remaining = d["size"]
            while remaining:
                deadline()
                chunk = f.read(min(1024 * 1024, remaining))
                if not chunk:
                    raise ValueError("blob-truncated")
                digest.update(chunk)
                remaining -= len(chunk)
            if f.read(1):
                raise ValueError("blob-grown")
            after = os.fstat(f.fileno())
        regular(blob)
        current = blob.stat()
        identity = lambda s: (s.st_dev, s.st_ino, s.st_size, s.st_mtime_ns)
        if identity(before) != identity(after) or identity(after) != identity(current):
            raise ValueError("blob-changed")
        if "sha256:" + digest.hexdigest() != d["digest"]:
            raise ValueError("blob-hash-mismatch")
        verified.append({"digest": d["digest"], "bytes": d["size"]})
    deadline()
    # Detect manifest replacement during the potentially long blob scan.
    latest_path, latest_raw, _, _ = installed_manifest(store, model, manifest_digest)
    if latest_path != manifest or latest_raw != raw:
        raise ValueError("manifest-changed")
    return {"model": model, "manifestDigest": manifest_digest, "snapshotSha256": snapshot_hash,
            "verifiedBlobs": verified, "verifiedBytes": sum(d["bytes"] for d in verified),
            "elapsedSeconds": monotonic() - start, "weightsBytesVerified": True, "storageFormat": storage_format,
            "gpuResidencyVerified": False, "inferenceTested": False}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", required=True, type=Path)
    parser.add_argument("--model", required=True)
    parser.add_argument("--store", type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--seconds", type=float, default=300)
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args(argv)
    trial_id = str(uuid.uuid4())
    directory = args.out / trial_id
    directory.mkdir(parents=True, exist_ok=False, mode=0o700)
    report = {"schema": 1, "trialId": trial_id, "startedAt": datetime.now(timezone.utc).isoformat(),
              "helperSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              "status": "started", "mode": "verify" if args.execute else "preview",
              "networkRequests": 0, "modelCalls": 0, "paidComputeUsd": None,
              "limitation": "Operator-supplied pin, no signature/TEE or protection from a malicious host. Cooperative deadline checks between local file reads; not a GPU or language test."}
    def save():
        # Unique invocation directory, durable report; no writes to the model store.
        temporary = directory / "report.tmp"
        with temporary.open("w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(temporary, directory / "report.json")
    save()
    try:
        md, ds, sh = load_pin(args.snapshot, args.model)
        report.update(model=args.model, manifestDigest=md, snapshotSha256=sh,
                      plannedBytes=sum(d["size"] for d in ds), weightsBytesVerified=False)
        if not math.isfinite(args.seconds) or not 1 <= args.seconds <= 600:
            raise ValueError("deadline-bound")
        if args.execute:
            if args.store is None:
                raise ValueError("store-required")
            report.update(verify(args.snapshot, args.model, args.store, args.seconds))
        report["status"] = "completed"
    except BaseException as error:
        report["status"] = "cancelled" if isinstance(error, KeyboardInterrupt) else "failed"
        # No paths, file contents or arbitrary exception messages in reports.
        report["reason"] = str(error) if isinstance(error, ValueError) and re.fullmatch(r"[a-z-]{1,60}", str(error)) else type(error).__name__
    report["finishedAt"] = datetime.now(timezone.utc).isoformat()
    save()
    print(json.dumps({"trialId": trial_id, "status": report["status"], "report": str(directory / "report.json")}))
    return 0 if report["status"] == "completed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
