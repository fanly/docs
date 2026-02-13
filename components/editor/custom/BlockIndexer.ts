export type IndexedBlockType = "paragraph" | "heading" | "table" | "image" | "generic";

export interface IndexedBlock {
  id: string;
  type: IndexedBlockType;
  path: string;
  top: number;
  left: number;
  width: number;
  height: number;
  html: string;
  tagName: string;
}

export class BlockIndexer {
  index(doc: Document): IndexedBlock[] {
    const selector = "p,h1,h2,h3,h4,h5,h6,table,img,div";
    const nodes = Array.from(doc.body.querySelectorAll(selector));

    return nodes
      .map((node, idx) => {
        const rect = node.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) return null;

        const tag = node.tagName.toLowerCase();
        const type: IndexedBlockType =
          tag === "p"
            ? "paragraph"
            : tag.startsWith("h")
              ? "heading"
              : tag === "table"
                ? "table"
                : tag === "img"
                  ? "image"
                  : "generic";

        const id = `custom_block_${idx}`;
        (node as HTMLElement).dataset.customBlockId = id;

        return {
          id,
          type,
          path: this.pathOf(node),
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          html: node.outerHTML,
          tagName: tag
        } satisfies IndexedBlock;
      })
      .filter((block): block is IndexedBlock => block !== null);
  }

  private pathOf(el: Element): string {
    if (el.id) return `//*[@id=\"${el.id}\"]`;

    const parts: string[] = [];
    let current: Element | null = el;
    while (current) {
      let i = 1;
      let sibling = current.previousElementSibling;
      while (sibling) {
        if (sibling.tagName === current.tagName) i += 1;
        sibling = sibling.previousElementSibling;
      }
      parts.unshift(`${current.tagName.toLowerCase()}[${i}]`);
      current = current.parentElement;
    }
    return `/${parts.join("/")}`;
  }
}
