import { describe, expect, it } from "vitest";
import { buildCoverageReport } from "@/lib/word/coverage";
import type { WordStyleProfile } from "@/lib/word/styleProfile";

function mockProfile(): WordStyleProfile {
  return {
    sourceFileName: "x.docx",
    bodyFontPx: 14,
    bodyLineHeightRatio: 1.2,
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
    paragraphProfiles: [
      {
        index: 0,
        text: "A",
        isEmpty: false,
        align: "left",
        beforePx: null,
        afterPx: 10,
        lineHeightRatio: 1.2,
        indentLeftPx: null,
        indentRightPx: null,
        firstLinePx: null,
        hangingPx: null,
        listNumId: 1,
        listLevel: 0,
        listFormat: "decimal",
        listTextPattern: "%1.",
        listStartAt: 1,
        keepNext: false,
        keepLines: false,
        pageBreakBefore: false,
        sectionBreakBefore: false,
        runs: [
          {
            text: "A",
            fontSizePx: 16,
            color: "#111",
            highlightColor: null,
            shadingColor: null,
            charSpacingPx: null,
            shadow: false,
            bold: true,
            italic: false,
            underline: false,
            strike: false,
            superscript: false,
            subscript: false,
            fontFamily: "Times New Roman"
          }
        ]
      }
    ],
    trailingDateText: null,
    trailingDateAlignedRight: false,
    trailingDateParagraphIndex: null,
    trailingEmptyParagraphCountBeforeDate: 0
  };
}

describe("buildCoverageReport", () => {
  it("builds score from profile", () => {
    const report = buildCoverageReport(mockProfile());
    expect(report.total).toBeGreaterThan(0);
    expect(report.supportedCount).toBeGreaterThan(0);
    expect(report.score).toBeGreaterThan(0);
  });

  it("returns low score when no profile", () => {
    const report = buildCoverageReport(null);
    expect(report.supportedCount).toBe(0);
  });
});
