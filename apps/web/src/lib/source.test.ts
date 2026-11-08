import { describe, expect, it } from "vitest";
import { captureSource, getSource, parseSource, SOURCE_KEY, type SourceStorage } from "./source.js";

function memory(initial: Record<string, string> = {}): SourceStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

describe("channel label (ref)", () => {
  it("accepts short lowercase slugs", () => {
    for (const ok of ["kibera-hub", "a", "0", "class-2026-10", "x".repeat(32)]) expect(parseSource(ok)).toBe(ok);
  });
  it("ignores anything else", () => {
    for (const bad of ["", "-hub", "Kibera", "kibera hub", "kibera_hub", "x".repeat(33), "a/b", "<script>", "é", null, undefined, 5])
      expect(parseSource(bad)).toBeNull();
  });
  it("saves a valid ref from the URL and keeps it for later loads without one", () => {
    const store = memory();
    expect(captureSource("?ref=kibera-hub", store)).toBe("kibera-hub");
    expect(store.data[SOURCE_KEY]).toBe("kibera-hub");
    expect(captureSource("", store)).toBe("kibera-hub");
    expect(getSource(store)).toBe("kibera-hub");
  });
  it("does not save an invalid ref, and keeps the earlier one", () => {
    const store = memory({ [SOURCE_KEY]: "poster-1" });
    expect(captureSource("?ref=Not%20Valid!", store)).toBe("poster-1");
    expect(store.data[SOURCE_KEY]).toBe("poster-1");
  });
  it("a newer valid link replaces the older one", () => {
    const store = memory({ [SOURCE_KEY]: "poster-1" });
    expect(captureSource("?lang=sw&ref=class-a", store)).toBe("class-a");
    expect(getSource(store)).toBe("class-a");
  });
  it("ignores a tampered stored value", () => {
    expect(getSource(memory({ [SOURCE_KEY]: "BAD VALUE" }))).toBeNull();
  });
  it("works when storage is blocked or missing", () => {
    const blocked: SourceStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(captureSource("?ref=kibera-hub", blocked)).toBe("kibera-hub");
    expect(getSource(blocked)).toBeNull();
    expect(captureSource("?ref=kibera-hub", null)).toBe("kibera-hub");
    expect(getSource(null)).toBeNull();
  });
});
