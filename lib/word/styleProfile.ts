import JSZip from "jszip";

export interface WordStyleProfile {
  sourceFileName: string;
  bodyFontPx: number;
  bodyLineHeightRatio: number;
  paragraphAfterPx: number;
  contentWidthPx: number;
  pageHeightPx: number;
  pageMarginTopPx: number;
  pageMarginBottomPx: number;
  titleFontPx: number;
  titleColor: string;
  titleAlign: "left" | "center" | "right";
  bodyFontFamily: string;
  titleFontFamily: string;
  discoveredFonts: string[];
  tableCellPaddingTopPx: number;
  tableCellPaddingLeftPx: number;
  tableCellPaddingBottomPx: number;
  tableCellPaddingRightPx: number;
  paragraphProfiles: ParagraphStyleProfile[];
  trailingDateText: string | null;
  trailingDateAlignedRight: boolean;
  trailingDateParagraphIndex: number | null;
  trailingEmptyParagraphCountBeforeDate: number;
}

export interface ParagraphStyleProfile {
  index: number;
  text: string;
  isEmpty: boolean;
  align: "left" | "center" | "right";
  beforePx: number | null;
  afterPx: number | null;
  lineHeightRatio: number | null;
  indentLeftPx: number | null;
  indentRightPx: number | null;
  firstLinePx: number | null;
  hangingPx: number | null;
  listNumId: number | null;
  listLevel: number | null;
  listFormat: string | null;
  listTextPattern: string | null;
  listStartAt: number;
  keepNext: boolean;
  keepLines: boolean;
  pageBreakBefore: boolean;
  sectionBreakBefore: boolean;
  runs: RunStyleProfile[];
}

export interface RunStyleProfile {
  text: string;
  fontSizePx: number | null;
  color: string | null;
  highlightColor: string | null;
  shadingColor: string | null;
  charSpacingPx: number | null;
  shadow: boolean;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  superscript: boolean;
  subscript: boolean;
  fontFamily: string | null;
}

const FALLBACK_PROFILE: Omit<WordStyleProfile, "sourceFileName"> = {
  bodyFontPx: 14.6667,
  bodyLineHeightRatio: 1.158333,
  paragraphAfterPx: 10.67,
  contentWidthPx: 553.73,
  pageHeightPx: 1122.53,
  pageMarginTopPx: 96,
  pageMarginBottomPx: 96,
  titleFontPx: 32,
  titleColor: "#0F4761",
  titleAlign: "center",
  bodyFontFamily: "\"Times New Roman\", \"Noto Serif SC\", serif",
  titleFontFamily: "DengXian, \"Noto Sans SC\", \"Microsoft YaHei\", sans-serif",
  discoveredFonts: [],
  tableCellPaddingTopPx: 0,
  tableCellPaddingLeftPx: 7.2,
  tableCellPaddingBottomPx: 0,
  tableCellPaddingRightPx: 7.2,
  paragraphProfiles: [],
  trailingDateText: null,
  trailingDateAlignedRight: false,
  trailingDateParagraphIndex: null,
  trailingEmptyParagraphCountBeforeDate: 0
};

function twipToPx(twip: number): number {
  return twip / 15;
}

function getAttr(node: Element | null, attr: string): string | null {
  if (!node) return null;
  return node.getAttribute(attr);
}

function getTwipAttr(node: Element | null, attr: string): number | null {
  const raw = getAttr(node, attr);
  if (!raw) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function queryByLocalName(root: ParentNode, localName: string): Element | null {
  const all = Array.from(root.querySelectorAll("*"));
  return all.find((el) => el.localName === localName) ?? null;
}

function queryAllByLocalName(root: ParentNode, localName: string): Element[] {
  const all = Array.from(root.querySelectorAll("*"));
  return all.filter((el) => el.localName === localName);
}

function parseXml(xmlText: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(xmlText, "application/xml");
}

function parsePageGeometry(documentXml: Document): {
  contentWidthPx: number | null;
  pageHeightPx: number | null;
  marginTopPx: number | null;
  marginBottomPx: number | null;
} {
  const sectPr = queryByLocalName(documentXml, "sectPr");
  if (!sectPr) {
    return {
      contentWidthPx: null,
      pageHeightPx: null,
      marginTopPx: null,
      marginBottomPx: null
    };
  }

  const pgSz = queryAllByLocalName(sectPr, "pgSz")[0] ?? null;
  const pgMar = queryAllByLocalName(sectPr, "pgMar")[0] ?? null;
  const pageW = getTwipAttr(pgSz, "w:w") ?? getTwipAttr(pgSz, "w") ?? null;
  const pageH = getTwipAttr(pgSz, "w:h") ?? getTwipAttr(pgSz, "h") ?? null;
  const left = getTwipAttr(pgMar, "w:left") ?? getTwipAttr(pgMar, "left") ?? 0;
  const right = getTwipAttr(pgMar, "w:right") ?? getTwipAttr(pgMar, "right") ?? 0;
  const top = getTwipAttr(pgMar, "w:top") ?? getTwipAttr(pgMar, "top") ?? null;
  const bottom = getTwipAttr(pgMar, "w:bottom") ?? getTwipAttr(pgMar, "bottom") ?? null;

  return {
    contentWidthPx: pageW === null ? null : twipToPx(pageW - left - right),
    pageHeightPx: pageH === null ? null : twipToPx(pageH),
    marginTopPx: top === null ? null : twipToPx(top),
    marginBottomPx: bottom === null ? null : twipToPx(bottom)
  };
}

function parseHeadingAlignFromDocument(documentXml: Document): "left" | "center" | "right" | null {
  const paragraphs = queryAllByLocalName(documentXml, "p");
  for (const paragraph of paragraphs) {
    const pPr = queryAllByLocalName(paragraph, "pPr")[0] ?? null;
    if (!pPr) continue;

    const pStyle = queryAllByLocalName(pPr, "pStyle")[0] ?? null;
    const styleVal = getAttr(pStyle, "w:val") ?? getAttr(pStyle, "val") ?? "";
    const isHeading = styleVal === "1" || styleVal.toLowerCase().includes("heading");
    if (!isHeading) continue;

    const jc = queryAllByLocalName(pPr, "jc")[0] ?? null;
    const alignRaw = (getAttr(jc, "w:val") ?? getAttr(jc, "val") ?? "").toLowerCase();
    if (alignRaw === "center") return "center";
    if (alignRaw === "right") return "right";
    return "left";
  }

  return null;
}

function parseParagraphText(paragraph: Element): string {
  const textNodes = queryAllByLocalName(paragraph, "t");
  return textNodes.map((node) => node.textContent ?? "").join("").trim();
}

function parseParagraphAlign(paragraph: Element): "left" | "center" | "right" {
  const pPr = queryAllByLocalName(paragraph, "pPr")[0] ?? null;
  const jc = pPr ? queryAllByLocalName(pPr, "jc")[0] ?? null : null;
  const alignRaw = (getAttr(jc, "w:val") ?? getAttr(jc, "val") ?? "").toLowerCase();
  if (alignRaw === "center") return "center";
  if (alignRaw === "right") return "right";
  return "left";
}

function parseTrailingDateAnchor(documentXml: Document): {
  trailingDateText: string | null;
  trailingDateAlignedRight: boolean;
  trailingDateParagraphIndex: number | null;
  trailingEmptyParagraphCountBeforeDate: number;
} {
  const paragraphs = queryAllByLocalName(documentXml, "p");
  if (paragraphs.length === 0) {
    return {
      trailingDateText: null,
      trailingDateAlignedRight: false,
      trailingDateParagraphIndex: null,
      trailingEmptyParagraphCountBeforeDate: 0
    };
  }

  let lastNonEmptyIndex = -1;
  for (let i = paragraphs.length - 1; i >= 0; i -= 1) {
    if (parseParagraphText(paragraphs[i]).length > 0) {
      lastNonEmptyIndex = i;
      break;
    }
  }

  if (lastNonEmptyIndex < 0) {
    return {
      trailingDateText: null,
      trailingDateAlignedRight: false,
      trailingDateParagraphIndex: null,
      trailingEmptyParagraphCountBeforeDate: 0
    };
  }

  const dateParagraph = paragraphs[lastNonEmptyIndex];
  const dateText = parseParagraphText(dateParagraph);
  const looksLikeDate = /\d{4}\s*年\s*\d+\s*月\s*\d+\s*日/.test(dateText);
  const align = parseParagraphAlign(dateParagraph);

  let trailingEmpty = 0;
  for (let i = lastNonEmptyIndex - 1; i >= 0; i -= 1) {
    if (parseParagraphText(paragraphs[i]).length === 0) {
      trailingEmpty += 1;
      continue;
    }
    break;
  }

  return {
    trailingDateText: looksLikeDate ? dateText : null,
    trailingDateAlignedRight: looksLikeDate && align === "right",
    trailingDateParagraphIndex: looksLikeDate ? lastNonEmptyIndex : null,
    trailingEmptyParagraphCountBeforeDate: looksLikeDate ? trailingEmpty : 0
  };
}

type NumberingLevelSpec = {
  numFmt: string | null;
  lvlText: string | null;
  startAt: number;
};

function toInt(value: string | null): number | null {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

function parseNumberingMap(numberingXml: Document | null): Map<string, NumberingLevelSpec> {
  const levelMap = new Map<string, NumberingLevelSpec>();
  if (!numberingXml) return levelMap;

  const abstractMap = new Map<number, Map<number, NumberingLevelSpec>>();
  const abstractNums = queryAllByLocalName(numberingXml, "abstractNum");
  for (const abs of abstractNums) {
    const absId = toInt(getAttr(abs, "w:abstractNumId") ?? getAttr(abs, "abstractNumId"));
    if (absId === null) continue;

    const lvlNodes = queryAllByLocalName(abs, "lvl");
    const lvlMap = new Map<number, NumberingLevelSpec>();
    for (const lvl of lvlNodes) {
      const ilvl = toInt(getAttr(lvl, "w:ilvl") ?? getAttr(lvl, "ilvl"));
      if (ilvl === null) continue;
      const numFmtNode = queryAllByLocalName(lvl, "numFmt")[0] ?? null;
      const lvlTextNode = queryAllByLocalName(lvl, "lvlText")[0] ?? null;
      lvlMap.set(ilvl, {
        numFmt: getAttr(numFmtNode, "w:val") ?? getAttr(numFmtNode, "val") ?? null,
        lvlText: getAttr(lvlTextNode, "w:val") ?? getAttr(lvlTextNode, "val") ?? null,
        startAt: toInt(getAttr(queryAllByLocalName(lvl, "start")[0] ?? null, "w:val") ?? getAttr(queryAllByLocalName(lvl, "start")[0] ?? null, "val")) ?? 1
      });
    }
    abstractMap.set(absId, lvlMap);
  }

  const nums = queryAllByLocalName(numberingXml, "num");
  for (const num of nums) {
    const numId = toInt(getAttr(num, "w:numId") ?? getAttr(num, "numId"));
    if (numId === null) continue;
    const abstractRefNode = queryAllByLocalName(num, "abstractNumId")[0] ?? null;
    const absId = toInt(getAttr(abstractRefNode, "w:val") ?? getAttr(abstractRefNode, "val"));
    if (absId === null) continue;
    const lvlMap = abstractMap.get(absId);
    if (!lvlMap) continue;
    for (const [lvl, spec] of lvlMap.entries()) {
      levelMap.set(`${numId}:${lvl}`, spec);
    }
  }

  return levelMap;
}

function parseParagraphProfiles(documentXml: Document, numberingMap: Map<string, NumberingLevelSpec>): ParagraphStyleProfile[] {
  const paragraphs = queryAllByLocalName(documentXml, "p");
  return paragraphs.map((paragraph, index) => {
    const text = parseParagraphText(paragraph);
    const pPr = queryAllByLocalName(paragraph, "pPr")[0] ?? null;
    const spacing = pPr ? queryAllByLocalName(pPr, "spacing")[0] ?? null : null;
    const ind = pPr ? queryAllByLocalName(pPr, "ind")[0] ?? null : null;
    const numPr = pPr ? queryAllByLocalName(pPr, "numPr")[0] ?? null : null;
    const ilvlNode = numPr ? queryAllByLocalName(numPr, "ilvl")[0] ?? null : null;
    const numIdNode = numPr ? queryAllByLocalName(numPr, "numId")[0] ?? null : null;
    const listLevel = toInt(getAttr(ilvlNode, "w:val") ?? getAttr(ilvlNode, "val"));
    const listNumId = toInt(getAttr(numIdNode, "w:val") ?? getAttr(numIdNode, "val"));
    const listSpec = listNumId !== null && listLevel !== null ? numberingMap.get(`${listNumId}:${listLevel}`) : undefined;
    const keepNextNode = pPr ? queryAllByLocalName(pPr, "keepNext")[0] ?? null : null;
    const keepLinesNode = pPr ? queryAllByLocalName(pPr, "keepLines")[0] ?? null : null;
    const pageBreakBeforeNode = pPr ? queryAllByLocalName(pPr, "pageBreakBefore")[0] ?? null : null;
    const sectionBreakNode = pPr ? queryAllByLocalName(pPr, "sectPr")[0] ?? null : null;

    const before = getTwipAttr(spacing, "w:before") ?? getTwipAttr(spacing, "before") ?? null;
    const after = getTwipAttr(spacing, "w:after") ?? getTwipAttr(spacing, "after") ?? null;
    const line = getTwipAttr(spacing, "w:line") ?? getTwipAttr(spacing, "line") ?? null;

    const left = getTwipAttr(ind, "w:left") ?? getTwipAttr(ind, "left") ?? null;
    const right = getTwipAttr(ind, "w:right") ?? getTwipAttr(ind, "right") ?? null;
    const firstLine = getTwipAttr(ind, "w:firstLine") ?? getTwipAttr(ind, "firstLine") ?? null;
    const hanging = getTwipAttr(ind, "w:hanging") ?? getTwipAttr(ind, "hanging") ?? null;
    const runs = parseRunProfiles(paragraph);

    return {
      index,
      text,
      isEmpty: text.length === 0,
      align: parseParagraphAlign(paragraph),
      beforePx: before === null ? null : twipToPx(before),
      afterPx: after === null ? null : twipToPx(after),
      lineHeightRatio: line === null ? null : line / 240,
      indentLeftPx: left === null ? null : twipToPx(left),
      indentRightPx: right === null ? null : twipToPx(right),
      firstLinePx: firstLine === null ? null : twipToPx(firstLine),
      hangingPx: hanging === null ? null : twipToPx(hanging),
      listNumId,
      listLevel,
      listFormat: listSpec?.numFmt ?? null,
      listTextPattern: listSpec?.lvlText ?? null,
      listStartAt: listSpec?.startAt ?? 1,
      keepNext: keepNextNode !== null && (getAttr(keepNextNode, "w:val") ?? getAttr(keepNextNode, "val") ?? "1") !== "0",
      keepLines: keepLinesNode !== null && (getAttr(keepLinesNode, "w:val") ?? getAttr(keepLinesNode, "val") ?? "1") !== "0",
      pageBreakBefore:
        pageBreakBeforeNode !== null &&
        (getAttr(pageBreakBeforeNode, "w:val") ?? getAttr(pageBreakBeforeNode, "val") ?? "1") !== "0",
      sectionBreakBefore: sectionBreakNode !== null,
      runs
    };
  });
}

function parseTableDefaults(stylesXml: Document): {
  topPx: number | null;
  leftPx: number | null;
  bottomPx: number | null;
  rightPx: number | null;
} {
  const tableStyles = queryAllByLocalName(stylesXml, "style").filter((style) => {
    const type = (getAttr(style, "w:type") ?? getAttr(style, "type") ?? "").toLowerCase();
    return type === "table";
  });

  const targetStyle =
    tableStyles.find((style) => {
      const styleId = (getAttr(style, "w:styleId") ?? getAttr(style, "styleId") ?? "").toLowerCase();
      return styleId === "a1";
    }) ?? tableStyles[0] ?? null;

  if (!targetStyle) {
    return { topPx: null, leftPx: null, bottomPx: null, rightPx: null };
  }

  const tblPr = queryAllByLocalName(targetStyle, "tblPr")[0] ?? null;
  const tblCellMar = tblPr ? queryAllByLocalName(tblPr, "tblCellMar")[0] ?? null : null;
  const top = tblCellMar ? queryAllByLocalName(tblCellMar, "top")[0] ?? null : null;
  const left = tblCellMar ? queryAllByLocalName(tblCellMar, "left")[0] ?? null : null;
  const bottom = tblCellMar ? queryAllByLocalName(tblCellMar, "bottom")[0] ?? null : null;
  const right = tblCellMar ? queryAllByLocalName(tblCellMar, "right")[0] ?? null : null;

  return {
    topPx: (() => {
      const v = getTwipAttr(top, "w:w") ?? getTwipAttr(top, "w") ?? null;
      return v === null ? null : twipToPx(v);
    })(),
    leftPx: (() => {
      const v = getTwipAttr(left, "w:w") ?? getTwipAttr(left, "w") ?? null;
      return v === null ? null : twipToPx(v);
    })(),
    bottomPx: (() => {
      const v = getTwipAttr(bottom, "w:w") ?? getTwipAttr(bottom, "w") ?? null;
      return v === null ? null : twipToPx(v);
    })(),
    rightPx: (() => {
      const v = getTwipAttr(right, "w:w") ?? getTwipAttr(right, "w") ?? null;
      return v === null ? null : twipToPx(v);
    })()
  };
}

function parseRunProfiles(paragraph: Element): RunStyleProfile[] {
  const runNodes = queryAllByLocalName(paragraph, "r");
  return runNodes
    .map((run) => {
      const rPr = queryAllByLocalName(run, "rPr")[0] ?? null;
      const textNodes = queryAllByLocalName(run, "t");
      const breakNodes = queryAllByLocalName(run, "br");

      let text = textNodes.map((node) => node.textContent ?? "").join("");
      if (breakNodes.length > 0) {
        text += "\n".repeat(breakNodes.length);
      }

      if (!text) {
        return null;
      }

      const sz = rPr ? queryAllByLocalName(rPr, "sz")[0] ?? null : null;
      const halfPoints = getTwipAttr(sz, "w:val") ?? getTwipAttr(sz, "val") ?? null;
      const fontSizePx = halfPoints === null ? null : (halfPoints / 2) * (96 / 72);

      const colorNode = rPr ? queryAllByLocalName(rPr, "color")[0] ?? null : null;
      const colorRaw = getAttr(colorNode, "w:val") ?? getAttr(colorNode, "val") ?? null;
      const color = colorRaw && colorRaw.toLowerCase() !== "auto" ? `#${colorRaw}` : null;
      const highlightNode = rPr ? queryAllByLocalName(rPr, "highlight")[0] ?? null : null;
      const highlightRaw = (getAttr(highlightNode, "w:val") ?? getAttr(highlightNode, "val") ?? "").toLowerCase();
      const highlightMap: Record<string, string> = {
        yellow: "#fff59d",
        green: "#b9f6ca",
        cyan: "#b2ebf2",
        magenta: "#f8bbd0",
        blue: "#bbdefb",
        red: "#ffcdd2",
        darkyellow: "#fbc02d",
        darkgreen: "#66bb6a",
        darkblue: "#64b5f6",
        darkred: "#e57373",
        darkcyan: "#4dd0e1",
        darkmagenta: "#ba68c8",
        gray: "#e0e0e0",
        lightgray: "#f5f5f5"
      };
      const highlightColor = highlightRaw && highlightRaw !== "none" ? highlightMap[highlightRaw] ?? null : null;
      const shdNode = rPr ? queryAllByLocalName(rPr, "shd")[0] ?? null : null;
      const shdFill = (getAttr(shdNode, "w:fill") ?? getAttr(shdNode, "fill") ?? "").toLowerCase();
      const shadingColor = shdFill && shdFill !== "auto" ? `#${shdFill}` : null;
      const spacingNode = rPr ? queryAllByLocalName(rPr, "spacing")[0] ?? null : null;
      const spacingVal = getTwipAttr(spacingNode, "w:val") ?? getTwipAttr(spacingNode, "val") ?? null;
      const charSpacingPx = spacingVal === null ? null : (spacingVal / 20) * (96 / 72);

      const bNode = rPr ? queryAllByLocalName(rPr, "b")[0] ?? null : null;
      const iNode = rPr ? queryAllByLocalName(rPr, "i")[0] ?? null : null;
      const uNode = rPr ? queryAllByLocalName(rPr, "u")[0] ?? null : null;
      const strikeNode = rPr ? queryAllByLocalName(rPr, "strike")[0] ?? null : null;
      const shadowNode = rPr ? queryAllByLocalName(rPr, "shadow")[0] ?? null : null;
      const vertAlignNode = rPr ? queryAllByLocalName(rPr, "vertAlign")[0] ?? null : null;

      const bold = bNode !== null && (getAttr(bNode, "w:val") ?? getAttr(bNode, "val") ?? "1") !== "0";
      const italic = iNode !== null && (getAttr(iNode, "w:val") ?? getAttr(iNode, "val") ?? "1") !== "0";
      const underlineVal = (getAttr(uNode, "w:val") ?? getAttr(uNode, "val") ?? "").toLowerCase();
      const underline = uNode !== null && underlineVal !== "none";
      const strike = strikeNode !== null && (getAttr(strikeNode, "w:val") ?? getAttr(strikeNode, "val") ?? "1") !== "0";
      const shadow = shadowNode !== null && (getAttr(shadowNode, "w:val") ?? getAttr(shadowNode, "val") ?? "1") !== "0";
      const vertAlign = (getAttr(vertAlignNode, "w:val") ?? getAttr(vertAlignNode, "val") ?? "").toLowerCase();
      const superscript = vertAlign === "superscript";
      const subscript = vertAlign === "subscript";

      const rFonts = rPr ? queryAllByLocalName(rPr, "rFonts")[0] ?? null : null;
      const fontFamily =
        getAttr(rFonts, "w:eastAsia") ??
        getAttr(rFonts, "eastAsia") ??
        getAttr(rFonts, "w:ascii") ??
        getAttr(rFonts, "ascii") ??
        getAttr(rFonts, "w:hAnsi") ??
        getAttr(rFonts, "hAnsi") ??
        null;

      return {
        text,
        fontSizePx,
        color,
        highlightColor,
        shadingColor,
        charSpacingPx,
        shadow,
        bold,
        italic,
        underline,
        strike,
        superscript,
        subscript,
        fontFamily
      } satisfies RunStyleProfile;
    })
    .filter((run): run is RunStyleProfile => run !== null);
}

function parseDefaults(stylesXml: Document): {
  bodyFontPx: number | null;
  bodyLineHeightRatio: number | null;
  paragraphAfterPx: number | null;
} {
  const docDefaults = queryByLocalName(stylesXml, "docDefaults");
  if (!docDefaults) {
    return { bodyFontPx: null, bodyLineHeightRatio: null, paragraphAfterPx: null };
  }

  const rPrDefault = queryByLocalName(docDefaults, "rPrDefault");
  const sz = rPrDefault ? queryByLocalName(rPrDefault, "sz") : null;
  const halfPoints = getTwipAttr(sz, "w:val") ?? getTwipAttr(sz, "val") ?? null;
  const bodyFontPx = halfPoints === null ? null : (halfPoints / 2) * (96 / 72);

  const pPrDefault = queryByLocalName(docDefaults, "pPrDefault");
  const spacing = pPrDefault ? queryByLocalName(pPrDefault, "spacing") : null;

  const line = getTwipAttr(spacing, "w:line") ?? getTwipAttr(spacing, "line") ?? null;
  const lineRule = (getAttr(spacing, "w:lineRule") ?? getAttr(spacing, "lineRule") ?? "auto").toLowerCase();
  const bodyLineHeightRatio = line === null ? null : lineRule === "auto" ? line / 240 : line / 240;

  const after = getTwipAttr(spacing, "w:after") ?? getTwipAttr(spacing, "after") ?? null;
  const paragraphAfterPx = after === null ? null : twipToPx(after);

  return { bodyFontPx, bodyLineHeightRatio, paragraphAfterPx };
}

function parseHeading1Style(stylesXml: Document): {
  titleFontPx: number | null;
  titleColor: string | null;
} {
  const styles = queryAllByLocalName(stylesXml, "style");
  const headingStyle = styles.find((style) => {
    const styleId = (getAttr(style, "w:styleId") ?? getAttr(style, "styleId") ?? "").toLowerCase();
    const nameNode = queryByLocalName(style, "name");
    const nameVal = (getAttr(nameNode, "w:val") ?? getAttr(nameNode, "val") ?? "").toLowerCase();
    return styleId === "1" || nameVal === "heading 1" || nameVal === "标题 1";
  });

  if (!headingStyle) {
    return { titleFontPx: null, titleColor: null };
  }

  const rPr = queryByLocalName(headingStyle, "rPr");
  const sz = rPr ? queryByLocalName(rPr, "sz") : null;
  const halfPoints = getTwipAttr(sz, "w:val") ?? getTwipAttr(sz, "val") ?? null;
  const titleFontPx = halfPoints === null ? null : (halfPoints / 2) * (96 / 72);

  const colorNode = rPr ? queryByLocalName(rPr, "color") : null;
  const colorRaw = getAttr(colorNode, "w:val") ?? getAttr(colorNode, "val") ?? null;
  const titleColor = colorRaw ? `#${colorRaw}` : null;

  return { titleFontPx, titleColor };
}

function parseFontTableFamilies(fontTableXml: Document | null): string[] {
  if (!fontTableXml) return [];
  const fontNodes = queryAllByLocalName(fontTableXml, "font");
  const families = fontNodes
    .map((node) => getAttr(node, "w:name") ?? getAttr(node, "name") ?? "")
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
  return [...new Set(families)];
}

function hasFontLike(families: string[], candidates: string[]): boolean {
  return families.some((family) =>
    candidates.some((candidate) => family.toLowerCase().includes(candidate.toLowerCase()))
  );
}

function inferBodyFontFamily(families: string[]): string {
  if (hasFontLike(families, ["times new roman"])) {
    return "\"Times New Roman\", \"Noto Serif SC\", serif";
  }
  if (hasFontLike(families, ["dengxian", "等线", "yahei", "hei", "song"])) {
    return "DengXian, \"Microsoft YaHei\", \"PingFang SC\", \"Noto Sans SC\", sans-serif";
  }
  return FALLBACK_PROFILE.bodyFontFamily;
}

function inferTitleFontFamily(families: string[]): string {
  if (hasFontLike(families, ["dengxian", "等线"])) {
    return "DengXian, \"Noto Sans SC\", \"Microsoft YaHei\", sans-serif";
  }
  if (hasFontLike(families, ["times new roman"])) {
    return "\"Times New Roman\", \"Noto Serif SC\", serif";
  }
  return FALLBACK_PROFILE.titleFontFamily;
}

export async function parseDocxStyleProfile(file: File): Promise<WordStyleProfile> {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  const documentXmlText = await zip.file("word/document.xml")?.async("string");
  const stylesXmlText = await zip.file("word/styles.xml")?.async("string");
  const fontTableXmlText = await zip.file("word/fontTable.xml")?.async("string");
  const numberingXmlText = await zip.file("word/numbering.xml")?.async("string");

  if (!documentXmlText || !stylesXmlText) {
    throw new Error("DOCX missing document.xml or styles.xml");
  }

  const documentXml = parseXml(documentXmlText);
  const stylesXml = parseXml(stylesXmlText);
  const fontTableXml = fontTableXmlText ? parseXml(fontTableXmlText) : null;
  const numberingXml = numberingXmlText ? parseXml(numberingXmlText) : null;
  const numberingMap = parseNumberingMap(numberingXml);

  const defaults = parseDefaults(stylesXml);
  const heading1 = parseHeading1Style(stylesXml);
  const tableDefaults = parseTableDefaults(stylesXml);
  const pageGeometry = parsePageGeometry(documentXml);
  const titleAlign = parseHeadingAlignFromDocument(documentXml);
  const trailingDate = parseTrailingDateAnchor(documentXml);
  const discoveredFonts = parseFontTableFamilies(fontTableXml);
  const bodyFontFamily = inferBodyFontFamily(discoveredFonts);
  const titleFontFamily = inferTitleFontFamily(discoveredFonts);
  const paragraphProfiles = parseParagraphProfiles(documentXml, numberingMap);

  return {
    sourceFileName: file.name,
    bodyFontPx: defaults.bodyFontPx ?? FALLBACK_PROFILE.bodyFontPx,
    bodyLineHeightRatio: defaults.bodyLineHeightRatio ?? FALLBACK_PROFILE.bodyLineHeightRatio,
    paragraphAfterPx: defaults.paragraphAfterPx ?? FALLBACK_PROFILE.paragraphAfterPx,
    contentWidthPx: pageGeometry.contentWidthPx ?? FALLBACK_PROFILE.contentWidthPx,
    pageHeightPx: pageGeometry.pageHeightPx ?? FALLBACK_PROFILE.pageHeightPx,
    pageMarginTopPx: pageGeometry.marginTopPx ?? FALLBACK_PROFILE.pageMarginTopPx,
    pageMarginBottomPx: pageGeometry.marginBottomPx ?? FALLBACK_PROFILE.pageMarginBottomPx,
    titleFontPx: heading1.titleFontPx ?? FALLBACK_PROFILE.titleFontPx,
    titleColor: heading1.titleColor ?? FALLBACK_PROFILE.titleColor,
    titleAlign: titleAlign ?? FALLBACK_PROFILE.titleAlign,
    bodyFontFamily,
    titleFontFamily,
    discoveredFonts,
    tableCellPaddingTopPx: tableDefaults.topPx ?? FALLBACK_PROFILE.tableCellPaddingTopPx,
    tableCellPaddingLeftPx: tableDefaults.leftPx ?? FALLBACK_PROFILE.tableCellPaddingLeftPx,
    tableCellPaddingBottomPx: tableDefaults.bottomPx ?? FALLBACK_PROFILE.tableCellPaddingBottomPx,
    tableCellPaddingRightPx: tableDefaults.rightPx ?? FALLBACK_PROFILE.tableCellPaddingRightPx,
    paragraphProfiles,
    trailingDateText: trailingDate.trailingDateText,
    trailingDateAlignedRight: trailingDate.trailingDateAlignedRight,
    trailingDateParagraphIndex: trailingDate.trailingDateParagraphIndex,
    trailingEmptyParagraphCountBeforeDate: trailingDate.trailingEmptyParagraphCountBeforeDate
  };
}
