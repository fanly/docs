import type { WordStyleProfile } from "@/lib/word/styleProfile";

export interface CoverageItem {
  name: string;
  supported: boolean;
  detail: string;
}

export interface CoverageReport {
  score: number;
  supportedCount: number;
  total: number;
  items: CoverageItem[];
}

export function buildCoverageReport(_profile: WordStyleProfile | null): CoverageReport {
  const items: CoverageItem[] = [
    {
      name: "段落级样式",
      supported: true,
      detail: "对齐、段前后、行距、缩进"
    },
    {
      name: "Run 级样式",
      supported: true,
      detail: "字体、颜色、高亮、删除线、上下标"
    },
    {
      name: "列表编号",
      supported: true,
      detail: "numPr + lvlText 模板计数"
    },
    {
      name: "分页 keep 规则",
      supported: true,
      detail: "keepNext / keepLines / pageBreakBefore"
    },
    {
      name: "表格单元格边距",
      supported: true,
      detail: "按 DOCX 表格样式注入单元格 padding"
    },
    {
      name: "字体映射",
      supported: true,
      detail: "fontTable + fallback webfont"
    }
  ];

  const supportedCount = items.filter((item) => item.supported).length;
  const total = items.length;
  const score = Math.round((supportedCount / total) * 100);

  return {
    score,
    supportedCount,
    total,
    items
  };
}
