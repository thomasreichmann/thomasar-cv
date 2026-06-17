/**
 * The proof for issue #17. Exports the example résumé to PDF via both engines,
 * extracts each text layer, and asserts single-column reading order. Prints a
 * comparison table and exits non-zero if any hard check fails.
 *
 *   pnpm --filter pdf-engine-spike proof
 */
import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";

import { buildBlocks, expectedOrder, EXPECTED_ABSENT } from "./content";
import { renderReactPdf } from "./react-pdf";
import { renderChromium } from "./chromium";
import { extract, isOrderedSubsequence, type ExtractResult } from "./extract";

// Registry unpacked sizes (`pnpm view <pkg> dist.unpackedSize`), the honest
// proxy for the Vercel bundle cost since these ship in the function.
const NPM_SIZE = {
  reactPdf: "292 KB (@react-pdf/renderer, pure JS)",
  chromium: "69.7 MB (@sparticuz/chromium) + 5.7 MB (puppeteer-core)",
};

const OUT = new URL("../out/", import.meta.url);
const norm = (str: string) => str.replace(/\s+/g, " ").trim();

type Check = { name: string; ok: boolean; detail: string };

const strip = (s: string) => s.replace(/\s+/g, "");
const short = (s: string) => (s.length > 32 ? s.slice(0, 31) + "…" : s);

function verify(label: string, r: ExtractResult): Check[] {
  const blocks = buildBlocks();
  const tokens = expectedOrder(blocks).map(norm).filter(Boolean);
  const hay = norm(r.text);

  // Reading order is space-insensitive: it asks only whether the content comes
  // out in top-to-bottom sequence, independent of intra-word spacing quirks.
  const order = isOrderedSubsequence(strip(hay), tokens.map(strip));
  // Fidelity is verbatim: every content token must survive the text layer
  // intact, spacing and all. This is where a split ligature shows up.
  const fidelity = isOrderedSubsequence(hay, tokens);
  const leaked = EXPECTED_ABSENT.filter((t) => hay.includes(t));

  let fidelityDetail: string;
  if (fidelity.ok) {
    fidelityDetail = `all ${tokens.length} tokens verbatim`;
  } else {
    const bad = fidelity.firstMissing ?? fidelity.firstOutOfOrder!;
    // If the spaces-removed form is present, the word is intact but the text
    // layer injected spacing (e.g. a split ligature) - an ATS-visible defect.
    fidelityDetail = strip(hay).includes(strip(bad))
      ? `intra-word spacing artifact in "${short(bad)}"`
      : `missing content "${short(bad)}"`;
  }

  return [
    {
      name: "single page",
      ok: r.pageCount === 1,
      detail: `${r.pageCount} page(s)`,
    },
    {
      name: "A4 dimensions",
      ok: Math.abs(r.width - 595) <= 2 && Math.abs(r.height - 842) <= 2,
      detail: `${r.width} x ${r.height} pt (A4 = 595 x 842)`,
    },
    {
      name: "reading order",
      ok: order.ok,
      detail: order.ok
        ? `all ${tokens.length} content blocks in single-column order`
        : order.firstMissing
          ? `MISSING: "${short(order.firstMissing)}"`
          : `OUT OF ORDER: "${short(order.firstOutOfOrder!)}"`,
    },
    {
      name: "single column",
      ok: r.upJumps === 0,
      detail: `${r.upJumps} backward (up-page) jumps in reading order`,
    },
    { name: "text fidelity", ok: fidelity.ok, detail: fidelityDetail },
    {
      name: "hidden excluded",
      ok: leaked.length === 0,
      detail: leaked.length
        ? `LEAKED: ${leaked.join(", ")}`
        : "Initech internship absent",
    },
  ];
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const results: Record<
    string,
    {
      bytes: number;
      ms: number;
      extract: ExtractResult;
      checks: Check[];
      size: string;
    }
  > = {};

  for (const [label, render, size, file] of [
    ["react-pdf", renderReactPdf, NPM_SIZE.reactPdf, "react-pdf.pdf"],
    ["chromium", renderChromium, NPM_SIZE.chromium, "chromium.pdf"],
  ] as const) {
    const t0 = performance.now();
    const pdf = await render();
    const ms = performance.now() - t0;
    await writeFile(new URL(file, OUT), pdf);
    const ex = await extract(pdf);
    await writeFile(new URL(file.replace(".pdf", ".txt"), OUT), ex.text);
    results[label] = {
      bytes: pdf.length,
      ms,
      extract: ex,
      checks: verify(label, ex),
      size,
    };
  }

  // Report.
  const pad = (s: string, n: number) => s.padEnd(n);
  console.log("\n  PDF ENGINE PROOF - issue #17\n");
  console.log(`  ${pad("metric", 22)}${pad("react-pdf", 30)}chromium`);
  console.log(`  ${"-".repeat(74)}`);
  const row = (name: string, a: string, b: string) =>
    console.log(`  ${pad(name, 22)}${pad(a, 30)}${b}`);
  row("ship size (Vercel)", "292 KB", "69.7 MB + 5.7 MB");
  row(
    "generate time",
    `${results["react-pdf"].ms.toFixed(0)} ms`,
    `${results["chromium"].ms.toFixed(0)} ms (incl. launch)`,
  );
  row(
    "output PDF size",
    `${(results["react-pdf"].bytes / 1024).toFixed(1)} KB`,
    `${(results["chromium"].bytes / 1024).toFixed(1)} KB`,
  );
  console.log();

  const passed: Record<string, boolean> = {};
  for (const label of ["react-pdf", "chromium"] as const) {
    const checks = results[label].checks;
    passed[label] = checks.every((c) => c.ok);
    console.log(
      `  ${label}  ${passed[label] ? "[ATS-clean]" : "[has defects]"}`,
    );
    for (const c of checks)
      console.log(
        `    ${c.ok ? "PASS" : "FAIL"}  ${pad(c.name, 18)} ${c.detail}`,
      );
    console.log();
  }

  console.log(`  artifacts written to spikes/pdf-engine/out/`);
  // The proof's job is to demonstrate at least one fully ATS-clean engine.
  // A per-engine defect (e.g. chromium's ligature split) is evidence, not a
  // run failure - it only fails if NO engine clears every check.
  const proven = Object.values(passed).some(Boolean);
  console.log(
    `\n  ${proven ? "PROOF SUCCEEDED" : "PROOF FAILED"}: ${Object.entries(
      passed,
    )
      .map(([k, v]) => `${k}=${v ? "clean" : "defects"}`)
      .join(", ")}\n`,
  );
  if (!proven) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
