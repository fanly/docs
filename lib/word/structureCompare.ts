import type { WordStyleProfile } from "@/lib/word/styleProfile";

export interface StructureRow {
  name: string;
  actual: number;
  expected: number | null;
  delta: number | null;
  pass: boolean;
}

export interface StructureReport {
  rows: StructureRow[];
  pass: boolean;
}

function count(doc: Document, selector: string): number {
  return doc.body.querySelectorAll(selector).length;
}

export function buildStructureReport(doc: Document, styleProfile: WordStyleProfile | null): StructureReport {
  const expectedParagraphs = styleProfile ? styleProfile.paragraphProfiles.length : null;
  const expectedHeadings = styleProfile
    ? styleProfile.paragraphProfiles.filter((p) => p.text.length > 0).length
    : null;

  const rows: StructureRow[] = [
    {
      name: "段落数(p)",
      actual: count(doc, "p"),
      expected: expectedParagraphs,
      delta: expectedParagraphs === null ? null : count(doc, "p") - expectedParagraphs,
      pass: expectedParagraphs === null ? true : Math.abs(count(doc, "p") - expectedParagraphs) <= 4
    },
    {
      name: "标题数(h1-h6)",
      actual: count(doc, "h1,h2,h3,h4,h5,h6"),
      expected: null,
      delta: null,
      pass: true
    },
    {
      name: "列表项(li)",
      actual: count(doc, "li"),
      expected: null,
      delta: null,
      pass: true
    },
    {
      name: "表格数(table)",
      actual: count(doc, "table"),
      expected: null,
      delta: null,
      pass: true
    },
    {
      name: "图片数(img)",
      actual: count(doc, "img"),
      expected: null,
      delta: null,
      pass: true
    },
    {
      name: "非空段落数(结构参考)",
      actual: count(doc, "p") - count(doc, "p[data-word-empty='1']"),
      expected: expectedHeadings,
      delta:
        expectedHeadings === null
          ? null
          : count(doc, "p") - count(doc, "p[data-word-empty='1']") - expectedHeadings,
      pass:
        expectedHeadings === null
          ? true
          : Math.abs(count(doc, "p") - count(doc, "p[data-word-empty='1']") - expectedHeadings) <= 8
    }
  ];

  return {
    rows,
    pass: rows.every((row) => row.pass)
  };
}
