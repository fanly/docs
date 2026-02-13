import type { WordStyleProfile } from "@/lib/word/styleProfile";

export const FALLBACK_AUDIT_TARGET = {
  titleFontPx: 32,
  bodyFontPx: 14.6667,
  bodyLinePx: 16.99,
  paragraphAfterPx: 10.67,
  contentWidthPx: 553.73
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

export function targetFromProfile(profile: WordStyleProfile | null): AuditTarget {
  if (!profile) return FALLBACK_AUDIT_TARGET;
  return {
    titleFontPx: profile.titleFontPx,
    bodyFontPx: profile.bodyFontPx,
    bodyLinePx: profile.bodyFontPx * profile.bodyLineHeightRatio,
    paragraphAfterPx: profile.paragraphAfterPx,
    contentWidthPx: profile.contentWidthPx
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
  const contentWidthPx = p.getBoundingClientRect().width;

  const rows: Omit<AuditMetric, "delta" | "pass">[] = [
    { label: "标题字号", actual: titleFontPx, expected: target.titleFontPx, unit: "px" },
    { label: "正文字号", actual: bodyFontPx, expected: target.bodyFontPx, unit: "px" },
    { label: "正文行高", actual: bodyLinePx, expected: target.bodyLinePx, unit: "px" },
    { label: "段后间距", actual: paragraphAfterPx, expected: target.paragraphAfterPx, unit: "px" },
    { label: "版心宽度", actual: contentWidthPx, expected: target.contentWidthPx, unit: "px" }
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
