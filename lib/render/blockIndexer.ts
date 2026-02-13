import type { BlockRecord } from "@/lib/types/editor";

const BLOCK_SELECTOR = ["p", "table", "img", "h1", "h2", "h3", "h4", "h5", "h6", "li", "blockquote", "div"].join(",");

function tagToBlockType(tagName: string): BlockRecord["type"] {
  const normalized = tagName.toLowerCase();
  if (normalized === "p") return "paragraph";
  if (normalized.startsWith("h")) return "heading";
  if (normalized === "table") return "table";
  if (normalized === "img") return "image";
  if (normalized === "li") return "list";
  if (normalized === "blockquote") return "quote";
  return "generic";
}

function computeXPath(element: Element): string {
  if (element.id) {
    return `//*[@id=\"${element.id}\"]`;
  }

  const parts: string[] = [];
  let node: Element | null = element;
  while (node && node.nodeType === Node.ELEMENT_NODE) {
    let index = 1;
    let sibling = node.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === node.tagName) index += 1;
      sibling = sibling.previousElementSibling;
    }
    parts.unshift(`${node.tagName.toLowerCase()}[${index}]`);
    node = node.parentElement;
  }

  return `/${parts.join("/")}`;
}

function isIndexableBlock(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return false;
  if (el.closest("table") && el.tagName.toLowerCase() !== "table") return false;
  if (el.tagName.toLowerCase() === "div") {
    return Array.from(el.children).length === 0 || el.children.length <= 1;
  }
  return true;
}

export function buildBlockIndex(doc: Document, frameRect: DOMRect): BlockRecord[] {
  const nodes = Array.from(doc.body.querySelectorAll(BLOCK_SELECTOR));
  const blocks: BlockRecord[] = [];

  nodes.forEach((node, idx) => {
    if (!isIndexableBlock(node)) return;

    const rect = node.getBoundingClientRect();
    const id = `block_${idx}_${Math.abs(Math.round(rect.top))}`;

    blocks.push({
      id,
      type: tagToBlockType(node.tagName),
      tagName: node.tagName.toLowerCase(),
      xpath: computeXPath(node),
      top: frameRect.top + rect.top,
      left: frameRect.left + rect.left,
      width: rect.width,
      height: rect.height,
      pageIndex: 0,
      html: node.outerHTML
    });

    (node as HTMLElement).dataset.overlayBlockId = id;
  });

  return blocks;
}

export function resolveBlockNode(doc: Document, blockId: string): HTMLElement | null {
  return doc.querySelector(`[data-overlay-block-id=\"${blockId}\"]`) as HTMLElement | null;
}
