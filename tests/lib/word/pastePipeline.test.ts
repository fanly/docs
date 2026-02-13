import { describe, expect, it } from "vitest";
import { extractFromClipboardDataTransfer } from "@/lib/word/pastePipeline";

class MockDataTransferItem implements DataTransferItem {
  kind: "string" | "file";
  type: string;
  #file: File | null;

  constructor(kind: "string" | "file", type: string, file: File | null = null) {
    this.kind = kind;
    this.type = type;
    this.#file = file;
  }

  getAsFile(): File | null {
    return this.#file;
  }

  getAsString(_callback: FunctionStringCallback | null): void {
    throw new Error("Not implemented");
  }

  webkitGetAsEntry(): FileSystemEntry | null {
    return null;
  }
}

function makeDataTransfer(html: string, text: string, imageFile?: File): DataTransfer {
  const itemList = imageFile
    ? [new MockDataTransferItem("file", imageFile.type, imageFile)]
    : [];

  return {
    dropEffect: "none",
    effectAllowed: "all",
    files: [] as unknown as FileList,
    items: itemList as unknown as DataTransferItemList,
    types: ["text/html", "text/plain"],
    clearData: () => undefined,
    getData: (format: string) => {
      if (format === "text/html") return html;
      if (format === "text/plain") return text;
      return "";
    },
    setData: () => false,
    setDragImage: () => undefined
  } as unknown as DataTransfer;
}

describe("extractFromClipboardDataTransfer", () => {
  it("replaces unstable image src with clipboard image data url", async () => {
    const file = new File([new Uint8Array([1, 2, 3, 4])], "x.png", { type: "image/png" });
    const dt = makeDataTransfer('<p><img src="file:///Users/a.png" /></p>', "", file);

    const payload = await extractFromClipboardDataTransfer(dt);

    expect(payload.html).toContain("data:image/png;base64");
    expect(payload.imageFiles.length).toBe(1);
  });

  it("builds image-only html when html payload is empty", async () => {
    const file = new File([new Uint8Array([10, 20])], "x.png", { type: "image/png" });
    const dt = makeDataTransfer("", "", file);

    const payload = await extractFromClipboardDataTransfer(dt);

    expect(payload.html.startsWith("<p><img")).toBe(true);
    expect(payload.text).toBe("");
  });
});
