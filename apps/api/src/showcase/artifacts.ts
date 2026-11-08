import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream, existsSync, statSync } from "node:fs";
import { mkdir, rename } from "node:fs/promises";
import { dirname } from "node:path";
import { once } from "node:events";
import { finished } from "node:stream/promises";
import { execFileSync } from "node:child_process";

export interface Artifact { url: string; bytes: number; sha256: string }
export async function fileSha256(filename: string) {
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(filename)) digest.update(chunk);
  return digest.digest("hex");
}
function permitted(url: URL, fixture: boolean) {
  if (url.username || url.password) return false;
  if (fixture && url.protocol === "http:" && url.hostname === "127.0.0.1") return true;
  return url.protocol === "https:" && (url.hostname === "github.com" || url.hostname.endsWith(".githubusercontent.com")
    || url.hostname === "huggingface.co" || url.hostname.endsWith(".hf.co"));
}
export async function downloadVerified(artifact: Artifact, destination: string, progress: (bytes: number) => void = () => {}, fixture = false) {
  if (!Number.isSafeInteger(artifact.bytes) || artifact.bytes < 1 || artifact.bytes > 1_000_000_000 || !/^[a-f0-9]{64}$/.test(artifact.sha256)) throw new Error("Invalid bounded artifact");
  if (!permitted(new URL(artifact.url), fixture)) throw new Error("Unapproved artifact origin");
  if (existsSync(destination)) {
    if (!statSync(destination).isFile() || statSync(destination).size !== artifact.bytes || await fileSha256(destination) !== artifact.sha256) throw new Error("Existing artifact does not match pinned bytes");
    return { filename: destination, sha256: artifact.sha256, bytes: artifact.bytes, cached: true };
  }
  await mkdir(dirname(destination), { recursive: true });
  const signal = AbortSignal.timeout(600_000);
  let url = new URL(artifact.url), response: Response | undefined;
  for (let redirects = 0; redirects <= 5; redirects++) {
    if (!permitted(url, fixture)) throw new Error("Unapproved artifact origin or redirect");
    const r = await fetch(url, { redirect: "manual", signal, headers: { "User-Agent": "afribit-documented-local-trial" } });
    if ([301, 302, 303, 307, 308].includes(r.status)) {
      const location = r.headers.get("location"); await r.body?.cancel();
      if (!location) throw new Error("Missing redirect location"); url = new URL(location, url); continue;
    }
    response = r; break;
  }
  if (!response?.ok || !response.body) { await response?.body?.cancel(); throw new Error("Artifact request failed"); }
  const tmp = `${destination}.${randomUUID()}.partial`, out = createWriteStream(tmp, { flags: "wx", mode: 0o600 });
  // Install an error listener before writing, including errors arriving before backpressure.
  let outputError: Error | null = null; out.on("error", (error) => { outputError = error; });
  const completion = finished(out); void completion.catch(() => {});
  const reader = response.body.getReader(), digest = createHash("sha256"); let bytes = 0, lastProgress = 0;
  try {
    for (;;) {
      const item = await reader.read(); if (item.done) break;
      bytes += item.value.byteLength; if (bytes > artifact.bytes) throw new Error("Artifact exceeds pinned size");
      if (outputError) throw outputError;
      digest.update(item.value); if (!out.write(item.value)) await once(out, "drain");
      if (bytes - lastProgress >= 64 * 1024 * 1024) { progress(bytes); lastProgress = bytes; }
    }
    out.end(); await completion; if (outputError) throw outputError;
    if (bytes !== artifact.bytes || digest.digest("hex") !== artifact.sha256 || await fileSha256(tmp) !== artifact.sha256) throw new Error("Artifact byte count or SHA-256 mismatch");
    await rename(tmp, destination); progress(bytes);
    return { filename: destination, sha256: artifact.sha256, bytes, cached: false };
  } finally { out.destroy(); await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
export function extractZipSafely(archive: string, destination: string) {
  if (process.platform !== "win32") throw new Error("Portable archive extraction currently requires Windows");
  const script = `$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$target = [IO.Path]::GetFullPath($env:AFRIBIT_EXTRACT_DEST) + [IO.Path]::DirectorySeparatorChar
$archive = [IO.Compression.ZipFile]::OpenRead($env:AFRIBIT_EXTRACT_ARCHIVE)
try {
  foreach ($entry in $archive.Entries) {
    $badSegment = @($entry.FullName -split '[\\/]' | Where-Object { $_.EndsWith('.') -or $_.EndsWith(' ') }).Count -gt 0
    $badLink = ((($entry.ExternalAttributes -shr 16) -band 61440) -eq 40960)
    if ([IO.Path]::IsPathRooted($entry.FullName) -or $entry.FullName.Contains(':') -or $badSegment -or $badLink) { throw 'Unsafe archive entry' }
    $resolved = [IO.Path]::GetFullPath([IO.Path]::Combine($target, $entry.FullName))
    if (-not $resolved.StartsWith($target, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe archive entry' }
  }
} finally { $archive.Dispose() }
Expand-Archive -LiteralPath $env:AFRIBIT_EXTRACT_ARCHIVE -DestinationPath $env:AFRIBIT_EXTRACT_DEST -ErrorAction Stop`;
  execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { windowsHide: true, timeout: 60000,
    env: { SystemRoot: process.env.SystemRoot, PATH: process.env.PATH, TEMP: process.env.TEMP, TMP: process.env.TMP, AFRIBIT_EXTRACT_DEST: destination, AFRIBIT_EXTRACT_ARCHIVE: archive } });
}
