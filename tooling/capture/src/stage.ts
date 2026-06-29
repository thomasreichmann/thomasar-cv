import type { Locator, Page } from "@playwright/test";

const CURSOR_ID = "__capture_cursor";

/**
 * The fake-cursor styling: a soft dot that eases between targets so the recording
 * reads as a person using the app. Playwright's video doesn't capture the real
 * pointer, so this stand-in is the only on-screen sign of intent - without it the
 * UI appears to change on its own.
 */
const CURSOR_STYLE = `
  #${CURSOR_ID} { position: fixed; z-index: 2147483647; width: 22px; height: 22px;
    margin-left: -11px; margin-top: -11px; border-radius: 9999px;
    background: rgba(255,255,255,.92);
    box-shadow: 0 0 0 2px rgba(0,0,0,.35), 0 2px 10px rgba(0,0,0,.45);
    pointer-events: none; left: 50%; top: 72%;
    transition: left .5s cubic-bezier(.22,.61,.36,1), top .5s cubic-bezier(.22,.61,.36,1), transform .12s ease; }
  #${CURSOR_ID}.tap { transform: scale(.65); }
`;

/**
 * A thin, recording-aware wrapper over a Playwright page. It drives the page
 * through a fake cursor and tracks when the first real action happens, so the
 * runner can trim the load/settle head off the final clip automatically.
 */
export class Stage {
  private firstActionAt: number | null = null;

  constructor(
    private readonly page: Page,
    private readonly baseUrl: string,
    private readonly startedAt: number,
  ) {}

  /** Escape hatch to the underlying page for anything the helpers don't cover (locators, keyboard, etc.). */
  get raw(): Page {
    return this.page;
  }

  /** Offset in seconds, on the video clock, of the first action; null if the scene drove nothing. */
  get firstActionOffset(): number | null {
    return this.firstActionAt === null ? null : this.firstActionAt / 1000;
  }

  async goto(path: string): Promise<void> {
    const url = path.startsWith("http") ? path : `${this.baseUrl}${path}`;
    // A generous timeout for a Next dev cold-compile of the route, and
    // domcontentloaded rather than networkidle - the latter never settles
    // against Next's dev/HMR traffic, and `waitFor()` is the real content gate.
    await this.page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await this.injectCursor();
  }

  /** Wait for a key element (the live-preview <canvas>, a heading) before driving. */
  async waitFor(selector: string, timeoutMs = 45_000): Promise<void> {
    await this.page.waitForSelector(selector, { timeout: timeoutMs });
  }

  /** Hold on the loaded, idle UI so entry animations and the first render finish. */
  async settle(ms = 1400): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  async pause(ms = 900): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  /** Glide the cursor to a target and click it, with a brief press animation. `holdMs` is the dwell after, where the effect (e.g. a re-render) plays out. */
  async moveClick(target: Locator, holdMs = 1300): Promise<void> {
    this.markAction();
    await this.glideTo(target);
    await this.setTap(true);
    await this.page.waitForTimeout(130);
    await target.click();
    await this.setTap(false);
    await this.page.waitForTimeout(holdMs);
  }

  /** Move the cursor to a field and type into it, replacing any current value. */
  async type(target: Locator, text: string, perCharMs = 55): Promise<void> {
    this.markAction();
    await this.glideTo(target);
    await target.click();
    await target.fill("");
    await this.page.keyboard.type(text, { delay: perCharMs });
    await this.page.waitForTimeout(900);
  }

  private markAction(): void {
    if (this.firstActionAt === null)
      this.firstActionAt = Date.now() - this.startedAt;
  }

  private async glideTo(target: Locator): Promise<void> {
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    if (!box)
      throw new Error(
        "Target has no bounding box (off-screen or not rendered?).",
      );
    const x = Math.round(box.x + box.width / 2);
    const y = Math.round(box.y + box.height / 2);
    await this.page.evaluate(
      ({ id, x, y }) => {
        const el = document.getElementById(id);
        if (el) {
          el.style.left = `${x}px`;
          el.style.top = `${y}px`;
        }
      },
      { id: CURSOR_ID, x, y },
    );
    // Match the CSS ease duration so the click lands once the dot has arrived.
    await this.page.waitForTimeout(620);
  }

  private async setTap(on: boolean): Promise<void> {
    await this.page.evaluate(
      ({ id, on }) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle("tap", on);
      },
      { id: CURSOR_ID, on },
    );
  }

  private async injectCursor(): Promise<void> {
    await this.page.addStyleTag({ content: CURSOR_STYLE });
    await this.page.evaluate((id) => {
      if (document.getElementById(id)) return;
      const el = document.createElement("div");
      el.id = id;
      document.body.appendChild(el);
    }, CURSOR_ID);
  }
}
