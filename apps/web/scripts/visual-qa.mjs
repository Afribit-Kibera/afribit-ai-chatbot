import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const out = fileURLToPath(
  new URL("../../../internal/frontend/qa/", import.meta.url),
);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];
const metrics = {};
const answer =
  "Bitcoin is an open digital money system. People can send value to each other through a network of computers.";
for (const [label, viewport] of [
  ["desktop", { width: 1440, height: 1024 }],
  ["mobile", { width: 390, height: 844 }],
  ["small", { width: 320, height: 640 }],
]) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    colorScheme: "dark",
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  page.on("pageerror", (error) =>
    failures.push({ label, error: error.message }),
  );
  page.on("console", (message) => {
    if (message.type() === "error")
      failures.push({ label, consoleError: message.text() });
  });
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("http://127.0.0.1:4173/");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${out}/landing-${label}.png` });
  if (label === "mobile")
    await page.screenshot({
      path: `${out}/landing-mobile-full.png`,
      fullPage: true,
    });
  const external = requests.filter(
    (url) => new URL(url).origin !== "http://127.0.0.1:4173",
  );
  if (external.length) failures.push({ label, external });
  await page.addInitScript(() => {
    localStorage.setItem("afribit.onboarded", "true");
    localStorage.setItem(
      "afribit.preferences",
      JSON.stringify({
        languageMode: "simple_en",
        explanationLevel: "simple",
        locale: "en",
        theme: "dark",
        textSize: "normal",
      }),
    );
  });
  await page.goto("http://127.0.0.1:4173/app");
  await page.getByRole("textbox", { name: "Your question" }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${out}/chat-${label}.png` });
  await page.route("**/api/v1/chat/stream", (route) =>
    route.fulfill({
      contentType: "application/x-ndjson",
      body: [
        { type: "meta", sessionId: "qa-session", safetyFlag: null },
        { type: "delta", text: answer },
        { type: "done", messageId: "qa-message", usedFallback: false },
      ]
        .map((e) => JSON.stringify(e))
        .join("\n"),
    }),
  );
  await page
    .getByRole("textbox", { name: "Your question" })
    .fill("What is Bitcoin?");
  await page.getByRole("button", { name: "Send question" }).click();
  await page.getByRole("button", { name: "Helpful answer" }).waitFor();
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".message")].every(
      (message) => Number(getComputedStyle(message).opacity) >= 0.99,
    ),
  );
  await page.screenshot({ path: `${out}/answer-${label}.png` });
  await page
    .getByRole("button", { name: "Report a wrong or unsafe answer" })
    .click();
  await page.screenshot({ path: `${out}/feedback-${label}.png` });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .first()
    .click();
  // 200% browser text scaling, retaining the small viewport and fixed composer.
  await page.addStyleTag({ content: "html { font-size: 200%; }" });
  await page.screenshot({ path: `${out}/text-200-${label}.png` });
  const layout = await page.evaluate(() => ({
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    send: (() => {
      const r = document
        .querySelector(".composer button")
        .getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
    })(),
  }));
  if (
    layout.scrollWidth > viewport.width + 1 ||
    layout.send.bottom > viewport.height ||
    layout.send.top < 0 ||
    layout.send.right > viewport.width
  )
    failures.push({ label, layout });
  if (label !== "small") {
    await page.goto("http://127.0.0.1:4173/app/settings");
    await page
      .getByRole("heading", { name: "A little more like you." })
      .waitFor();
    await page.screenshot({ path: `${out}/settings-${label}.png` });
    await page
      .getByRole("combobox", { name: "Theme", exact: true })
      .selectOption("light");
    await page.screenshot({ path: `${out}/settings-light-${label}.png` });
    await page.goto("http://127.0.0.1:4173/app/contribute");
    await page.getByRole("tab", { name: "Create contributor account" }).click();
    await page.screenshot({ path: `${out}/contributor-register-${label}.png` });
    // QA fixture only: supplied proposed starter, no invented localized copy.
    await page.route("**/api/v1/auth/me", (route) =>
      route.fulfill({
        json: {
          id: "qa-reviewer",
          email: "reviewer@example.test",
          role: "contributor",
          displayName: "QA reviewer",
        },
      }),
    );
    await page.route("**/api/v1/microtasks/queue", (route) =>
      route.fulfill({
        json: {
          queue: [
            {
              id: "qa-entry",
              utterance: "Bitcoin ni nini?",
              meaning: "What is Bitcoin?",
              style: "sheng",
              contributor_key: "other-reviewer",
              status: "pending",
              created_at: "2026-10-02T08:00:00Z",
            },
          ],
        },
      }),
    );
    await page.evaluate(() =>
      localStorage.setItem("afribit.authToken", "qa-fixture-token"),
    );
    await page.reload();
    await page.getByRole("tab", { name: "Review phrases" }).click();
    await page
      .getByRole("heading", { name: "Bitcoin ni nini?", exact: true })
      .waitFor();
    await page.screenshot({ path: `${out}/contributor-review-${label}.png` });
  }
  await context.close();
}
const onboardingContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  colorScheme: "dark",
  serviceWorkers: "block",
});
const onboardingPage = await onboardingContext.newPage();
await onboardingPage.goto("http://127.0.0.1:4173/app");
await onboardingPage.getByRole("dialog").waitFor();
await onboardingPage.evaluate(() => document.fonts.ready);
await onboardingPage.screenshot({ path: `${out}/onboarding-mobile.png` });
await onboardingContext.close();
// Actual DevTools throttling: 150ms latency, 1.6Mbps download and 4x CPU.
// Browser contexts are cold and the service worker is blocked.
for (const route of ["/", "/app"]) {
  const runs = [];
  for (let run = 0; run < 3; run++) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      colorScheme: "dark",
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: 1_600_000 / 8,
      uploadThroughput: 750_000 / 8,
      connectionType: "cellular4g",
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.addInitScript(() => {
      localStorage.setItem("afribit.onboarded", "true");
      window.qaLcp = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) window.qaLcp = entry.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    });
    await page.goto(`http://127.0.0.1:4173${route}`, {
      waitUntil: "domcontentloaded",
    });
    if (route === "/app")
      await page.getByRole("textbox", { name: "Your question" }).waitFor();
    else await page.getByRole("heading", { level: 1 }).waitFor();
    const interactive = await page.evaluate(() => performance.now());
    await page.evaluate(() => document.fonts.ready);
    const values = await page.evaluate(() => ({
      interactive: performance.now(),
      lcp: window.qaLcp,
      resources: performance
        .getEntriesByType("resource")
        .map((e) => ({ name: e.name, bytes: e.transferSize })),
    }));
    runs.push({
      interactive,
      lcp: values.lcp,
      resourceBytes: values.resources.reduce((sum, e) => sum + e.bytes, 0),
    });
    await context.close();
  }
  metrics[route] = runs;
  const median = (values) => [...values].sort((a, b) => a - b)[1];
  if (route === "/app" && median(runs.map((run) => run.interactive)) >= 3000)
    failures.push({
      budget: "App interactive <3000ms",
      median: median(runs.map((run) => run.interactive)),
    });
  if (route === "/" && median(runs.map((run) => run.lcp)) >= 2500)
    failures.push({
      budget: "Landing LCP <2500ms",
      median: median(runs.map((run) => run.lcp)),
    });
}
writeFileSync(
  `${out}/metrics.json`,
  JSON.stringify(
    {
      profile: {
        latencyMs: 150,
        downloadMbps: 1.6,
        cpu: 4,
        viewport: "390x844",
        server: "Vite preview",
      },
      metrics,
      failures,
    },
    null,
    2,
  ),
);
await browser.close();
console.log(JSON.stringify({ metrics, failures }, null, 2));
if (failures.length) process.exitCode = 1;
