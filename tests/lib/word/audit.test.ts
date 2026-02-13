import { describe, expect, it } from "vitest";
import { estimateContentColumnWidth } from "@/lib/word/audit";

function setWidth(el: Element, width: number): void {
  Object.defineProperty(el, "getBoundingClientRect", {
    configurable: true,
    value: () => new DOMRect(0, 0, width, 20)
  });
}

describe("estimateContentColumnWidth", () => {
  it("uses median width of text paragraphs and ignores image paragraphs", () => {
    document.body.innerHTML = `
      <p id="p1">这是用于测量版心宽度的第一段文本内容。</p>
      <p id="p2">这是用于测量版心宽度的第二段文本内容。</p>
      <p id="p3"><img src="x" /></p>
    `;

    const p1 = document.getElementById("p1")!;
    const p2 = document.getElementById("p2")!;
    const p3 = document.getElementById("p3")!;
    setWidth(p1, 550);
    setWidth(p2, 560);
    setWidth(p3, 900);
    setWidth(document.body, 800);

    expect(estimateContentColumnWidth(document)).toBe(555);
  });

  it("falls back to body width when no valid text paragraph exists", () => {
    document.body.innerHTML = `<p id="p1"><img src="x" /></p>`;
    const p1 = document.getElementById("p1")!;
    setWidth(p1, 980);
    setWidth(document.body, 640);

    expect(estimateContentColumnWidth(document)).toBe(640);
  });
});
