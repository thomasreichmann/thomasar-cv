/**
 * The default, ATS-clean template. Single-page A4, single column, built on the
 * standard Helvetica family so the text layer is real and verbatim with no font
 * registration (see `docs/decisions/0002-pdf-engine.md`). The StyleSheet and
 * per-block mapping are lifted from the #17 spike's `react-pdf.tsx`, which is the
 * layout the engine decision was proven against.
 */
import { Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { Block } from "../model";
import type { ResumeTemplate } from "../template";

const s = StyleSheet.create({
  page: {
    paddingVertical: 40,
    paddingHorizontal: 44,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1a1a1a",
    lineHeight: 1.35,
  },
  name: { fontFamily: "Helvetica-Bold", fontSize: 22 },
  contacts: { fontSize: 9, color: "#555", marginTop: 3 },
  availability: { fontSize: 9, color: "#555", marginTop: 1 },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    marginTop: 14,
    marginBottom: 4,
    borderBottomWidth: 0.75,
    borderBottomColor: "#bbb",
    paddingBottom: 2,
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  rowLeft: { fontFamily: "Helvetica-Bold", fontSize: 10.5 },
  rowRight: { fontSize: 9, color: "#555" },
  sub: { fontSize: 9, color: "#555" },
  bulletRow: { flexDirection: "row", marginTop: 1 },
  bulletGlyph: { width: 10 },
  bulletText: { flex: 1 },
  text: { marginTop: 2 },
});

function renderBlock(b: Block, i: number) {
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
  renderPage(blocks) {
    return (
      <Page size="A4" style={s.page}>
        {blocks.map(renderBlock)}
      </Page>
    );
  },
};
