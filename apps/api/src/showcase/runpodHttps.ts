import https from "node:https";
import http from "node:http";

/** Explicit compatibility mode, scoped to RunPod control calls. No redirects or automatic retries. */
export async function runpodHttpsRequest(url: string, method: "GET" | "DELETE", key: string, timeoutMs: number): Promise<Response> {
  const target = new URL(url);
  const loopback = target.protocol === "http:" && target.hostname === "127.0.0.1";
  if ((!loopback && target.origin !== "https://api.runpod.io") || target.username || target.password || target.search || target.hash
    || !target.pathname.startsWith("/v2/") || !["GET", "DELETE"].includes(method) || !key || /[\r\n]/.test(key)
    || !Number.isSafeInteger(timeoutMs) || timeoutMs < 50 || timeoutMs > 15000) throw new Error("Invalid RunPod compatibility request");
  return new Promise<Response>((resolve, reject) => {
    let settled = false;
    let request: http.ClientRequest | undefined;
    let response: http.IncomingMessage | undefined;
    const agent = loopback ? undefined : new https.Agent({ minVersion: "TLSv1.2", maxVersion: "TLSv1.2", rejectUnauthorized: true });
    const end = (error: boolean, value?: Response) => {
      if (settled) return; settled = true; clearTimeout(timer);
      if (error) { response?.destroy(); request?.destroy(); agent?.destroy(); reject(new Error("RunPod HTTPS transport failed")); }
      else { agent?.destroy(); resolve(value!); }
    };
    const timer = setTimeout(() => end(true), timeoutMs);
    try {
      const transport = loopback ? http : https;
      request = transport.request(target, { method, agent, headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
        ...(loopback ? {} : { minVersion: "TLSv1.2", maxVersion: "TLSv1.2", rejectUnauthorized: true }) }, incoming => {
        response = incoming;
        const chunks: Buffer[] = []; let bytes = 0;
        incoming.on("error", () => end(true)); incoming.on("aborted", () => end(true));
        incoming.on("data", (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > 1_048_576) { end(true); return; }
          chunks.push(Buffer.from(chunk));
        });
        incoming.on("end", () => {
          if (settled) return;
          const status = incoming.statusCode;
          if (!status || status < 200 || status > 599) { end(true); return; }
          try {
            // Do not follow or forward Location/cookie headers. Callers reject non-2xx status.
            end(false, new Response([204, 205, 304].includes(status) ? null : Buffer.concat(chunks), { status,
              headers: { "content-type": typeof incoming.headers["content-type"] === "string" ? incoming.headers["content-type"] : "application/octet-stream" } }));
          } catch { end(true); }
        });
      });
      request.on("error", () => end(true)); request.end();
    } catch { end(true); }
  });
}
