import contextlib
import io
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import gpu_telemetry as telemetry

ROW = '0, GPU-synthetic-a, Synthetic RTX, 24576, 4096, 55, 120.5, 999.0\n'


class Clock:
    def __init__(self):
        self.now = 0

    def monotonic(self):
        return self.now

    def wait(self, seconds):
        self.now += seconds


class TelemetryCases(unittest.TestCase):
    def test_parse_multiple_devices_and_missing_optional_values(self):
        parsed = telemetry.parse_sample(ROW + '1, GPU-synthetic-b, "Synthetic, GPU", 49152, 1024, N/A, [Not Supported], 999.1\n')
        self.assertEqual(len(parsed), 2)
        self.assertEqual(parsed[0]["memoryUsedMiB"], 4096)
        self.assertEqual(parsed[1]["name"], "Synthetic, GPU")
        self.assertIsNone(parsed[1]["powerWatts"])
        self.assertIsNone(parsed[1]["utilizationPercent"])

    def test_malformed_or_missing_memory_is_not_zero(self):
        for invalid in ["", "0, two", ROW + ROW, ROW.replace("4096", "N/A"),
                        ROW.replace("4096", "nan"), ROW.replace("4096", "30000"),
                        ROW.replace("55", "101")]:
            with self.subTest(value=invalid):
                with self.assertRaises(ValueError):
                    telemetry.parse_sample(invalid)

    def test_invalid_time_bounds_and_sample_count(self):
        for values in [(0, 1, 1), (901, 1, 1), (100, .1, 1), (1, 0, 1), (1, 1, 6), (float("nan"), 1, 1)]:
            with self.subTest(bounds=values):
                with self.assertRaises(ValueError):
                    telemetry.validate(*values)

    def test_preview_never_invokes_nvidia_and_records_evidence(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(telemetry, "read_nvidia", side_effect=AssertionError("No GPU in fixture")):
            target = Path(folder) / "preview"
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(telemetry.main(["--out", str(target)]), 0)
            record = json.loads((target / "preview.json").read_text())
            self.assertEqual(record["nvidiaInvocations"], 0)
            self.assertTrue(record["trialId"])

    def test_monotonic_deadline_and_sampled_maxima(self):
        with tempfile.TemporaryDirectory() as folder:
            clock, timeouts = Clock(), []

            def sampler(timeout):
                timeouts.append(timeout)
                clock.now += .02
                return telemetry.parse_sample(ROW.replace("4096", str(4096 + len(timeouts))))

            target = Path(folder) / "run"
            result = telemetry.collect(target, .3, .1, 1, sampler=sampler, monotonic=clock.monotonic, wait=clock.wait)
            self.assertEqual(result["status"], "completed")
            self.assertEqual(result["sampleCount"], 3)
            self.assertLessEqual(result["elapsedSeconds"], .301)
            self.assertEqual(result["sampledMaxima"][0]["sampledMaxUsedMiB"], 4099)
            self.assertLessEqual(timeouts[-1], .061)
            self.assertEqual(json.loads((target / "telemetry.json").read_text())["status"], "completed")
            self.assertIsNone(result["paidComputeUsd"])

    def test_query_failure_retains_partial_evidence(self):
        with tempfile.TemporaryDirectory() as folder:
            clock, calls = Clock(), []

            def sampler(timeout):
                calls.append(timeout)
                if len(calls) == 2:
                    raise subprocess.TimeoutExpired("nvidia-smi", timeout)
                return telemetry.parse_sample(ROW)

            target = Path(folder) / "partial"
            result = telemetry.collect(target, 1, .1, 1, sampler=sampler, monotonic=clock.monotonic, wait=clock.wait)
            self.assertEqual(result["status"], "needs-attention")
            self.assertEqual(result["sampleCount"], 1)
            self.assertEqual(result["stopReason"], "sampling-failed")
            self.assertEqual(len(json.loads((target / "telemetry.json").read_text())["failures"]), 1)

    def test_missing_nvidia_is_a_failure_not_a_cpu_or_gpu_pass(self):
        with tempfile.TemporaryDirectory() as folder:
            def sampler(_):
                raise FileNotFoundError("nvidia-smi")
            result = telemetry.collect(Path(folder) / "missing", 1, 1, 1, sampler=sampler)
            self.assertEqual(result["status"], "needs-attention")
            self.assertEqual(result["sampleCount"], 0)
            self.assertEqual(result["sampledMaxima"], [])

    def test_completion_marker_stops_sampling(self):
        with tempfile.TemporaryDirectory() as folder:
            clock, marker = Clock(), Path(folder) / "done"

            def sampler(_):
                marker.touch()
                return telemetry.parse_sample(ROW)

            result = telemetry.collect(Path(folder) / "run", 5, .1, 1, marker, sampler=sampler, monotonic=clock.monotonic, wait=clock.wait)
            self.assertEqual(result["sampleCount"], 1)
            self.assertEqual(result["stopReason"], "completion-marker")

    def test_existing_output_and_stale_marker_are_refused(self):
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaises(FileExistsError):
                telemetry.collect(folder, 1, 1, 1, sampler=lambda _: self.fail("Must not sample"))
            marker = Path(folder) / "done"
            marker.touch()
            with self.assertRaises(ValueError):
                telemetry.collect(Path(folder) / "run", 1, 1, 1, marker)
            with self.assertRaises(ValueError):
                telemetry.collect(Path(folder) / "run", 1, 1, 1, Path(folder) / "run/done")

    def test_nvidia_uses_no_shell_and_explicit_timeout(self):
        with patch.object(telemetry.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, ROW, "")) as call:
            self.assertEqual(len(telemetry.read_nvidia(.5)), 1)
            self.assertFalse(call.call_args.kwargs["shell"])
            self.assertEqual(call.call_args.kwargs["timeout"], .5)
            self.assertEqual(call.call_args.args[0][0], "nvidia-smi")

    def test_interrupt_keeps_inspectable_partial_result(self):
        with tempfile.TemporaryDirectory() as folder:
            def interrupted(_):
                raise KeyboardInterrupt()
            result = telemetry.collect(Path(folder) / "run", 1, 1, 1, sampler=interrupted)
            self.assertEqual(result["stopReason"], "interrupted")
            self.assertEqual(result["status"], "needs-attention")

    def test_unexpected_failure_never_finalizes_partial_samples_as_pass(self):
        with tempfile.TemporaryDirectory() as folder:
            clock, calls = Clock(), []
            def sampler(_):
                calls.append(True)
                if len(calls) == 2:
                    raise RuntimeError("Synthetic adapter bug")
                return telemetry.parse_sample(ROW)
            result = telemetry.collect(Path(folder) / "run", 1, .1, 1, sampler=sampler, monotonic=clock.monotonic, wait=clock.wait)
            self.assertEqual(result["sampleCount"], 1)
            self.assertEqual(result["status"], "needs-attention")
            self.assertEqual(result["failures"][0]["reason"], "unexpected-collection-failure")


if __name__ == "__main__":
    unittest.main(verbosity=2)
