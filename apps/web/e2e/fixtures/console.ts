import { test as base, expect, type ConsoleMessage } from "@playwright/test";

/**
 * Base fixture that fails a test if the page logged a console error or threw an
 * uncaught error. It catches the class of regression that doesn't break an
 * assertion but still signals something is wrong: React / Base UI dev-time
 * errors (logged through console.error), hydration mismatches, or a failed
 * request surfaced to the console. The check is `auto`, so every spec built on
 * this fixture gets it without opting in; the other fixtures (authenticated,
 * resume) extend this, so it rides along with the whole suite.
 *
 * `expectedConsoleErrors` is the escape hatch for a test that legitimately
 * provokes a console error - e.g. asserting a 404, which the browser logs as a
 * failed resource load. A spec declares the patterns it expects with
 * `test.use({ expectedConsoleErrors: [/.../] })`; matching messages are dropped
 * and anything else still fails the test, so the guard stays strict for the
 * errors nobody asked for.
 */
export const test = base.extend<{
  expectedConsoleErrors: RegExp[];
  failOnConsoleError: void;
}>({
  expectedConsoleErrors: [[], { option: true }],
  failOnConsoleError: [
    async ({ page, expectedConsoleErrors }, use) => {
      const errors: string[] = [];
      page.on("console", (message: ConsoleMessage) => {
        if (message.type() === "error") errors.push(message.text());
      });
      page.on("pageerror", (error) => errors.push(String(error)));

      await use();

      const unexpected = errors.filter(
        (error) => !expectedConsoleErrors.some((pattern) => pattern.test(error)),
      );
      expect(
        unexpected,
        `the page logged ${unexpected.length} unexpected console error(s):\n${unexpected.join("\n")}`,
      ).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
