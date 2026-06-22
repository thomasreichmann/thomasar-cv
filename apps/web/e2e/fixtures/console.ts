import { test as base, expect, type ConsoleMessage } from "@playwright/test";

/**
 * Base fixture that fails a test if the page logged a console error or threw an
 * uncaught error. It catches the class of regression that doesn't break an
 * assertion but still signals something is wrong: React / Base UI dev-time
 * errors (logged through console.error), hydration mismatches, or a failed
 * request surfaced to the console. The check is `auto`, so every spec built on
 * this fixture gets it without opting in; the other fixtures (authenticated,
 * resume) extend this, so it rides along with the whole suite.
 */
export const test = base.extend<{ failOnConsoleError: void }>({
  failOnConsoleError: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("console", (message: ConsoleMessage) => {
        if (message.type() === "error") errors.push(message.text());
      });
      page.on("pageerror", (error) => errors.push(String(error)));

      await use();

      expect(
        errors,
        `the page logged ${errors.length} console error(s):\n${errors.join("\n")}`,
      ).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
