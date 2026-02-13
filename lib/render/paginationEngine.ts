import type { BlockRecord, PageMetrics, PaginationPage } from "@/lib/types/editor";

export const A4_PAGE_METRICS: PageMetrics = {
  widthPx: 794,
  heightPx: 1123,
  marginTopPx: 96,
  marginBottomPx: 96,
  marginLeftPx: 96,
  marginRightPx: 96,
  headerOffsetPx: 36,
  footerOffsetPx: 36
};

export interface PaginationResult {
  pages: PaginationPage[];
  blockToPage: Map<string, number>;
  totalHeight: number;
}

export function paginateBlocks(blocks: BlockRecord[], metrics: PageMetrics): PaginationResult {
  if (blocks.length === 0) {
    return {
      pages: [
        {
          index: 0,
          startY: 0,
          endY: metrics.heightPx
        }
      ],
      blockToPage: new Map<string, number>(),
      totalHeight: metrics.heightPx
    };
  }

  const contentTop = metrics.marginTopPx + metrics.headerOffsetPx;
  const contentBottom = metrics.heightPx - metrics.marginBottomPx - metrics.footerOffsetPx;
  const contentHeight = contentBottom - contentTop;

  const pages: PaginationPage[] = [];
  const blockToPage = new Map<string, number>();

  let pageIndex = 0;
  let pageStart = 0;
  let cursor = contentTop;

  for (const block of blocks) {
    const blockHeight = Math.max(1, block.height);
    const neededBottom = cursor + blockHeight;

    if (neededBottom > contentBottom && cursor > contentTop) {
      pages.push({
        index: pageIndex,
        startY: pageStart,
        endY: pageStart + metrics.heightPx
      });
      pageIndex += 1;
      pageStart = pageIndex * metrics.heightPx;
      cursor = pageStart + contentTop;
    }

    blockToPage.set(block.id, pageIndex);
    cursor += blockHeight;

    if (blockHeight > contentHeight) {
      const extraPages = Math.floor(blockHeight / contentHeight);
      pageIndex += extraPages;
      pageStart = pageIndex * metrics.heightPx;
      cursor = pageStart + contentTop + (blockHeight % contentHeight);
      blockToPage.set(block.id, pageIndex);
    }
  }

  pages.push({
    index: pageIndex,
    startY: pageIndex * metrics.heightPx,
    endY: (pageIndex + 1) * metrics.heightPx
  });

  return {
    pages,
    blockToPage,
    totalHeight: pages.length * metrics.heightPx
  };
}
