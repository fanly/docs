import { describe, expect, it } from "vitest";
import { buildHtmlSnapshot } from "@/lib/render/htmlSnapshot";

describe("buildHtmlSnapshot", () => {
  it("wraps fragment HTML with full document shell", () => {
    const snapshot = buildHtmlSnapshot("<p>Hello</p>");

    expect(snapshot).toContain("<!DOCTYPE html>");
    expect(snapshot).toContain("<body><p>Hello</p></body>");
  });

  it("returns original html when html tag exists", () => {
    const raw = "<!DOCTYPE html><html><head></head><body><p>Raw</p></body></html>";

    expect(buildHtmlSnapshot(raw)).toBe(raw);
  });

  it("returns empty shell for blank input", () => {
    const snapshot = buildHtmlSnapshot("   ");

    expect(snapshot).toBe("<!DOCTYPE html><html><head><meta charset=\"utf-8\"/></head><body></body></html>");
  });
});
