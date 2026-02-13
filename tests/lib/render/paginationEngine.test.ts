import { describe, expect, it } from "vitest";
import { A4_PAGE_METRICS, paginateBlocks } from "@/lib/render/paginationEngine";
import type { BlockRecord } from "@/lib/types/editor";

function mkBlock(id: string, height: number): BlockRecord {
  return {
    id,
    type: "paragraph",
    xpath: `/body/p[${id}]`,
    tagName: "p",
    top: 0,
    left: 0,
    width: 400,
    height,
    pageIndex: 0,
    html: `<p>${id}</p>`
  };
}

describe("paginateBlocks", () => {
  it("returns single page for empty blocks", () => {
    const result = paginateBlocks([], A4_PAGE_METRICS);

    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].index).toBe(0);
    expect(result.totalHeight).toBe(A4_PAGE_METRICS.heightPx);
  });

  it("assigns blocks into multiple pages by measured height", () => {
    const blocks = [mkBlock("a", 300), mkBlock("b", 450), mkBlock("c", 400), mkBlock("d", 240)];
    const result = paginateBlocks(blocks, A4_PAGE_METRICS);

    expect(result.pages.length).toBeGreaterThan(1);
    expect(result.blockToPage.get("a")).toBe(0);
    expect(result.blockToPage.get("d")).toBeGreaterThanOrEqual(1);
  });
});
