import { describe, expect, it } from "vitest";
import { buildStructureReport } from "@/lib/word/structureCompare";
import type { WordStyleProfile } from "@/lib/word/styleProfile";

function mockProfile(paragraphCount: number): WordStyleProfile {
  return {
    sourceFileName: "x.docx",
    bodyFontPx: 14,
    bodyLineHeightRatio: 1.2,
    bodyLineHeightPx: null,
    bodyLineHeightRule: "auto",
    paragraphAfterPx: 10,
    contentWidthPx: 500,
    pageHeightPx: 1100,
    pageMarginTopPx: 90,
    pageMarginBottomPx: 90,
    titleFontPx: 32,
    titleColor: "#0F4761",
    titleAlign: "center",
    bodyFontFamily: "Times New Roman, serif",
    titleFontFamily: "DengXian, sans-serif",
    discoveredFonts: ["Times New Roman"],
    tableCellPaddingTopPx: 0,
    tableCellPaddingLeftPx: 7,
    tableCellPaddingBottomPx: 0,
    tableCellPaddingRightPx: 7,
    paragraphProfiles: Array.from({ length: paragraphCount }, (_, idx) => ({
      index: idx,
      text: `P${idx}`,
      isEmpty: false,
      align: "left" as const,
      beforePx: null,
      afterPx: 10,
      lineHeightRatio: 1.2,
      lineHeightPx: null,
      lineHeightRule: "auto" as const,
      indentLeftPx: null,
      indentRightPx: null,
      firstLinePx: null,
      hangingPx: null,
      listNumId: null,
      listLevel: null,
      listFormat: null,
      listTextPattern: null,
      listStartAt: 1,
      keepNext: false,
      keepLines: false,
      pageBreakBefore: false,
      sectionBreakBefore: false,
      runs: []
    })),
    trailingDateText: null,
    trailingDateAlignedRight: false,
    trailingDateParagraphIndex: null,
    trailingEmptyParagraphCountBeforeDate: 0
  };
}

function mockProfileWithList(paragraphCount: number, listIndexes: number[]): WordStyleProfile {
  const profile = mockProfile(paragraphCount);
  const listSet = new Set(listIndexes);
  profile.paragraphProfiles = profile.paragraphProfiles.map((p) => ({
    ...p,
    listNumId: listSet.has(p.index) ? 1 : null,
    listLevel: listSet.has(p.index) ? 0 : null,
    listFormat: listSet.has(p.index) ? "bullet" : null
  }));
  return profile;
}

describe("buildStructureReport", () => {
  it("reports stable structure when paragraph count is close to baseline", () => {
    document.body.innerHTML = "<p>A</p><p>B</p><h1>T</h1><img src='x'/>";
    const report = buildStructureReport(document, mockProfile(2));
    expect(report.pass).toBe(true);
  });

  it("reports deviation when paragraph count is far from baseline", () => {
    document.body.innerHTML = "<p>A</p>";
    const report = buildStructureReport(document, mockProfile(20));
    const paragraphRow = report.rows.find((row) => row.name === "段落数(p)");
    expect(paragraphRow?.pass).toBe(false);
  });

  it("counts list items from word-marked list paragraphs", () => {
    document.body.innerHTML = `
      <p data-word-list="1">A</p>
      <p data-word-list="1">B</p>
      <p>C</p>
    `;
    const report = buildStructureReport(document, mockProfileWithList(3, [0, 1]));
    const listRow = report.rows.find((row) => row.name === "列表项(list)");
    expect(listRow?.actual).toBe(2);
    expect(listRow?.expected).toBe(2);
    expect(listRow?.pass).toBe(true);
  });
});
