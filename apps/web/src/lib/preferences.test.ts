import { afterEach, expect, it, vi } from "vitest";
import { DEFAULT_PREFERENCES, validatePreferences } from "./preferences.js";
import { readStorage, writeStorage } from "./storage.js";
import { loadHistory, saveHistory, HISTORY_KEY } from "./history.js";
import en from "../locales/en.json";
import sw from "../locales/sw.json";
import sh from "../locales/sh.json";
afterEach(() => vi.unstubAllGlobals());
it("validates corrupt or obsolete preferences without overriding explicit valid choices", () => {
  expect(
    validatePreferences({
      languageMode: "sheng",
      explanationLevel: "deep",
      theme: "light",
    }),
  ).toMatchObject({
    languageMode: "sheng",
    explanationLevel: "deep",
    theme: "light",
  });
  expect(validatePreferences({ languageMode: 42, textSize: "bad" })).toEqual(
    DEFAULT_PREFERENCES,
  );
  expect(validatePreferences(null)).toEqual(DEFAULT_PREFERENCES);
});
it("keeps all interface dictionaries ready for human translation", () => {
  expect(Object.keys(sw).sort()).toEqual(Object.keys(en).sort());
  expect(Object.keys(sh).sort()).toEqual(Object.keys(en).sort());
  expect(sw["meta.review"]).toContain("TODO(reviewers)");
});
it("remains usable when browser storage is unavailable", () => {
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw Error();
    },
    setItem: () => {
      throw Error();
    },
  });
  expect(readStorage("prefs", null)).toBeNull();
  expect(() => writeStorage("prefs", {})).not.toThrow();
});
it("does not persist refused secret messages in browser history", () => {
  const setItem = vi.fn();
  vi.stubGlobal("localStorage", { setItem });
  saveHistory([
    {
      localId: "l",
      sessionId: "s",
      title: "question",
      updatedAt: 1,
      messages: [
        {
          clientId: "secret",
          id: "m",
          role: "assistant",
          content: "secret",
          safetyFlag: "seed_phrase",
        },
      ],
    },
  ]);
  expect(setItem).toHaveBeenCalledWith(
    HISTORY_KEY,
    expect.not.stringContaining('"content":"secret"'),
  );
});
it("skips corrupted stored conversations without preventing chat from opening", () => {
  const valid = {
    localId: "l",
    sessionId: "s",
    title: "question",
    updatedAt: 1,
    messages: [
      { clientId: "u", id: "m", role: "user", content: "What is Bitcoin?" },
    ],
  };
  vi.stubGlobal("localStorage", {
    getItem: () =>
      JSON.stringify([
        null,
        { ...valid, messages: [null] },
        { ...valid, updatedAt: null },
        valid,
      ]),
  });
  expect(loadHistory()).toEqual([valid]);
});
