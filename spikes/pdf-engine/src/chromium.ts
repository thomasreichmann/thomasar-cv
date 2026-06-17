/**
 * Engine B: headless Chromium prints the HTML to PDF. Locally this uses
 * Playwright's bundled Chromium; on Vercel the same engine ships via
 * @sparticuz/chromium (~70MB). Same print path either way, so the fidelity and
 * text-layer result here transfers; only the serverless cold-start cost differs
 * (recorded in the ADR from the package size).
 */
import { chromium } from "playwright";

import { buildHtml } from "./html-template";

export async function renderChromium(): Promise<Buffer> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(buildHtml(), { waitUntil: "networkidle" });
    return await page.pdf({ format: "A4", printBackground: true });
  } finally {
    await browser.close();
  }
}
