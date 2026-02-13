import { describe, expect, it } from "vitest";
import { buildBlockIndex, resolveBlockNode } from "@/lib/render/blockIndexer";

function setRect(el: Element, rect: { top: number; left: number; width: number; height: number }) {
  Object.defineProperty(el, "getBoundingClientRect", {
    configurable: true,
    value: () => {
      const domRect = new DOMRect(rect.left, rect.top, rect.width, rect.height);
      return domRect;
    }
  });
}

describe("buildBlockIndex", () => {
  it("indexes paragraph/table/image nodes and annotates block ids", () => {
    document.body.innerHTML = `
      <p id="p1">Para</p>
      <table id="t1"><tbody><tr><td>Cell</td></tr></tbody></table>
      <img id="img1" src="x" />
      <div id="tiny">x</div>
    `;

    setRect(document.getElementById("p1")!, { top: 10, left: 15, width: 300, height: 40 });
    setRect(document.getElementById("t1")!, { top: 60, left: 15, width: 320, height: 120 });
    setRect(document.getElementById("img1")!, { top: 200, left: 20, width: 160, height: 90 });
    setRect(document.getElementById("tiny")!, { top: 0, left: 0, width: 1, height: 1 });

    const frameRect = new DOMRect(100, 50, 800, 1000);
    const blocks = buildBlockIndex(document, frameRect);

    expect(blocks.length).toBe(3);
    expect(blocks[0].top).toBe(60);
    expect(blocks[0].left).toBe(115);
    expect(blocks[1].type).toBe("table");
    expect(blocks[2].type).toBe("image");

    const firstId = blocks[0].id;
    expect(resolveBlockNode(document, firstId)).not.toBeNull();
  });
});
