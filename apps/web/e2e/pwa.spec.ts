import { test, expect } from "@playwright/test";
test.use({ serviceWorkers: "allow" });
test("installed shell reloads offline with its CSS and draft", async ({
  page,
  context,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("afribit.onboarded", "true");
  });
  await page.goto("/app");
  await page.getByRole("textbox", { name: "Your question" }).waitFor();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) throw Error("Worker is not active");
  });
  await page
    .getByRole("textbox", { name: "Your question" })
    .fill("A draft for when I reconnect");
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("textbox", { name: "Your question" }),
  ).toHaveValue("A draft for when I reconnect");
  await expect(
    page.getByRole("button", { name: "Send question", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("You're offline. Your draft stays on this device.", {
      exact: false,
    }),
  ).toBeVisible();
  const stylesheet = await page.evaluate(
    () => getComputedStyle(document.querySelector(".composer")!).borderTopStyle,
  );
  expect(stylesheet).toBe("solid");
  await page.goto("http://127.0.0.1:4173/app/settings", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", { name: "A little more like you." }),
  ).toBeVisible();
  await context.setOffline(false);
});
