import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { parseDocxToHtmlSnapshot } from "@/lib/word/docxHtml";

async function buildMockDocxBuffer(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>一级标题</w:t></w:r></w:p>
    <w:p><w:r><w:t>正文段落</w:t></w:r></w:p>
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr>
  </w:body>
</w:document>`
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`
  );

  return zip.generateAsync({ type: "arraybuffer" });
}

async function buildMockDocxWithImageBuffer(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"
>
  <w:body>
    <w:p>
      <w:r>
        <w:drawing>
          <wp:inline>
            <wp:extent cx="1828800" cy="914400"/>
            <a:graphic>
              <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:pic>
                  <pic:blipFill>
                    <a:blip r:embed="rId5"/>
                  </pic:blipFill>
                </pic:pic>
              </a:graphicData>
            </a:graphic>
          </wp:inline>
        </w:drawing>
      </w:r>
    </w:p>
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr>
  </w:body>
</w:document>`
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>
</Relationships>`
  );
  zip.file("word/media/image1.png", new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]));
  return zip.generateAsync({ type: "arraybuffer" });
}

async function buildMockDocxWithTableBuffer(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:tbl>
      <w:tr>
        <w:tc>
          <w:p><w:r><w:t>R1C1</w:t></w:r></w:p>
          <w:p><w:r><w:t>第二行</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:p><w:r><w:t>R1C2</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr>
  </w:body>
</w:document>`
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("parseDocxToHtmlSnapshot", () => {
  it("converts uploaded docx to html snapshot containing headings and paragraphs", async () => {
    const buffer = await buildMockDocxBuffer();
    const mockFile = {
      arrayBuffer: async () => buffer
    } as unknown as File;

    const snapshot = await parseDocxToHtmlSnapshot(mockFile);

    expect(snapshot).toContain("<!DOCTYPE html>");
    expect(snapshot).toContain("一级标题");
    expect(snapshot).toContain("<h1");
    expect(snapshot).toContain("<p");
  });

  it("maps wp:extent to image width and height for stable layout", async () => {
    const buffer = await buildMockDocxWithImageBuffer();
    const mockFile = {
      arrayBuffer: async () => buffer
    } as unknown as File;

    const snapshot = await parseDocxToHtmlSnapshot(mockFile);

    expect(snapshot).toContain('width="192"');
    expect(snapshot).toContain('height="96"');
    expect(snapshot).toContain("width:192.00px");
    expect(snapshot).toContain("height:96.00px");
  });

  it("keeps table structure with cell paragraphs and borders", async () => {
    const buffer = await buildMockDocxWithTableBuffer();
    const mockFile = {
      arrayBuffer: async () => buffer
    } as unknown as File;

    const snapshot = await parseDocxToHtmlSnapshot(mockFile);

    expect(snapshot).toContain("<table");
    expect(snapshot).toContain('border-collapse:collapse');
    expect(snapshot).toContain("<td");
    expect(snapshot).toContain("R1C1");
    expect(snapshot).toContain("第二行");
  });
});
