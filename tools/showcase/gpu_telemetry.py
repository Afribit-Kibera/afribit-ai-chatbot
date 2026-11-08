"""Bounded NVIDIA telemetry. Run on the rented host; does not manage rentals."""
from __future__ import annotations

import argparse
import csv
import io
import json
import math
import os
from pathlib import Path
import subprocess
import sys
import time
import uuid
from datetime import datetime, timezone

FIELDS = "index,uuid,name,memory.total,memory.used,utilization.gpu,power.draw,driver_version"


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def number(raw, minimum=0, maximum=None):
    if raw.strip() in {"N/A", "[N/A]", "[Not Supported]", "Not Supported"}:
        return None
    value = float(raw.strip())
    if not math.isfinite(value) or value < minimum or (maximum is not None and value > maximum):
        raise ValueError("Invalid GPU measurement")
    return value


def parse_sample(text):
    result = []
    seen = set()
    for row in csv.reader(io.StringIO(text), skipinitialspace=True):
        if not row:
            continue
        if len(row) != 8:
            raise ValueError("Unexpected NVIDIA field count")
        index = int(row[0])
        device_uuid, name, driver = (row[i].strip() for i in (1, 2, 7))
        if index < 0 or index in seen or not device_uuid or not name or not driver:
            raise ValueError("Invalid NVIDIA device identity")
        seen.add(index)
        total, used = number(row[3]), number(row[4])
        if total is None or total <= 0 or used is None or used > total:
            raise ValueError("GPU memory measurement unavailable or invalid")
        result.append({"index": index, "uuid": device_uuid, "name": name,
                       "memoryTotalMiB": total, "memoryUsedMiB": used,
                       "utilizationPercent": number(row[5], maximum=100),
                       "powerWatts": number(row[6]), "driverVersion": driver})
    if not result:
        raise ValueError("No NVIDIA devices found")
    if len(result) > 16:
        raise ValueError("Unexpected device count")
    return result


def read_nvidia(timeout_seconds):
    completed = subprocess.run(
        ["nvidia-smi", f"--query-gpu={FIELDS}", "--format=csv,noheader,nounits"],
        shell=False, check=True, capture_output=True, text=True, timeout=timeout_seconds,
    )
    if len(completed.stdout) > 65536:
        raise ValueError("Oversized NVIDIA response")
    return parse_sample(completed.stdout)


def atomic_json(path, value):
    temporary = path.with_name(f".{path.name}.{uuid.uuid4()}.tmp")
    try:
        with temporary.open("x", encoding="utf8") as stream:
            json.dump(value, stream, ensure_ascii=False, indent=2, allow_nan=False)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def validate(duration, interval, timeout):
    if not all(isinstance(n, (int, float)) and math.isfinite(n) for n in (duration, interval, timeout)):
        raise ValueError("Finite time bounds required")
    if not (0.1 <= duration <= 900 and 0.1 <= interval <= 30 and 0.05 <= timeout <= 5):
        raise ValueError("Invalid telemetry time bounds")
    if math.ceil(duration / interval) > 900:
        raise ValueError("At most 900 samples allowed")


def collect(directory, duration, interval, timeout, marker=None, *, sampler=read_nvidia,
            monotonic=time.monotonic, wait=time.sleep):
    validate(duration, interval, timeout)
    directory = Path(directory).resolve()
    marker = Path(marker).resolve() if marker is not None else None
    if marker is not None and (marker.exists() or marker.is_relative_to(directory)):
        raise ValueError("Completion marker must be absent and outside the new output directory")
    # Create-only ownership: never reuse/delete an earlier run or its artifacts.
    directory.mkdir(mode=0o700, parents=True, exist_ok=False)
    started = monotonic()
    deadline = started + duration
    run_id = str(uuid.uuid4())
    samples, failures = [], []
    stop_reason = "deadline"
    state = {"schema": 1, "trialId": run_id, "startedAt": utc_now(), "finishedAt": None,
             "status": "started", "paidComputeUsd": None, "sampleCount": 0,
             "configuration": {"durationSeconds": duration, "intervalSeconds": interval,
                               "subprocessTimeoutSeconds": timeout, "completionMarker": str(marker) if marker else None},
             "samples": samples, "failures": failures,
             "limits": ["Sampled device metrics, not proof of model residency or a guaranteed peak",
                        "No pod creation, termination, invoice reconciliation, network or model call"]}
    def save():
        state["sampleCount"] = len(samples)
        atomic_json(directory / "telemetry.json", state)
    save()
    try:
        while monotonic() < deadline and len(samples) < 900:
            if marker is not None and marker.exists():
                stop_reason = "completion-marker"
                break
            remaining = deadline - monotonic()
            if remaining <= 0:
                break
            try:
                devices = sampler(min(timeout, remaining))
                samples.append({"at": utc_now(), "elapsedSeconds": monotonic() - started, "devices": devices})
                save()
            except (OSError, ValueError, subprocess.SubprocessError):
                failures.append({"at": utc_now(), "reason": "nvidia-query-failed"})
                stop_reason = "sampling-failed"
                break
            remaining = deadline - monotonic()
            if remaining > 0:
                wait(min(interval, remaining))
    except KeyboardInterrupt:
        stop_reason = "interrupted"
    except Exception:
        # Preserve a failed status even for an unexpected adapter/clock error after earlier samples.
        failures.append({"at": utc_now(), "reason": "unexpected-collection-failure"})
        stop_reason = "sampling-failed"
    finally:
        maxima = {}
        for sample in samples:
            for device in sample["devices"]:
                key = device["uuid"]
                peak = maxima.setdefault(key, {"index": device["index"], "name": device["name"],
                                              "sampledMaxUsedMiB": device["memoryUsedMiB"],
                                              "sampledMaxUtilizationPercent": None, "sampledMaxPowerWatts": None})
                peak["sampledMaxUsedMiB"] = max(peak["sampledMaxUsedMiB"], device["memoryUsedMiB"])
                for source, target in (("utilizationPercent", "sampledMaxUtilizationPercent"), ("powerWatts", "sampledMaxPowerWatts")):
                    value = device[source]
                    if value is not None:
                        peak[target] = value if peak[target] is None else max(peak[target], value)
        state.update({"finishedAt": utc_now(), "elapsedSeconds": monotonic() - started,
                      "status": "completed" if samples and not failures and stop_reason != "interrupted" else "needs-attention",
                      "stopReason": stop_reason, "sampledMaxima": list(maxima.values())})
        save()
    return state


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", required=True, help="New output directory, never an existing run")
    parser.add_argument("--duration-seconds", type=float, default=300)
    parser.add_argument("--interval-seconds", type=float, default=1)
    parser.add_argument("--timeout-seconds", type=float, default=2)
    parser.add_argument("--completed-file")
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args(argv)
    validate(args.duration_seconds, args.interval_seconds, args.timeout_seconds)
    if not args.execute:
        preview = {"trialId": str(uuid.uuid4()), "at": utc_now(), "preview": True, "nvidiaInvocations": 0,
                   "paidComputeUsd": 0, "configuration": vars(args)}
        target = Path(args.out).resolve()
        target.mkdir(mode=0o700, parents=True, exist_ok=False)
        atomic_json(target / "preview.json", preview)
        print(json.dumps(preview))
        return 0
    result = collect(args.out, args.duration_seconds, args.interval_seconds, args.timeout_seconds, args.completed_file)
    print(json.dumps({"trialId": result["trialId"], "status": result["status"], "sampleCount": result["sampleCount"], "out": str(Path(args.out).resolve())}))
    return 0 if result["status"] == "completed" else 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, OSError):
        print("Telemetry refused; inspect arguments and use a new writable output directory.", file=sys.stderr)
        sys.exit(1)
