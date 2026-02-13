import { applyWordHtmlCompatibility } from "@/lib/word/htmlCompat";
import type { ParagraphStyleProfile, RunStyleProfile, WordStyleProfile } from "@/lib/word/styleProfile";

interface ApplyWordRenderOptions {
  doc: Document;
  styleProfile: WordStyleProfile | null;
  showFormattingMarks: boolean;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function runStyleToCss(run: RunStyleProfile): string {
  const declarations: string[] = [];
  if (run.fontSizePx !== null) declarations.push(`font-size:${run.fontSizePx.toFixed(2)}px`);
  if (run.color) declarations.push(`color:${run.color}`);
  if (run.highlightColor) declarations.push(`background-color:${run.highlightColor}`);
  if (run.shadingColor) declarations.push(`background-color:${run.shadingColor}`);
  if (run.charSpacingPx !== null) declarations.push(`letter-spacing:${run.charSpacingPx.toFixed(2)}px`);
  if (run.shadow) declarations.push("text-shadow:0.5px 0.5px 0 rgba(0,0,0,0.28)");
  if (run.bold) declarations.push("font-weight:700");
  if (run.italic) declarations.push("font-style:italic");
  const textDecorations: string[] = [];
  if (run.underline) textDecorations.push("underline");
  if (run.strike) textDecorations.push("line-through");
  if (textDecorations.length > 0) declarations.push(`text-decoration:${textDecorations.join(" ")}`);
  if (run.superscript) declarations.push("vertical-align:super");
  if (run.subscript) declarations.push("vertical-align:sub");
  if (run.superscript || run.subscript) declarations.push("font-size:0.83em");
  if (run.fontFamily) declarations.push(`font-family:${run.fontFamily}`);
  return declarations.join(";");
}

function paragraphToRunHtml(runs: RunStyleProfile[]): string {
  return runs
    .map((run) => {
      const css = runStyleToCss(run);
      const parts = run.text.split("\n");
      const html = parts.map((part) => escapeHtml(part)).join("<br/>");
      if (!css) return html;
      return `<span style=\"${css}\">${html}</span>`;
    })
    .join("");
}

function toLowerLetter(n: number): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  if (n <= 0) return "a";
  let x = n;
  let out = "";
  while (x > 0) {
    x -= 1;
    out = alphabet[x % 26] + out;
    x = Math.floor(x / 26);
  }
  return out;
}

function toRoman(num: number): string {
  if (num <= 0) return "I";
  const map: Array<[number, string]> = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]
  ];
  let n = num;
  let result = "";
  for (const [v, s] of map) {
    while (n >= v) {
      result += s;
      n -= v;
    }
  }
  return result;
}

function formatListMarker(format: string | null, counter: number): string {
  switch ((format ?? "").toLowerCase()) {
    case "decimal":
      return `${counter}.`;
    case "lowerletter":
      return `${toLowerLetter(counter)}.`;
    case "upperletter":
      return `${toLowerLetter(counter).toUpperCase()}.`;
    case "lowerroman":
      return `${toRoman(counter).toLowerCase()}.`;
    case "upperroman":
      return `${toRoman(counter)}.`;
    case "bullet":
    default:
      return "•";
  }
}

function formatListMarkerByPattern(
  pattern: string | null,
  currentLevel: number,
  countersByLevel: number[],
  currentFormat: string | null
): string {
  if (!pattern || pattern.trim().length === 0) {
    return formatListMarker(currentFormat, countersByLevel[currentLevel] ?? 1);
  }

  const replaced = pattern.replace(/%(\d+)/g, (_, g1: string) => {
    const level1Based = Number.parseInt(g1, 10);
    if (!Number.isFinite(level1Based) || level1Based <= 0) return "";
    const levelIdx = level1Based - 1;
    const n = countersByLevel[levelIdx] ?? 0;
    if (n <= 0) return "";
    if (levelIdx === currentLevel) {
      return formatListMarker(currentFormat, n).replace(/\.$/, "");
    }
    return String(n);
  });

  const normalized = replaced.trim();
  if (!normalized) {
    return formatListMarker(currentFormat, countersByLevel[currentLevel] ?? 1);
  }
  return normalized;
}

function ensureStyleTag(doc: Document, id: string): HTMLStyleElement {
  let styleEl = doc.getElementById(id) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = doc.createElement("style");
    styleEl.id = id;
    doc.head.appendChild(styleEl);
  }
  return styleEl;
}

function applyBaseProfileCss(doc: Document, styleProfile: WordStyleProfile): void {
  const styleEl = ensureStyleTag(doc, "__word_style_profile__");
  const targetWidthPx = styleProfile.contentWidthPx.toFixed(2);
  const topPaddingPx = styleProfile.pageMarginTopPx.toFixed(2);
  const bottomPaddingPx = styleProfile.pageMarginBottomPx.toFixed(2);
  const pageHeightPx = styleProfile.pageHeightPx.toFixed(2);

  styleEl.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&family=Noto+Serif+SC:wght@400;700&display=swap');
    html, body { box-sizing: border-box; }
    body {
      min-height: ${pageHeightPx}px !important;
      width: ${targetWidthPx}px !important;
      max-width: calc(100% - 24px) !important;
      margin-left: auto !important;
      margin-right: auto !important;
      padding-top: ${topPaddingPx}px !important;
      padding-bottom: ${bottomPaddingPx}px !important;
      padding-left: 0 !important;
      padding-right: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      font-family: ${styleProfile.bodyFontFamily} !important;
    }
    p {
      font-size: ${styleProfile.bodyFontPx.toFixed(4)}px !important;
      line-height: ${styleProfile.bodyLineHeightRatio.toFixed(6)} !important;
      margin-bottom: ${styleProfile.paragraphAfterPx.toFixed(2)}px !important;
    }
    table { border-collapse: collapse !important; border-spacing: 0 !important; }
    td, th {
      padding-top: ${styleProfile.tableCellPaddingTopPx.toFixed(2)}px !important;
      padding-left: ${styleProfile.tableCellPaddingLeftPx.toFixed(2)}px !important;
      padding-bottom: ${styleProfile.tableCellPaddingBottomPx.toFixed(2)}px !important;
      padding-right: ${styleProfile.tableCellPaddingRightPx.toFixed(2)}px !important;
      vertical-align: top !important;
    }
    .__word-date-anchor {
      margin-top: auto !important;
      text-align: right !important;
    }
    h1 {
      font-size: ${styleProfile.titleFontPx.toFixed(2)}px !important;
      color: ${styleProfile.titleColor} !important;
      text-align: ${styleProfile.titleAlign} !important;
      font-family: ${styleProfile.titleFontFamily} !important;
    }
  `;
}

function normalizeEmptyParagraphMarkers(paragraphs: HTMLElement[]): void {
  for (const p of paragraphs) {
    const hasVisualContent = (p.textContent ?? "").trim().length > 0 || p.querySelector("img,table,svg,canvas") !== null;
    if (!hasVisualContent) {
      p.setAttribute("data-word-empty", "1");
      if (p.innerHTML.trim().length === 0) {
        p.innerHTML = "<br/>";
      }
    } else {
      p.removeAttribute("data-word-empty");
    }
  }
}

function applyParagraphProfiles(doc: Document, styleProfile: WordStyleProfile): HTMLElement[] {
  let paragraphs = Array.from(doc.body.querySelectorAll("p")) as HTMLElement[];
  paragraphs.forEach((p) => {
    p.classList.remove("__word-date-anchor");
    p.querySelectorAll("span.__word-list-marker").forEach((node) => node.remove());
  });

  if (styleProfile.trailingDateAlignedRight && styleProfile.trailingDateText) {
    let dateParagraph: HTMLElement | null = null;
    if (
      styleProfile.trailingDateParagraphIndex !== null &&
      styleProfile.trailingDateParagraphIndex >= 0 &&
      styleProfile.trailingDateParagraphIndex < paragraphs.length
    ) {
      dateParagraph = paragraphs[styleProfile.trailingDateParagraphIndex];
    } else {
      dateParagraph =
        paragraphs
          .slice()
          .reverse()
          .find((p) => {
            const text = (p.textContent ?? "").replace(/\s+/g, "");
            const target = styleProfile.trailingDateText?.replace(/\s+/g, "") ?? "";
            return target.length > 0 && text.includes(target);
          }) ?? null;
    }

    if (dateParagraph) {
      let existingEmptyCount = 0;
      let cursor = dateParagraph.previousElementSibling;
      while (cursor && cursor.tagName.toLowerCase() === "p" && (cursor.textContent ?? "").trim().length === 0) {
        existingEmptyCount += 1;
        cursor = cursor.previousElementSibling;
      }

      const needed = Math.max(0, styleProfile.trailingEmptyParagraphCountBeforeDate - existingEmptyCount);
      for (let i = 0; i < needed; i += 1) {
        const spacer = doc.createElement("p");
        spacer.innerHTML = "<br/>";
        dateParagraph.parentElement?.insertBefore(spacer, dateParagraph);
      }
    }
  }

  paragraphs = Array.from(doc.body.querySelectorAll("p")) as HTMLElement[];
  const listCounters = new Map<number, number[]>();
  const count = Math.min(styleProfile.paragraphProfiles.length, paragraphs.length);

  for (let i = 0; i < count; i += 1) {
    const para = paragraphs[i];
    const profile = styleProfile.paragraphProfiles[i];

    para.style.textAlign = profile.align;
    if (profile.beforePx !== null) para.style.marginTop = `${profile.beforePx.toFixed(2)}px`;
    if (profile.afterPx !== null) para.style.marginBottom = `${profile.afterPx.toFixed(2)}px`;
    if (profile.lineHeightRatio !== null) para.style.lineHeight = profile.lineHeightRatio.toFixed(6);
    if (profile.indentLeftPx !== null) para.style.marginLeft = `${profile.indentLeftPx.toFixed(2)}px`;
    if (profile.indentRightPx !== null) para.style.marginRight = `${profile.indentRightPx.toFixed(2)}px`;
    if (profile.firstLinePx !== null) para.style.textIndent = `${profile.firstLinePx.toFixed(2)}px`;
    if (profile.hangingPx !== null) para.style.textIndent = `${(-profile.hangingPx).toFixed(2)}px`;

    if (profile.runs.length > 0 && para.querySelector("img,table,svg,canvas") === null) {
      const currentTextNormalized = (para.textContent ?? "").replace(/\s+/g, "");
      const runTextNormalized = profile.runs.map((run) => run.text).join("").replace(/\s+/g, "");
      if (runTextNormalized.length > 0 && currentTextNormalized === runTextNormalized) {
        para.innerHTML = paragraphToRunHtml(profile.runs);
      }
    }

    if (profile.listNumId !== null && profile.listLevel !== null) {
      if (profile.sectionBreakBefore) {
        listCounters.set(profile.listNumId, []);
      }
      const currentLevel = Math.max(0, profile.listLevel);
      const levels = listCounters.get(profile.listNumId) ?? [];
      const prevValue = levels[currentLevel] ?? (profile.listStartAt - 1);
      const nextValue = prevValue + 1;
      levels[currentLevel] = nextValue;
      for (let lv = currentLevel + 1; lv < levels.length; lv += 1) {
        levels[lv] = 0;
      }
      listCounters.set(profile.listNumId, levels);

      const marker = doc.createElement("span");
      marker.className = "__word-list-marker";
      marker.textContent = `${formatListMarkerByPattern(profile.listTextPattern, currentLevel, levels, profile.listFormat)} `;
      marker.style.display = "inline-block";
      marker.style.minWidth = "1.8em";
      marker.style.marginLeft = currentLevel > 0 ? `${currentLevel * 1.2}em` : "0";
      marker.style.color = "inherit";
      marker.style.fontWeight = "inherit";
      para.prepend(marker);
    }

    if (
      styleProfile.trailingDateAlignedRight &&
      styleProfile.trailingDateParagraphIndex !== null &&
      styleProfile.trailingDateParagraphIndex === i
    ) {
      para.classList.add("__word-date-anchor");
    }
  }

  normalizeEmptyParagraphMarkers(paragraphs);
  return paragraphs;
}

function paragraphHeightPx(paragraph: HTMLElement): number {
  const rect = paragraph.getBoundingClientRect();
  if (rect.height > 0) return rect.height;
  const lh = Number.parseFloat(getComputedStyle(paragraph).lineHeight || "0");
  if (Number.isFinite(lh) && lh > 0) return lh;
  return 16;
}

function insertPageSpacerBefore(doc: Document, paragraph: HTMLElement, heightPx: number): void {
  if (heightPx <= 0.5) return;
  const spacer = doc.createElement("div");
  spacer.dataset.wordPageSpacer = "1";
  spacer.style.height = `${heightPx.toFixed(2)}px`;
  spacer.style.width = "100%";
  spacer.style.pointerEvents = "none";
  spacer.style.userSelect = "none";
  paragraph.parentElement?.insertBefore(spacer, paragraph);
}

function removePaginationSpacers(doc: Document): void {
  doc.querySelectorAll("[data-word-page-spacer='1']").forEach((node) => node.remove());
}

function estimateGroupHeight(paragraphs: HTMLElement[], idx: number, profile: ParagraphStyleProfile, contentHeight: number): number {
  const currentH = paragraphHeightPx(paragraphs[idx]);
  if (!profile.keepNext) return currentH;
  const next = paragraphs[idx + 1];
  if (!next) return currentH;
  const nextH = paragraphHeightPx(next);
  const sum = currentH + nextH;
  if (sum > contentHeight) return currentH;
  return sum;
}

function applyKeepPagination(doc: Document, styleProfile: WordStyleProfile, paragraphs: HTMLElement[]): void {
  removePaginationSpacers(doc);

  const contentHeight = Math.max(120, styleProfile.pageHeightPx - styleProfile.pageMarginTopPx - styleProfile.pageMarginBottomPx);
  const count = Math.min(styleProfile.paragraphProfiles.length, paragraphs.length);
  let used = 0;

  for (let i = 0; i < count; i += 1) {
    const p = paragraphs[i];
    const profile = styleProfile.paragraphProfiles[i];
    const h = paragraphHeightPx(p);

    const forceBreak = profile.pageBreakBefore;
    if (forceBreak && used > 0) {
      insertPageSpacerBefore(doc, p, contentHeight - used);
      used = 0;
    }

    const groupHeight = estimateGroupHeight(paragraphs, i, profile, contentHeight);
    if ((profile.keepLines || profile.keepNext) && used > 0 && used + groupHeight > contentHeight) {
      insertPageSpacerBefore(doc, p, contentHeight - used);
      used = 0;
    }

    if (used > 0 && used + h > contentHeight) {
      insertPageSpacerBefore(doc, p, contentHeight - used);
      used = 0;
    }

    used += h;
    if (used >= contentHeight) {
      used = used % contentHeight;
    }
  }
}

function applyFormattingMarks(doc: Document, showFormattingMarks: boolean): void {
  const styleEl = ensureStyleTag(doc, "__word_view_options__");
  styleEl.textContent = `
    p[data-word-empty="1"]::before { content: "\\00a0"; }
    ${showFormattingMarks ? `
    p::after {
      content: "↵";
      color: #66aef9;
      font-size: 0.85em;
      margin-left: 3px;
    }
    br::after {
      content: "↵";
      color: #66aef9;
    }
    ` : ""}
  `;
}

export function applyWordRenderModel({ doc, styleProfile, showFormattingMarks }: ApplyWordRenderOptions): void {
  applyWordHtmlCompatibility(doc, {
    forceBodyFontFamily: styleProfile?.bodyFontFamily,
    forceHeadingFontFamily: styleProfile?.titleFontFamily
  });

  let paragraphs = Array.from(doc.body.querySelectorAll("p")) as HTMLElement[];
  normalizeEmptyParagraphMarkers(paragraphs);

  if (styleProfile) {
    applyBaseProfileCss(doc, styleProfile);
    paragraphs = applyParagraphProfiles(doc, styleProfile);
    applyKeepPagination(doc, styleProfile, paragraphs);
  }

  applyFormattingMarks(doc, showFormattingMarks);
}
