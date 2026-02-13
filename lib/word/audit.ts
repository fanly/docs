import type { WordStyleProfile } from "@/lib/word/styleProfile";

export const FALLBACK_AUDIT_TARGET = {
  titleFontPx: 32,
  bodyFontPx: 14.6667,
  bodyLinePx: 16.99,
  paragraphAfterPx: 10.67,
  contentWidthPx: 553.73,
  baselineLoaded: false
};

export type AuditTarget = typeof FALLBACK_AUDIT_TARGET;

export interface AuditMetric {
  label: string;
  actual: number;
  expected: number;
  delta: number;
  unit: "px";
  pass: boolean;
}

function parsePx(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeLineHeight(value: string, fontSize: number): number {
  if (value === "normal") return fontSize * 1.2;
  if (value.endsWith("px")) return parsePx(value);
  const numeric = Number.parseFloat(value);
  return Number.isFinite(numeric) ? numeric * fontSize : 0;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

export function estimateContentColumnWidth(doc: Document): number {
  const paragraphs = Array.from(doc.body.querySelectorAll("p")) as HTMLElement[];
  const candidates = paragraphs
    .filter((p) => {
      const textLen = (p.textContent ?? "").replace(/\s+/g, "").length;
      const hasMedia = p.querySelector("img,table,svg,canvas") !== null;
      const isEmpty = p.getAttribute("data-word-empty") === "1";
      return textLen >= 8 && !hasMedia && !isEmpty;
    })
    .map((p) => p.getBoundingClientRect().width)
    .filter((width) => Number.isFinite(width) && width > 120);

  if (candidates.length > 0) return median(candidates);
  const bodyWidth = doc.body.getBoundingClientRect().width;
  if (Number.isFinite(bodyWidth) && bodyWidth > 120) return bodyWidth;
  const firstParagraph = paragraphs[0];
  return firstParagraph ? firstParagraph.getBoundingClientRect().width : 0;
}

export function targetFromProfile(profile: WordStyleProfile | null): AuditTarget {
  if (!profile) return FALLBACK_AUDIT_TARGET;
  const bodyLinePx =
    profile.bodyLineHeightRule === "auto" || profile.bodyLineHeightPx === null
      ? profile.bodyFontPx * profile.bodyLineHeightRatio
      : profile.bodyLineHeightPx;
  return {
    titleFontPx: profile.titleFontPx,
    bodyFontPx: profile.bodyFontPx,
    bodyLinePx,
    paragraphAfterPx: profile.paragraphAfterPx,
    contentWidthPx: profile.contentWidthPx,
    baselineLoaded: true
  };
}

export function createAuditMetrics(doc: Document, target: AuditTarget): AuditMetric[] {
  const h1 = doc.body.querySelector("h1") as HTMLElement | null;
  const p = doc.body.querySelector("p") as HTMLElement | null;
  if (!h1 || !p) return [];

  const h1Style = doc.defaultView?.getComputedStyle(h1);
  const pStyle = doc.defaultView?.getComputedStyle(p);
  if (!h1Style || !pStyle) return [];

  const titleFontPx = parsePx(h1Style.fontSize);
  const bodyFontPx = parsePx(pStyle.fontSize);
  const bodyLinePx = normalizeLineHeight(pStyle.lineHeight, bodyFontPx);
  const paragraphAfterPx = parsePx(pStyle.marginBottom);
  const contentWidthPx = estimateContentColumnWidth(doc);

  const expectedOrSelf = (expected: number, actual: number): number => (target.baselineLoaded ? expected : actual);
  const rows: Omit<AuditMetric, "delta" | "pass">[] = [
    { label: "标题字号", actual: titleFontPx, expected: expectedOrSelf(target.titleFontPx, titleFontPx), unit: "px" },
    { label: "正文字号", actual: bodyFontPx, expected: expectedOrSelf(target.bodyFontPx, bodyFontPx), unit: "px" },
    { label: "正文行高", actual: bodyLinePx, expected: expectedOrSelf(target.bodyLinePx, bodyLinePx), unit: "px" },
    { label: "段后间距", actual: paragraphAfterPx, expected: expectedOrSelf(target.paragraphAfterPx, paragraphAfterPx), unit: "px" },
    { label: "版心宽度", actual: contentWidthPx, expected: expectedOrSelf(target.contentWidthPx, contentWidthPx), unit: "px" }
  ];

  return rows.map((row) => {
    const delta = Number((row.actual - row.expected).toFixed(2));
    const tolerance = row.label === "版心宽度" ? 6 : 1;
    return {
      ...row,
      delta,
      pass: Math.abs(delta) <= tolerance
    };
  });
}
