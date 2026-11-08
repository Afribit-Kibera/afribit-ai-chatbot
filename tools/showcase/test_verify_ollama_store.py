import contextlib
import hashlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import verify_ollama_store as verifier

MODEL = "gemma4:e4b-it-q4_K_M"


class StoreCases(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.root = Path(self.folder.name)
        self.store = self.root / "store"
        self.blobs = self.store / "blobs"
        self.blobs.mkdir(parents=True)
        ds = []
        for content in [b"{}", b"synthetic-weight-not-a-model"]:
            digest = "sha256:" + hashlib.sha256(content).hexdigest()
            ds.append({"mediaType": "synthetic", "digest": digest, "size": len(content)})
            (self.blobs / digest.replace(":", "-")).write_bytes(content)
        self.manifest = self.store / "manifests/registry.ollama.ai/library/gemma4/e4b-it-q4_K_M"
        self.manifest.parent.mkdir(parents=True)
        raw = json.dumps({"config": ds[0], "layers": ds[1:]}).encode()
        self.manifest.write_bytes(raw)
        self.pin = {"name": MODEL, "manifestDigest": "sha256:" + hashlib.sha256(raw).hexdigest(), "descriptors": ds}
        self.snapshot = self.root / "snapshot.json"
        self.save_pin()

    def save_pin(self):
        self.snapshot.write_text(json.dumps({"schema": 1, "models": [self.pin]}))

    def test_complete_store_checks_every_byte(self):
        report = verifier.verify(self.snapshot, MODEL, self.store)
        self.assertTrue(report["weightsBytesVerified"])
        self.assertEqual(len(report["verifiedBlobs"]), 2)
        self.assertFalse(report["gpuResidencyVerified"])

    def test_same_size_tamper_rejected(self):
        blob = self.blobs / self.pin["descriptors"][1]["digest"].replace(":", "-")
        blob.write_bytes(b"x" * blob.stat().st_size)
        with self.assertRaisesRegex(ValueError, "blob-hash-mismatch"):
            verifier.verify(self.snapshot, MODEL, self.store)

    def test_missing_blob_fails(self):
        next(self.blobs.iterdir()).unlink()
        with self.assertRaises(FileNotFoundError):
            verifier.verify(self.snapshot, MODEL, self.store)

    def test_wrong_size_rejected_before_hashing(self):
        next(self.blobs.iterdir()).write_bytes(b"too long")
        with self.assertRaisesRegex(ValueError, "blob-size-mismatch"):
            verifier.verify(self.snapshot, MODEL, self.store)

    def test_installed_manifest_drift_rejected(self):
        self.manifest.write_bytes(self.manifest.read_bytes() + b" ")
        with self.assertRaisesRegex(ValueError, "installed-manifest-mismatch"):
            verifier.verify(self.snapshot, MODEL, self.store)

    def test_pin_descriptor_disagreement_rejected(self):
        self.pin["descriptors"][1]["size"] += 1
        self.save_pin()
        with self.assertRaisesRegex(ValueError, "snapshot-descriptor-mismatch"):
            verifier.verify(self.snapshot, MODEL, self.store)

    def test_unsafe_names_digests_and_size_rejected(self):
        with self.assertRaises(ValueError):
            verifier.load_pin(self.snapshot, "../another-model")
        for field, value in [("digest", "../../outside"), ("size", -1), ("size", True), ("size", verifier.MAX_TOTAL + 1)]:
            with self.subTest(field=field, value=value):
                original = self.pin["descriptors"][1][field]
                self.pin["descriptors"][1][field] = value
                self.save_pin()
                with self.assertRaises(ValueError):
                    verifier.load_pin(self.snapshot, MODEL)
                self.pin["descriptors"][1][field] = original

    def test_preview_does_not_read_store_and_unique_reports(self):
        with patch.object(verifier, "verify", side_effect=AssertionError("preview must not scan")):
            for _ in range(2):
                with contextlib.redirect_stdout(io.StringIO()):
                    self.assertEqual(verifier.main(["--snapshot", str(self.snapshot), "--model", MODEL, "--out", str(self.root / "out")]), 0)
        reports = list((self.root / "out").glob("*/report.json"))
        self.assertEqual(len(reports), 2)
        self.assertTrue(all(not json.loads(p.read_text())["weightsBytesVerified"] for p in reports))

    def test_failure_has_durable_report(self):
        with contextlib.redirect_stdout(io.StringIO()):
            code = verifier.main(["--snapshot", str(self.snapshot), "--model", MODEL, "--out", str(self.root / "out"), "--execute"])
        report = json.loads(next((self.root / "out").glob("*/report.json")).read_text())
        self.assertEqual(code, 1)
        self.assertEqual(report["status"], "failed")
        self.assertEqual(report["reason"], "store-required")

    def test_deadline_and_metadata_bounds(self):
        with self.assertRaisesRegex(ValueError, "deadline-exceeded"):
            verifier.verify(self.snapshot, MODEL, self.store, 1, monotonic=iter([0, 2]).__next__)
        for limit in [float("nan"), 0, 601]:
            with self.assertRaises(ValueError):
                verifier.verify(self.snapshot, MODEL, self.store, limit)
        self.snapshot.write_bytes(b"x" * (verifier.MAX_METADATA + 1))
        with self.assertRaisesRegex(ValueError, "metadata-bound"):
            verifier.load_pin(self.snapshot, MODEL)

    def test_linked_component_rejected(self):
        # Deterministic path inspection fixture, works without Windows symlink privileges.
        original = Path.lstat
        def linked(path):
            actual = original(path)
            if path == self.blobs:
                values = list(actual)
                values[0] = 0o120777
                return __import__("os").stat_result(values)
            return actual
        with patch.object(Path, "lstat", linked), self.assertRaisesRegex(ValueError, "linked-path"):
            verifier.verify(self.snapshot, MODEL, self.store)

    def test_v2_regular_copy_takes_precedence_over_legacy_anchor(self):
        v2 = self.store / "manifests-v2/ollama.com/library/gemma4/e4b-it-q4_K_M"
        v2.parent.mkdir(parents=True)
        v2.write_bytes(self.manifest.read_bytes())
        self.manifest.write_bytes(b"synthetic old-version compatibility anchor")
        report = verifier.verify(self.snapshot, MODEL, self.store)
        self.assertEqual(report["storageFormat"], "v2-regular-copy")
        self.assertTrue(report["weightsBytesVerified"])

    def v2_link_fixture(self, wrong=False):
        import os
        v2 = self.store / "manifests-v2/ollama.com/library/gemma4/e4b-it-q4_K_M"
        v2.parent.mkdir(parents=True)
        v2.write_bytes(b"synthetic link placeholder")
        blob = self.blobs / self.pin["manifestDigest"].replace(":", "-")
        blob.write_bytes(self.manifest.read_bytes())
        original = Path.lstat
        def linked(path):
            actual = original(path)
            if path == v2:
                values = list(actual); values[0] = 0o120777
                return os.stat_result(values)
            return actual
        target = self.root / "outside" if wrong else blob
        return v2, linked, os.path.relpath(target, v2.parent)

    def test_v2_link_allows_only_the_exact_pinned_regular_blob(self):
        v2, linked, target = self.v2_link_fixture()
        with patch.object(Path, "lstat", linked), patch.object(verifier.os, "readlink", return_value=target):
            report = verifier.verify(self.snapshot, MODEL, self.store)
        self.assertEqual(report["storageFormat"], "v2-pinned-blob-link")

    def test_v2_external_link_rejected_without_legacy_fallback(self):
        v2, linked, target = self.v2_link_fixture(wrong=True)
        with patch.object(Path, "lstat", linked), patch.object(verifier.os, "readlink", return_value=target):
            with self.assertRaisesRegex(ValueError, "v2-manifest-target-mismatch"):
                verifier.verify(self.snapshot, MODEL, self.store)

    def test_bad_v2_copy_cannot_be_hidden_by_a_valid_legacy_file(self):
        v2 = self.store / "manifests-v2/ollama.com/library/gemma4/e4b-it-q4_K_M"
        v2.parent.mkdir(parents=True); v2.write_bytes(b"{}")
        with self.assertRaisesRegex(ValueError, "installed-manifest-mismatch"):
            verifier.verify(self.snapshot, MODEL, self.store)


if __name__ == "__main__":
    unittest.main()
