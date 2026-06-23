/**
 * The default, ATS-clean template. Single-page A4, single column, built on the
 * standard Helvetica family so the text layer is real and verbatim with no font
 * registration (see `docs/decisions/0002-pdf-engine.md`). The StyleSheet and
 * per-block mapping are lifted from the #17 spike's `react-pdf.tsx`, which is the
 * layout the engine decision was proven against.
 */
import { Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { ResumeTheme } from "@thomasar-cv/db/schema";

import type { Block } from "../model";
import type { ResumeTemplate } from "../template";
import { resolveTheme } from "../theme";

type Styles = ReturnType<typeof createStyles>;

/**
 * Build the StyleSheet for one theme. Font sizes go through `fs` (scaled) and
 * inter-block margins through `sp` (the spacing multiplier), so the theme's
 * three numeric controls land in exactly one place each; the accent colors the
 * name and section headings. Page padding is left fixed: it is the A4 margin,
 * which the theme deliberately does not move. The `normal` theme resolves every
 * multiplier to 1 and `graphite` to the original near-black, so this reproduces
 * the template's original StyleSheet verbatim.
 */
function createStyles(theme: ResumeTheme) {
  const { scale, lineHeight, spacing, accent } = resolveTheme(theme);
  const fs = (pt: number) => pt * scale;
  const sp = (pt: number) => pt * spacing;
  return StyleSheet.create({
    page: {
      paddingVertical: 40,
      paddingHorizontal: 44,
      fontFamily: "Helvetica",
      fontSize: fs(10),
      color: "#1a1a1a",
      lineHeight,
    },
    name: { fontFamily: "Helvetica-Bold", fontSize: fs(22), color: accent },
    contacts: { fontSize: fs(9), color: "#555", marginTop: sp(3) },
    availability: { fontSize: fs(9), color: "#555", marginTop: sp(1) },
    sectionTitle: {
      fontFamily: "Helvetica-Bold",
      fontSize: fs(11),
      color: accent,
      marginTop: sp(14),
      marginBottom: sp(4),
      borderBottomWidth: 0.75,
      borderBottomColor: "#bbb",
      paddingBottom: 2,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: sp(6),
    },
    rowLeft: { fontFamily: "Helvetica-Bold", fontSize: fs(10.5) },
    rowRight: { fontSize: fs(9), color: "#555" },
    sub: { fontSize: fs(9), color: "#555" },
    bulletRow: { flexDirection: "row", marginTop: sp(1) },
    // The hanging indent is a type dimension, so it scales with the font; left
    // fixed, a larger `scale` would shrink the gap before bullet text.
    bulletGlyph: { width: fs(10) },
    bulletText: { flex: 1 },
    text: { marginTop: sp(2) },
  });
}

function renderBlock(b: Block, i: number, s: Styles) {
  switch (b.t) {
    case "name":
      return (
        <Text key={i} style={s.name}>
          {b.text}
        </Text>
      );
    case "contacts":
      return (
        <Text key={i} style={s.contacts}>
          {b.text}
        </Text>
      );
    case "availability":
      return (
        <Text key={i} style={s.availability}>
          {b.text}
        </Text>
      );
    case "sectionTitle":
      return (
        <Text key={i} style={s.sectionTitle}>
          {b.text}
        </Text>
      );
    case "row":
      return (
        <View key={i} style={s.row}>
          <Text style={s.rowLeft}>{b.left}</Text>
          {b.right ? <Text style={s.rowRight}>{b.right}</Text> : null}
        </View>
      );
    case "sub":
      return (
        <Text key={i} style={s.sub}>
          {b.text}
        </Text>
      );
    case "bullet":
      return (
        <View key={i} style={s.bulletRow}>
          <Text style={s.bulletGlyph}>•</Text>
          <Text style={s.bulletText}>{b.text}</Text>
        </View>
      );
    case "text":
      return (
        <Text key={i} style={s.text}>
          {b.text}
        </Text>
      );
  }
}

export const atsTemplate: ResumeTemplate = {
  id: "ats",
  label: "ATS (single column)",
  renderPage(blocks, theme) {
    const s = createStyles(theme);
    return (
      <Page size="A4" style={s.page}>
        {blocks.map((b, i) => renderBlock(b, i, s))}
      </Page>
    );
  },
};
