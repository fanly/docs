import { describe, expect, it } from "vitest";
import { applyWordRenderModel } from "@/lib/word/renderApply";
import type { ParagraphStyleProfile, WordStyleProfile } from "@/lib/word/styleProfile";

function setHeight(el: Element, height: number): void {
  Object.defineProperty(el, "getBoundingClientRect", {
    configurable: true,
    value: () => new DOMRect(0, 0, 500, height)
  });
}

function makeParagraphProfile(index: number, text: string, overrides?: Partial<ParagraphStyleProfile>): ParagraphStyleProfile {
  return {
    index,
    text,
    isEmpty: text.length === 0,
    align: "left",
    beforePx: null,
    afterPx: 10,
    lineHeightRatio: 1.2,
    lineHeightPx: null,
    lineHeightRule: "auto",
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
    runs: text
      ? [
          {
            text,
            fontSizePx: 16,
            color: "#111111",
            highlightColor: null,
            shadingColor: null,
            charSpacingPx: null,
            shadow: false,
            bold: false,
            italic: false,
            underline: false,
            strike: false,
            superscript: false,
            subscript: false,
            fontFamily: "Times New Roman"
          }
        ]
      : [],
    ...overrides
  };
}

function makeProfile(paragraphProfiles: ParagraphStyleProfile[]): WordStyleProfile {
  return {
    sourceFileName: "test.docx",
    bodyFontPx: 14.67,
    bodyLineHeightRatio: 1.158333,
    bodyLineHeightPx: null,
    bodyLineHeightRule: "auto",
    paragraphAfterPx: 10.67,
    contentWidthPx: 553.73,
    pageHeightPx: 220,
    pageMarginTopPx: 60,
    pageMarginBottomPx: 60,
    titleFontPx: 32,
    titleColor: "#0F4761",
    titleAlign: "center",
    bodyFontFamily: "Times New Roman, serif",
    titleFontFamily: "DengXian, sans-serif",
    discoveredFonts: ["Times New Roman"],
    tableCellPaddingTopPx: 0,
    tableCellPaddingLeftPx: 7.2,
    tableCellPaddingBottomPx: 0,
    tableCellPaddingRightPx: 7.2,
    paragraphProfiles,
    trailingDateText: null,
    trailingDateAlignedRight: false,
    trailingDateParagraphIndex: null,
    trailingEmptyParagraphCountBeforeDate: 0
  };
}

describe("applyWordRenderModel", () => {
  it("inserts spacer before keepNext paragraph when current page cannot keep next block", () => {
    document.body.innerHTML = `<p id="p1">A</p><p id="p2">B</p><p id="p3">C</p>`;
    setHeight(document.getElementById("p1")!, 60);
    setHeight(document.getElementById("p2")!, 60);
    setHeight(document.getElementById("p3")!, 60);

    const profile = makeProfile([
      makeParagraphProfile(0, "A"),
      makeParagraphProfile(1, "B", { keepNext: true }),
      makeParagraphProfile(2, "C")
    ]);

    applyWordRenderModel({ doc: document, styleProfile: profile, showFormattingMarks: false });

    const p2 = document.getElementById("p2")!;
    expect(p2.previousElementSibling?.getAttribute("data-word-page-spacer")).toBe("1");
  });

  it("respects pageBreakBefore paragraph rule", () => {
    document.body.innerHTML = `<p id="p1">A</p><p id="p2">B</p>`;
    setHeight(document.getElementById("p1")!, 40);
    setHeight(document.getElementById("p2")!, 40);

    const profile = makeProfile([
      makeParagraphProfile(0, "A"),
      makeParagraphProfile(1, "B", { pageBreakBefore: true })
    ]);

    applyWordRenderModel({ doc: document, styleProfile: profile, showFormattingMarks: false });

    const p2 = document.getElementById("p2")!;
    expect(p2.previousElementSibling?.getAttribute("data-word-page-spacer")).toBe("1");
  });

  it("renders list markers by lvlText pattern and applies run decorations", () => {
    document.body.innerHTML = `<p id="p1">Item1</p><p id="p2">Sub</p>`;
    setHeight(document.getElementById("p1")!, 28);
    setHeight(document.getElementById("p2")!, 28);

    const profile = makeProfile([
      makeParagraphProfile(0, "Item1", {
        listNumId: 10,
        listLevel: 0,
        listFormat: "decimal",
        listTextPattern: "%1.",
        runs: [
          {
            text: "Item1",
            fontSizePx: 16,
            color: "#111111",
            highlightColor: "#fff59d",
            shadingColor: null,
            charSpacingPx: 1,
            shadow: true,
            bold: true,
            italic: false,
            underline: true,
            strike: true,
            superscript: false,
            subscript: false,
            fontFamily: "Times New Roman"
          }
        ]
      }),
      makeParagraphProfile(1, "Sub", {
        listNumId: 10,
        listLevel: 1,
        listFormat: "lowerletter",
        listTextPattern: "%1.%2."
      })
    ]);

    applyWordRenderModel({ doc: document, styleProfile: profile, showFormattingMarks: false });

    const p1 = document.getElementById("p1")!;
    const p2 = document.getElementById("p2")!;
    expect(p1.textContent?.startsWith("1.")).toBe(true);
    expect(p2.textContent?.startsWith("1.a.")).toBe(true);
    expect(p1.innerHTML).toContain("line-through");
    expect(p1.innerHTML).toContain("background-color");
  });

  it("restarts list counter after section break and emits table cell padding css", () => {
    document.body.innerHTML = `<table><tr><td><p id=\"p1\">One</p></td></tr></table><p id=\"p2\">Two</p>`;
    setHeight(document.getElementById("p1")!, 24);
    setHeight(document.getElementById("p2")!, 24);

    const profile = makeProfile([
      makeParagraphProfile(0, "One", {
        listNumId: 9,
        listLevel: 0,
        listFormat: "decimal",
        listTextPattern: "%1."
      }),
      makeParagraphProfile(1, "Two", {
        listNumId: 9,
        listLevel: 0,
        listFormat: "decimal",
        listTextPattern: "%1.",
        sectionBreakBefore: true
      })
    ]);
    profile.tableCellPaddingLeftPx = 20;
    profile.tableCellPaddingRightPx = 21;

    applyWordRenderModel({ doc: document, styleProfile: profile, showFormattingMarks: false });

    const p1 = document.getElementById("p1")!;
    const p2 = document.getElementById("p2")!;
    expect(p1.textContent?.startsWith("1.")).toBe(true);
    expect(p2.textContent?.startsWith("1.")).toBe(true);
    const styleText = document.getElementById("__word_style_profile__")?.textContent ?? "";
    expect(styleText).toContain("padding-left: 20.00px");
    expect(styleText).toContain("padding-right: 21.00px");
  });

  it("enforces content width and constrains oversized images", () => {
    document.body.innerHTML = `
      <div id="wrap">
        <p id="p1">正文内容用于宽度测量。</p>
        <p><img id="img1" src="x" style="width: 1200px !important; height: 500px;" /></p>
      </div>
    `;
    setHeight(document.getElementById("p1")!, 28);

    const profile = makeProfile([
      makeParagraphProfile(0, "正文内容用于宽度测量。"),
      makeParagraphProfile(1, "")
    ]);

    applyWordRenderModel({ doc: document, styleProfile: profile, showFormattingMarks: false });

    expect(document.body.style.getPropertyValue("width")).toBe("553.73px");
    expect(document.body.style.getPropertyPriority("width")).toBe("important");
    const img = document.getElementById("img1") as HTMLElement;
    expect(img.style.getPropertyValue("max-width")).toBe("100%");
    expect(img.style.getPropertyPriority("max-width")).toBe("important");
  });

  it("does not anchor date paragraph to page bottom when there is content after date", () => {
    document.body.innerHTML = `
      <p id="p1">正文</p>
      <p id="p2">2026 年 2 月 5 日</p>
      <p id="p3"><img src="x" /></p>
    `;
    setHeight(document.getElementById("p1")!, 28);
    setHeight(document.getElementById("p2")!, 28);
    setHeight(document.getElementById("p3")!, 80);

    const profile = makeProfile([
      makeParagraphProfile(0, "正文"),
      makeParagraphProfile(1, "2026 年 2 月 5 日", { align: "right" }),
      makeParagraphProfile(2, "")
    ]);
    profile.trailingDateAlignedRight = true;
    profile.trailingDateText = "2026 年 2 月 5 日";
    profile.trailingDateParagraphIndex = 1;
    profile.trailingEmptyParagraphCountBeforeDate = 3;

    applyWordRenderModel({ doc: document, styleProfile: profile, showFormattingMarks: false });

    const dateParagraph = document.getElementById("p2")!;
    expect(dateParagraph.classList.contains("__word-date-anchor")).toBe(false);
    expect((dateParagraph.previousElementSibling as HTMLElement | null)?.id).toBe("p1");
  });

  it("applies fixed pixel line-height for exact/atLeast paragraph rules", () => {
    document.body.innerHTML = `<p id="p1">A</p><p id="p2">B</p>`;
    setHeight(document.getElementById("p1")!, 24);
    setHeight(document.getElementById("p2")!, 24);

    const profile = makeProfile([
      makeParagraphProfile(0, "A", { lineHeightRatio: null, lineHeightPx: 24, lineHeightRule: "exact" }),
      makeParagraphProfile(1, "B", { lineHeightRatio: null, lineHeightPx: 22, lineHeightRule: "atLeast" })
    ]);

    applyWordRenderModel({ doc: document, styleProfile: profile, showFormattingMarks: false });

    expect((document.getElementById("p1") as HTMLElement).style.lineHeight).toBe("24px");
    expect((document.getElementById("p2") as HTMLElement).style.lineHeight).toBe("22px");
  });

  it("does not prepend duplicated list marker when paragraph text already contains marker", () => {
    document.body.innerHTML = `<p id="p1">1. 已存在编号文本</p>`;
    setHeight(document.getElementById("p1")!, 28);

    const profile = makeProfile([
      makeParagraphProfile(0, "已存在编号文本", {
        listNumId: 10,
        listLevel: 0,
        listFormat: "decimal",
        listTextPattern: "%1."
      })
    ]);

    applyWordRenderModel({ doc: document, styleProfile: profile, showFormattingMarks: false });

    const p1 = document.getElementById("p1")!;
    expect(p1.querySelectorAll("span.__word-list-marker").length).toBe(0);
  });

  it("maps profile by source paragraph index and avoids leaking list marker into table paragraphs", () => {
    document.body.innerHTML = `
      <h2 data-word-p-index="0">标题</h2>
      <p id="list" data-word-p-index="1">项目符号一级 4.4</p>
      <table><tr><td><p id="cell" data-word-p-index="2">R1C1 表格单元格</p></td></tr></table>
    `;
    setHeight(document.getElementById("list")!, 28);
    setHeight(document.getElementById("cell")!, 28);

    const profile = makeProfile([
      makeParagraphProfile(0, "标题"),
      makeParagraphProfile(1, "项目符号一级 4.4", {
        listNumId: 2,
        listLevel: 0,
        listFormat: "bullet",
        listTextPattern: "•"
      }),
      makeParagraphProfile(2, "R1C1 表格单元格")
    ]);

    applyWordRenderModel({ doc: document, styleProfile: profile, showFormattingMarks: false });

    const list = document.getElementById("list")!;
    const cell = document.getElementById("cell")!;
    expect(list.querySelectorAll("span.__word-list-marker").length).toBe(1);
    expect(cell.querySelectorAll("span.__word-list-marker").length).toBe(0);
  });
});
