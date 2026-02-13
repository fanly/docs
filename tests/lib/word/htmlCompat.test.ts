import { describe, expect, it } from "vitest";
import { applyWordHtmlCompatibility } from "@/lib/word/htmlCompat";

describe("applyWordHtmlCompatibility", () => {
  it("maps key mso styles to standard css properties", () => {
    document.body.innerHTML = `
      <p id="p1" style="mso-line-height-alt: 18.0pt; mso-margin-bottom-alt: 12.0pt; mso-ansi-font-size: 12.0pt;">hello</p>
    `;

    applyWordHtmlCompatibility(document);

    const p1 = document.getElementById("p1") as HTMLElement;
    const styleText = p1.getAttribute("style") ?? "";
    expect(styleText).toContain("line-height: 18.0pt");
    expect(styleText).toContain("margin-bottom: 12.0pt");
    expect(styleText).toContain("font-size: 12.0pt");
  });

  it("normalizes empty word-like paragraphs to keep visual line", () => {
    document.body.innerHTML = `<p id="p2"><span></span></p>`;

    applyWordHtmlCompatibility(document);

    const p2 = document.getElementById("p2") as HTMLElement;
    expect(p2.innerHTML.toLowerCase()).toContain("<br");
  });

  it("adds list fallback indentation for mso list paragraphs", () => {
    document.body.innerHTML = `<p id="p3" class="MsoListParagraph" style="margin-left: 36.0pt; mso-list:l0 level1 lfo1;">item</p>`;

    applyWordHtmlCompatibility(document);

    const p3 = document.getElementById("p3") as HTMLElement;
    const styleText = p3.getAttribute("style") ?? "";
    expect(styleText).toContain("padding-left: 36.0pt");
    expect(styleText).toContain("text-indent: 0");
  });
});
