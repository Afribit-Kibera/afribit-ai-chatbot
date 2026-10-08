import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const answer =
  "Bitcoin is an open digital money system. People can send value to each other through a network of computers.";
async function setup(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("afribit.onboarded", "true");
    if (!localStorage.getItem("afribit.preferences"))
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
}
async function chatMock(
  page: Page,
  kind: "normal" | "secret" | "rate" | "partial" | "unsupported" = "normal",
) {
  const requests: Record<string, unknown>[] = [];
  await page.route("**/api/v1/chat/stream", async (route) => {
    requests.push(route.request().postDataJSON());
    if (kind === "rate")
      return route.fulfill({ status: 429, json: { error: "Rate limited" } });
    if (kind === "unsupported") return route.fulfill({ status: 404 });
    const events = [
      {
        type: "meta",
        sessionId: "test-session",
        safetyFlag: kind === "secret" ? "password" : null,
      },
      {
        type: "delta",
        text:
          kind === "secret"
            ? "Please do not share passwords."
            : answer.slice(0, 40),
      },
      ...(kind === "secret" ? [] : [{ type: "delta", text: answer.slice(40) }]),
      ...(kind === "partial"
        ? []
        : [{ type: "done", messageId: "test-message", usedFallback: false }]),
    ];
    await route.fulfill({
      contentType: "application/x-ndjson",
      body: events.map((e) => JSON.stringify(e)).join("\n") + "\n",
    });
  });
  await page.route("**/api/v1/chat", (route) =>
    route.fulfill({
      json: {
        sessionId: "fallback-session",
        messageId: "fallback-message",
        content: answer,
        safetyFlag: null,
        usedFallback: true,
      },
    }),
  );
  return requests;
}
async function ask(page: Page, question = "What is Bitcoin?") {
  await page.getByRole("textbox", { name: "Your question" }).fill(question);
  await page
    .getByRole("button", { name: "Send question", exact: true })
    .click();
}
async function axe(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(result.violations).toEqual([]);
}
test("landing primary journey, draft privacy and complete onboarding", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Good questions.",
  );
  await axe(page);
  await page
    .getByRole("link", { name: "Try Afribit AI", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await axe(page);
  await dialog.getByRole("button", { name: "Sheng", exact: true }).click();
  await dialog.getByRole("button", { name: "Continue", exact: true }).click();
  await dialog.getByRole("button", { name: "Deep", exact: false }).click();
  await dialog.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(dialog).toContainText("hosted AI provider");
  await dialog.getByRole("button", { name: "Let's start learning" }).click();
  await expect(page.getByLabel("Answer language")).toHaveValue("sheng");
  await expect(page.getByLabel("Explanation level")).toHaveValue("deep");
  expect(errors).toEqual([]);
});
test("prerendered public pages work without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Good questions.",
  );
  await page.getByText("Can the AI be wrong?", { exact: true }).click();
  await expect(
    page.getByText("Yes. It uses community-reviewed knowledge", {
      exact: false,
    }),
  ).toBeVisible();
  await page.goto("http://127.0.0.1:4173/privacy");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("DRAFT");
  await context.close();
});
test("first streamed answer, language choice and history survive reload", async ({
  page,
}) => {
  await setup(page);
  const requests = await chatMock(page);
  await page.goto("/app");
  await page.getByLabel("Answer language").selectOption("sheng");
  await page.getByLabel("Explanation level").selectOption("deep");
  await ask(page);
  await expect(page.locator(".assistant-message .message-text")).toHaveText(
    answer,
  );
  await expect(
    page.getByRole("button", { name: "Helpful answer" }),
  ).toBeVisible();
  expect(requests[0]).toMatchObject({
    languageMode: "sheng",
    explanationLevel: "deep",
  });
  await axe(page);
  const history = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("afribit.conversations.v1")!),
  );
  expect(history[0].sessionId).toBe("test-session");
  expect(history[0].messages).toHaveLength(2);
  await page.reload();
  await expect(page.getByLabel("Answer language")).toHaveValue("sheng");
  await expect(page.getByLabel("Explanation level")).toHaveValue("deep");
});
test("streaming fallback and interrupted answer are honest", async ({
  page,
}) => {
  await setup(page);
  await chatMock(page, "unsupported");
  await page.goto("/app");
  await ask(page);
  await expect(page.locator(".assistant-message .message-text")).toHaveText(
    answer,
  );
  await page.getByText("How this answer was made", { exact: true }).click();
  await expect(
    page.getByText("Answered using the knowledge fallback."),
  ).toBeVisible();
});
test("partial stream keeps a visibly incomplete answer", async ({ page }) => {
  await setup(page);
  await chatMock(page, "partial");
  await page.goto("/app");
  await ask(page);
  await expect(
    page.getByText("This answer was interrupted. It may be incomplete."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Helpful answer" }),
  ).toHaveCount(0);
});
test("seed phrase help is always reachable", async ({ page }) => {
  await setup(page);
  const requests = await chatMock(page);
  await page.goto("/app");
  await page
    .getByRole("button", {
      name: "Someone asked for my seed phrase",
      exact: true,
    })
    .click();
  await expect(page.locator(".assistant-message .message-text")).toHaveText(
    answer,
  );
  expect(requests[0]?.message).toBe(
    "Someone asked for my seed phrase. Should I share it?",
  );
});
test("fake secret refusal removes the prompt from local history and draft", async ({
  page,
}) => {
  await setup(page);
  await chatMock(page, "secret");
  await page.goto("/app");
  await ask(page, "My password is FAKE-TEST-PASSWORD-NEVER-REAL");
  await expect(
    page.getByRole("heading", { name: "Let's keep your secrets out of chat." }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Your question" }),
  ).toHaveValue("");
  const storage = await page.evaluate(() => JSON.stringify(localStorage));
  expect(storage).not.toContain("FAKE-TEST-PASSWORD");
  await axe(page);
});
test("feedback failure does not show success; report sharing requires opt-in", async ({
  page,
}) => {
  await setup(page);
  await chatMock(page);
  await page.goto("/app");
  await ask(page);
  let feedback: unknown;
  let fail = true;
  await page.route("**/api/v1/messages/*/feedback", (route) => {
    feedback = route.request().postDataJSON();
    return route.fulfill({ status: fail ? 500 : 201, json: { ok: !fail } });
  });
  await page
    .getByRole("button", {
      name: "Report a wrong or unsafe answer",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog");
  await axe(page);
  const link = dialog.getByRole("link", { name: "Open a GitHub report" });
  expect(await link.getAttribute("href")).not.toContain(
    encodeURIComponent(answer),
  );
  await dialog
    .getByLabel("Include this question and answer in the GitHub report")
    .check();
  expect(await link.getAttribute("href")).toContain(encodeURIComponent(answer));
  await dialog.getByLabel("What needs attention?").selectOption("unsafe");
  await dialog
    .getByLabel("Anything else? (optional)")
    .fill("Please review this.");
  await dialog.getByRole("button", { name: "Send feedback" }).click();
  await expect(
    dialog.getByText("Your feedback wasn't sent. Please try again."),
  ).toBeVisible();
  fail = false;
  await dialog.getByRole("button", { name: "Send feedback" }).click();
  await expect(
    dialog.getByText("Thank you. Your feedback was sent for review."),
  ).toBeVisible();
  expect(feedback).toEqual({
    rating: "not_helpful",
    reason: "unsafe",
    comment: "Please review this.",
  });
});
test("offline keeps a draft and disables sending", async ({
  page,
  context,
}) => {
  await setup(page);
  await page.goto("/app");
  await page
    .getByRole("textbox", { name: "Your question" })
    .fill("I want to learn more");
  await context.setOffline(true);
  await expect(
    page.getByText("You're offline. Your draft stays on this device.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send question", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(() => localStorage.getItem("afribit.draft")),
  ).toContain("I want to learn more");
  await context.setOffline(false);
  await expect(
    page.getByRole("button", { name: "Send question", exact: true }),
  ).toBeEnabled();
});
test("rate limit keeps the question for a later retry", async ({ page }) => {
  await setup(page);
  await chatMock(page, "rate");
  await page.goto("/app");
  await ask(page);
  await expect(
    page.getByText("Too many questions just now. Try again in a minute."),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Your question" }),
  ).toHaveValue("What is Bitcoin?");
});
test("settings light theme, text size and UI language work accessibly", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/app/settings");
  await page
    .getByRole("combobox", { name: "Theme", exact: true })
    .selectOption("light");
  await page
    .getByRole("combobox", { name: "Text size" })
    .selectOption("largest");
  await axe(page);
  await page
    .getByRole("combobox", { name: "Interface language" })
    .selectOption("sw");
  await expect(
    page.getByText("Interface translation is awaiting community review.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
test("contributor sign-in errors, phrase submit, review and naturalness vote", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/app/contribute");
  await axe(page);
  let reject = true;
  await page.route("**/api/v1/auth/login", (route) =>
    route.fulfill({
      status: reject ? 401 : 200,
      json: reject
        ? { error: "Wrong email or password." }
        : { token: "test-token", role: "contributor" },
    }),
  );
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({
      json: {
        id: "reviewer",
        email: "reviewer@example.org",
        role: "contributor",
        displayName: "Reviewer",
      },
    }),
  );
  await page.getByLabel("Email", { exact: true }).fill("reviewer@example.org");
  await page
    .getByLabel("Password", { exact: true })
    .fill("TEST-NOT-REAL-PASSWORD");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Wrong email or password.")).toBeVisible();
  reject = false;
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.route("**/api/v1/microtasks/language-entries", (route) =>
    route.fulfill({ status: 201, json: { id: "new" } }),
  );
  await page
    .getByLabel("A phrase people actually use")
    .fill("TEST PHRASE FOR UI VERIFICATION");
  await page
    .getByRole("button", { name: "Send for community review", exact: true })
    .click();
  await expect(
    page.getByText(
      "Thank you. Your phrase has been sent for review before it can be used.",
    ),
  ).toBeVisible();
  await page.route("**/api/v1/microtasks/queue", (route) =>
    route.fulfill({
      json: {
        queue: [
          {
            id: "entry",
            utterance: "TEST REVIEW PHRASE",
            meaning: "Test only",
            style: "sheng",
            contributor_key: "other",
            created_at: "2026-10-02",
          },
        ],
      },
    }),
  );
  let vote: unknown;
  await page.route(
    "**/api/v1/microtasks/language-entries/entry/vote",
    (route) => {
      vote = route.request().postDataJSON();
      return route.fulfill({ status: 201, json: { ok: true } });
    },
  );
  await page.route(
    "**/api/v1/microtasks/language-entries/entry/review",
    (route) => route.fulfill({ status: 201, json: { ok: true } }),
  );
  await page.getByRole("tab", { name: "Review phrases" }).click();
  await page.getByRole("button", { name: "5", exact: true }).click();
  await page.getByRole("button", { name: "Send language rating" }).click();
  expect(vote).toEqual({ naturalness: 5 });
  await page.getByRole("button", { name: "Send review", exact: true }).click();
  await expect(
    page.getByText("No phrases waiting for your review right now."),
  ).toBeVisible();
});

test("a delayed stream shows partial words before completion and can be stopped", async ({
  page,
}) => {
  await setup(page);
  await page.addInitScript(() => {
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      if (String(input).endsWith("/api/v1/chat/stream")) {
        const encoder = new TextEncoder();
        const body = new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(
                '{"type":"meta","sessionId":"delayed","safetyFlag":null}\n',
              ),
            );
            const token = window.setTimeout(
              () =>
                controller.enqueue(
                  encoder.encode(
                    '{"type":"delta","text":"Bitcoin is an open"}\n',
                  ),
                ),
              250,
            );
            const done = window.setTimeout(() => {
              controller.enqueue(
                encoder.encode(
                  '{"type":"delta","text":" digital money system."}\n{"type":"done","messageId":"delayed-message","usedFallback":false}\n',
                ),
              );
              controller.close();
            }, 2500);
            init?.signal?.addEventListener("abort", () => {
              clearTimeout(token);
              clearTimeout(done);
              controller.error(new DOMException("Aborted", "AbortError"));
            });
          },
        });
        return new Response(body, {
          headers: { "Content-Type": "application/x-ndjson" },
        });
      }
      return originalFetch(input, init);
    };
  });
  await page.goto("/app");
  await ask(page);
  await expect(page.locator(".assistant-message .message-text")).toHaveText(
    "Bitcoin is an open",
  );
  await expect(
    page.getByRole("button", { name: "Helpful answer" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Stop answer" })).toBeVisible();
  await page.getByRole("button", { name: "Stop answer" }).click();
  await expect(
    page.getByText("This answer was interrupted. It may be incomplete."),
  ).toBeVisible();
});
test("conversation history refreshes from the server and removal is explicit", async ({
  page,
}) => {
  await setup(page);
  await chatMock(page);
  await page.goto("/app");
  await ask(page);
  await expect(
    page.getByRole("button", { name: "Helpful answer" }),
  ).toBeVisible();
  await page.route("**/api/v1/chat/test-session", (route) =>
    route.fulfill({
      json: {
        sessionId: "test-session",
        messages: [
          {
            id: "u",
            role: "user",
            content: "What is Bitcoin?",
            created_at: "2026-10-02",
          },
          {
            id: "a",
            role: "assistant",
            content: answer,
            created_at: "2026-10-02",
          },
        ],
      },
    }),
  );
  if (
    await page.getByRole("button", { name: "Open conversations" }).isVisible()
  )
    await page.getByRole("button", { name: "Open conversations" }).click();
  await page
    .locator(".history-row")
    .filter({ hasText: "What is Bitcoin?" })
    .getByRole("button", { name: "What is Bitcoin?", exact: true })
    .click();
  await expect(page.locator(".assistant-message .message-text")).toHaveText(
    answer,
  );
  if (
    await page.getByRole("button", { name: "Open conversations" }).isVisible()
  )
    await page.getByRole("button", { name: "Open conversations" }).click();
  await page
    .getByRole("button", { name: "Remove conversation: What is Bitcoin?" })
    .click();
  const dialog = page
    .getByRole("dialog")
    .filter({ hasText: "Delete this conversation?" });
  await expect(dialog).toContainText("remove it only from this phone");
  await dialog.getByRole("button", { name: "Remove from this device" }).click();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("afribit.conversations.v1")!),
    ),
  ).toEqual([]);
});
test("privacy label follows the server, and Delete everywhere deletes on the server", async ({
  page,
}) => {
  // F-001 / F-002 (docs/features): the server says where the model runs and how long chats are kept.
  await page.route("**/api/v1/pack", (route) =>
    route.fulfill({
      json: {
        name: "Afribit AI",
        modes: [{ id: "simple_en", label: "English" }],
        service: {
          modelLocation: "community",
          retention: { mode: "none", days: null },
        },
      },
    }),
  );
  const deleted: string[] = [];
  await page.route("**/api/v1/chat/test-session", (route) => {
    if (route.request().method() === "DELETE") {
      deleted.push(route.request().url());
      return route.fulfill({ status: 204 });
    }
    return route.fallback();
  });
  await setup(page);
  const requests = await chatMock(page);
  await page.goto("/app");
  await expect(
    page.getByRole("button", { name: "Where your questions go: Stays here" }),
  ).toBeVisible();
  await expect(page.locator(".empty-state .privacy-line")).toContainText(
    "Your questions stay here. Chats are not stored on the server",
  );
  await ask(page);
  await expect(page.locator(".assistant-message .message-text")).toHaveText(
    answer,
  );
  await ask(page, "And a wallet?");
  await expect
    .poll(() => (requests.at(-1)?.history as unknown[] | undefined)?.length)
    .toBe(2);
  if (
    await page.getByRole("button", { name: "Open conversations" }).isVisible()
  )
    await page.getByRole("button", { name: "Open conversations" }).click();
  await page
    .getByRole("button", { name: "Remove conversation: What is Bitcoin?" })
    .click();
  const dialog = page
    .getByRole("dialog")
    .filter({ hasText: "Delete this conversation?" });
  await dialog.getByRole("button", { name: "Delete everywhere" }).click();
  await expect.poll(() => deleted.length).toBe(1);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("afribit.conversations.v1")!),
    ),
  ).toEqual([]);
});
test("say it your way: a member suggests wording; nothing is used without a reviewer", async ({
  page,
}) => {
  // F-003 (docs/features/F-003-say-it-your-way.md).
  const suggestions: Record<string, unknown>[] = [];
  await page.route("**/api/v1/teach", (route) => {
    suggestions.push(route.request().postDataJSON());
    return route.fulfill({ status: 201, json: { ok: true, id: "t1" } });
  });
  await setup(page);
  await chatMock(page);
  await page.goto("/app");
  await ask(page);
  await expect(page.locator(".assistant-message .message-text")).toHaveText(
    answer,
  );
  await page.getByRole("button", { name: "Say it your way" }).click();
  const dialog = page.getByRole("dialog").filter({ hasText: "A community reviewer reads every suggestion" });
  await expect(dialog.locator(".teach-original")).toHaveText(answer);
  await expect(dialog.getByRole("checkbox", { name: /Improving the assistant/ })).toBeChecked();
  await expect(dialog.getByRole("checkbox", { name: /Training future versions/ })).not.toBeChecked();
  await dialog.getByRole("textbox", { name: "How would you say it?" }).fill("Bitcoin ni pesa ya digital, msee.");
  await dialog.getByRole("button", { name: "Send to the reviewers" }).click();
  await expect(dialog).toContainText("Nothing changes for anyone else until then.");
  expect(suggestions).toHaveLength(1);
  expect(suggestions[0]).toMatchObject({
    suggestion: "Bitcoin ni pesa ya digital, msee.",
    answerText: answer,
    questionText: "What is Bitcoin?",
    consent: { answers: true, testing: false, training: false },
  });
});
test("keyboard focus stays inside a dialog and Escape returns to its trigger", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Keyboard-only desktop interaction.",
  );
  await setup(page);
  await chatMock(page);
  await page.goto("/app");
  await ask(page);
  const trigger = page.getByRole("button", {
    name: "Report a wrong or unsafe answer",
  });
  await trigger.focus();
  await page.keyboard.press("Enter");
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() =>
        document
          .querySelector('[role="dialog"]')!
          .contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
