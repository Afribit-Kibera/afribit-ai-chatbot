import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BUILTIN_BRANDING,
  BUILTIN_PACK,
  PACK_KEY,
  applyBranding,
  brandVars,
  fetchPack,
  getPack,
  mix,
  parsePack,
  refreshPack,
  resetPackCache,
  resolveMode,
  startersFor,
  titleFor,
} from "./pack.js";
import { validatePreferences } from "./preferences.js";

const livePack = {
  schema: "afribit-community-pack/0.1",
  id: "example",
  name: "Example Library",
  defaultMode: "pidgin",
  modes: [
    { id: "plain_en", label: "Plain English", description: "Short words." },
    { id: "pidgin", label: "Pidgin", description: "Everyday speech." },
  ],
  starterQuestions: {
    reviewed: false,
    byMode: { pidgin: ["Q1", "Q2"], plain_en: [] },
  },
  disclaimers: ["Check with a librarian."],
};

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

beforeEach(() => {
  resetPackCache();
  vi.stubGlobal("localStorage", memoryStorage());
});
afterEach(() => vi.unstubAllGlobals());

describe("pack client", () => {
  it("falls back to the built-in Kibera pack when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    expect(await fetchPack()).toBeNull();
    await refreshPack();
    expect(getPack()).toBe(BUILTIN_PACK);
    expect(BUILTIN_PACK.modes.map((m) => m.id)).toEqual([
      "simple_en",
      "swahili",
      "sheng",
      "mixed_ke",
    ]);
    expect(BUILTIN_PACK.defaultMode).toBe("mixed_ke");
  });

  it("falls back on a non-OK response or a malformed body (older API)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 404 })),
    );
    expect(await fetchPack()).toBeNull();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ modes: [] }))),
    );
    expect(await fetchPack()).toBeNull();
  });

  it("fetches, caches in localStorage and serves the cache first on the next load", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(livePack)));
    vi.stubGlobal("fetch", fetchMock);
    expect(getPack()).toBe(BUILTIN_PACK);
    await refreshPack();
    expect(fetchMock.mock.calls[0]![0]).toContain("/api/v1/pack");
    expect(getPack().name).toBe("Example Library");
    expect(localStorage.getItem(PACK_KEY)).toContain("pidgin");

    // New page load with the network down: the cached pack is used, not the built-in one.
    resetPackCache();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    expect(getPack().modes.map((m) => m.id)).toEqual(["plain_en", "pidgin"]);
    await refreshPack();
    expect(getPack().defaultMode).toBe("pidgin");
  });

  it("ignores corrupt cached data", () => {
    localStorage.setItem(PACK_KEY, "{not json");
    expect(getPack()).toBe(BUILTIN_PACK);
    resetPackCache();
    localStorage.setItem(PACK_KEY, JSON.stringify({ modes: "nope" }));
    expect(getPack()).toBe(BUILTIN_PACK);
  });

  it("works when localStorage is unavailable", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw Error();
      },
      setItem: () => {
        throw Error();
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(livePack))),
    );
    await refreshPack();
    expect(getPack().name).toBe("Example Library");
  });

  it("repairs a default mode the pack does not list", () => {
    const pack = parsePack({ ...livePack, defaultMode: "ghost" });
    expect(pack?.defaultMode).toBe("plain_en");
  });
});

describe("mode resolution", () => {
  it("keeps a stored mode the pack offers", () => {
    expect(resolveMode(BUILTIN_PACK, "sheng")).toBe("sheng");
  });
  it("falls back to the pack default for an unknown, empty or missing stored mode", () => {
    expect(resolveMode(BUILTIN_PACK, "pidgin")).toBe("mixed_ke");
    expect(resolveMode(BUILTIN_PACK, "")).toBe("mixed_ke");
    expect(resolveMode(BUILTIN_PACK, undefined)).toBe("mixed_ke");
    const pack = parsePack(livePack)!;
    expect(resolveMode(pack, "sheng")).toBe("pidgin");
  });
  it("lets preferences carry any mode id for the pack to judge", () => {
    expect(validatePreferences({ languageMode: "pidgin" }).languageMode).toBe(
      "pidgin",
    );
    expect(validatePreferences({}).languageMode).toBe("");
  });
});

describe("pack starters and disclaimers", () => {
  it("returns starters for the active mode only when present", () => {
    const pack = parsePack(livePack)!;
    expect(startersFor(pack, "pidgin")).toEqual({
      questions: ["Q1", "Q2"],
      reviewed: false,
    });
    expect(startersFor(pack, "plain_en")).toBeNull();
    expect(startersFor(BUILTIN_PACK, "sheng")).toBeNull();
    expect(pack.disclaimers).toEqual(["Check with a librarian."]);
  });
});

describe("pack branding (white-label)", () => {
  const branded = {
    ...livePack,
    branding: {
      shortName: "Reading Room",
      tagline: "Your neighbourhood library guide",
      accentColor: "#1F6F5C",
      accentInk: "#ffffff",
      logoUrl: "/api/v1/pack/brand/logo?pack=example&v=abc123",
      poweredBy: {
        show: true,
        label: "Powered by Afribit AI",
        url: "https://github.com/afribit/afribit-ai",
      },
    },
  };

  it("the built-in pack is Afribit as it has always looked: no accent, no logo, no Powered-by line", () => {
    expect(BUILTIN_PACK.branding).toBe(BUILTIN_BRANDING);
    expect(BUILTIN_BRANDING).toMatchObject({
      shortName: "Afribit AI",
      accentColor: null,
      logoUrl: null,
      poweredBy: { show: false },
    });
    expect(brandVars(BUILTIN_BRANDING)).toEqual({});
  });
  it("a pack with no branding (an older API, an old cache) keeps the Afribit look", () => {
    expect(parsePack(livePack)!.branding).toBe(BUILTIN_BRANDING);
    expect(parsePack({ ...livePack, branding: "nope" })!.branding).toBe(
      BUILTIN_BRANDING,
    );
    expect(parsePack({ ...livePack, branding: [] })!.branding).toBe(
      BUILTIN_BRANDING,
    );
  });
  it("reads a full branding block", () => {
    const b = parsePack(branded)!.branding;
    expect(b.shortName).toBe("Reading Room");
    expect(b.tagline).toBe("Your neighbourhood library guide");
    expect(b.accentColor).toBe("#1f6f5c");
    expect(b.accentInk).toBe("#ffffff");
    expect(b.logoUrl).toContain("/api/v1/pack/brand/logo?pack=example");
    expect(b.poweredBy).toEqual(branded.branding.poweredBy);
  });
  it("is tolerant: bad pieces fall back one by one instead of breaking the app", () => {
    const parse = (branding: unknown) =>
      parsePack({ ...livePack, branding })!.branding;
    expect(parse({ shortName: "" }).shortName).toBe("Afribit AI");
    expect(parse({ shortName: "x".repeat(61) }).shortName).toBe("Afribit AI");
    expect(parse({ shortName: "  Spaced  " }).shortName).toBe("Spaced");
    expect(
      parse({ shortName: "A", accentColor: "red" }).accentColor,
    ).toBeNull();
    expect(
      parse({ shortName: "A", accentColor: "#12" }).accentColor,
    ).toBeNull();
    // An accent that neither white nor near-black can sit on is ignored rather than used.
    expect(
      parse({ shortName: "A", accentColor: "#777777" }).accentColor,
    ).toBeNull();
    // A missing or unknown ink is worked out here.
    expect(parse({ shortName: "A", accentColor: "#f7931a" })).toMatchObject({
      accentColor: "#f7931a",
      accentInk: "#111111",
    });
    expect(
      parse({ shortName: "A", accentColor: "#1f6f5c", accentInk: "#ff0000" }),
    ).toMatchObject({ accentInk: "#ffffff" });
    // A wrong ink the API claims is not trusted when it cannot be read.
    expect(
      parse({ shortName: "A", accentColor: "#1f6f5c", accentInk: "#111111" })
        .accentColor,
    ).toBeNull();
  });
  it("only accepts a logo that is a path on the API", () => {
    for (const bad of [
      "https://evil.example/x.svg",
      "//evil.example/x.svg",
      "javascript:alert(1)",
      "data:image/svg+xml;base64,AAAA",
      "logo.svg",
      5,
      null,
    ])
      expect(
        parsePack({ ...livePack, branding: { shortName: "A", logoUrl: bad } })!
          .branding.logoUrl,
      ).toBeNull();
    expect(
      parsePack({
        ...livePack,
        branding: { shortName: "A", logoUrl: "/api/v1/pack/brand/logo" },
      })!.branding.logoUrl,
    ).toMatch(/\/api\/v1\/pack\/brand\/logo$/);
  });
  it("shows the Powered-by line unless the pack turns it off, and only links to https", () => {
    const parse = (poweredBy: unknown) =>
      parsePack({ ...livePack, branding: { shortName: "A", poweredBy } })!
        .branding.poweredBy;
    expect(parse(undefined)).toEqual({
      show: true,
      label: "Powered by Afribit AI",
      url: "https://github.com/afribit/afribit-ai",
    });
    expect(parse({ show: false }).show).toBe(false);
    expect(parse({ label: "Built on Afribit AI" }).label).toBe(
      "Built on Afribit AI",
    );
    expect(parse({ label: "x".repeat(61) }).label).toBe(
      "Powered by Afribit AI",
    );
    expect(parse({ url: "http://example.org" }).url).toBe(
      "https://github.com/afribit/afribit-ai",
    );
    expect(parse({ url: "javascript:alert(1)" }).url).toBe(
      "https://github.com/afribit/afribit-ai",
    );
    expect(parse({ url: "https://example.org/about" }).url).toBe(
      "https://example.org/about",
    );
  });
  it("turns an accent into the app's primary-colour variables, with its ink and a readable hover", () => {
    const vars = brandVars(parsePack(branded)!.branding);
    expect(vars["--bitcoin"]).toBe("#1f6f5c");
    expect(vars["--accent-ink"]).toBe("#ffffff");
    expect(vars["--border-accent"]).toBe("rgba(31, 111, 92, 0.4)");
    // white text on the accent: hover goes darker, so it stays readable
    expect(vars["--bitcoin-light"]).toBe(mix("#1f6f5c", "#000000", 0.14));
    expect(vars["--bitcoin-light"]).not.toBe(vars["--bitcoin"]);
    const orange = brandVars({
      ...BUILTIN_BRANDING,
      accentColor: "#f7931a",
      accentInk: "#111111",
    });
    expect(orange["--accent-ink"]).toBe("#111111");
    expect(orange["--bitcoin-light"]).toBe(mix("#f7931a", "#ffffff", 0.25));
  });
  it("applies and removes the colours on the root, leaving the Afribit look untouched when there is no accent", () => {
    const set = new Map<string, string>();
    const root = {
      style: {
        setProperty: (k: string, v: string) => void set.set(k, v),
        removeProperty: (k: string) => void set.delete(k),
      },
    };
    applyBranding(root, BUILTIN_BRANDING);
    expect([...set]).toEqual([]);
    applyBranding(root, parsePack(branded)!.branding);
    expect([...set.keys()].sort()).toEqual([
      "--accent-ink",
      "--bitcoin",
      "--bitcoin-dark",
      "--bitcoin-light",
      "--border-accent",
    ]);
    applyBranding(root, BUILTIN_BRANDING);
    expect([...set]).toEqual([]);
  });
  it("puts the pack's short name in the page title", () => {
    expect(titleFor("Chat", BUILTIN_BRANDING)).toBe("Chat — Afribit AI");
    expect(titleFor("Chat", parsePack(branded)!.branding)).toBe(
      "Chat — Reading Room",
    );
  });
  it("caches branding with the pack and reads it back", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => branded }),
    );
    await refreshPack();
    expect(getPack().branding.shortName).toBe("Reading Room");
    const stored = JSON.parse(localStorage.getItem(PACK_KEY) ?? "null");
    resetPackCache();
    expect(getPack().branding).toEqual(parsePack(stored)!.branding);
    expect(getPack().branding.shortName).toBe("Reading Room");
  });
});

describe("white-label first screen", () => {
  const base = {
    modes: [{ id: "a", label: "A", description: "" }],
    defaultMode: "a",
  };

  it("keeps the Bitcoin built-ins for an API that says nothing about its domain", () => {
    expect(parsePack(base)!.domainId).toBe("bitcoin");
  });

  it("knows a pack that is not about Bitcoin", () => {
    expect(
      parsePack({ ...base, domain: { id: "library", label: "library" } })!
        .domainId,
    ).toBe("library");
  });

  it("carries the community's own welcome wording and composer text, and ignores empty or oversized ones", () => {
    const b = parsePack({
      ...base,
      branding: {
        shortName: "Reading Room",
        welcomeTitle: "Ask about the library.",
        welcomeText: "x".repeat(300),
        composerPlaceholder: "  ",
      },
    })!.branding;
    expect(b.welcomeTitle).toBe("Ask about the library.");
    expect(b.welcomeText).toBeNull();
    expect(b.composerPlaceholder).toBeNull();
  });
});
