import {afterEach,describe,it,expect,vi} from "vitest";
import {randomId} from "./randomId.js";
afterEach(()=>vi.unstubAllGlobals());
describe("local IDs on HTTPS and plain HTTP LAN",()=>{
 it("uses the native API with its Crypto receiver when available",()=>{
  const crypto={randomUUID(){expect(this).toBe(crypto);return "native-fixture-id";}};
  vi.stubGlobal("crypto",crypto);expect(randomId()).toBe("native-fixture-id");
 });
 it("uses fresh cryptographic bytes on each call when randomUUID is absent",()=>{
  let count=0;const crypto={getRandomValues(bytes:Uint8Array){expect(this).toBe(crypto);expect(bytes.byteLength).toBe(16);bytes.fill(0);bytes[15]=++count;return bytes;}};
  vi.stubGlobal("crypto",crypto);expect(randomId()).toBe("00000000-0000-4000-8000-000000000001");expect(randomId()).toBe("00000000-0000-4000-8000-000000000002");
 });
 it("sets version and variant bits while retaining remaining random bits",()=>{
  vi.stubGlobal("crypto",{getRandomValues:(bytes:Uint8Array)=>bytes.fill(255)});expect(randomId()).toBe("ffffffff-ffff-4fff-bfff-ffffffffffff");
 });
 it("refuses missing secure randomness without using Math.random",()=>{
  vi.stubGlobal("crypto",undefined);const insecure=vi.spyOn(Math,"random");expect(()=>randomId()).toThrow("Secure random");expect(insecure).not.toHaveBeenCalled();insecure.mockRestore();
 });
 it("preserves a cryptographic generator failure",()=>{
  vi.stubGlobal("crypto",{getRandomValues:()=>{throw new Error("rng unavailable");}});expect(()=>randomId()).toThrow("rng unavailable");
 });
});
