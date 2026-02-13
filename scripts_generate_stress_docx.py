from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import base64

out_dir = Path('assets/test-docs')
out_dir.mkdir(parents=True, exist_ok=True)
out_file = out_dir / 'word-fidelity-stress-test.docx'

PNG_RED = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z6wAAAABJRU5ErkJggg==')
PNG_GREEN = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8AARQMBgAq8rVQAAAAASUVORK5CYII=')
PNG_BLUE = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8zwAAAgMBgN5n0WkAAAAASUVORK5CYII=')

content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>
'''

rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
'''

doc_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image-small.png"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image-medium.png"/>
  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image-large.png"/>
</Relationships>
'''

styles = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="等线"/>
        <w:sz w:val="28"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr><w:spacing w:line="360" w:lineRule="auto" w:after="120"/></w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:rPr><w:b/><w:sz w:val="40"/><w:color w:val="0F4761"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:rPr><w:b/><w:sz w:val="34"/><w:color w:val="1F4E79"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:rPr><w:b/><w:sz w:val="30"/><w:color w:val="2F6D9B"/></w:rPr></w:style>
</w:styles>
'''

numbering = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0">
    <w:multiLevelType w:val="hybridMultilevel"/>
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl>
    <w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%1.%2."/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl>
    <w:lvl w:ilvl="2"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%1.%2.%3."/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr></w:lvl>
  </w:abstractNum>
  <w:abstractNum w:abstractNumId="1">
    <w:multiLevelType w:val="multilevel"/>
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl>
    <w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="◦"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl>
    <w:lvl w:ilvl="2"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="▪"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr></w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
  <w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>
'''

def p(text: str, keep_next=False, keep_lines=False, page_break=False):
    ppr = []
    if keep_next:
        ppr.append('<w:keepNext/>')
    if keep_lines:
        ppr.append('<w:keepLines/>')
    if page_break:
        ppr.append('<w:pageBreakBefore/>')
    ppr_xml = f"<w:pPr>{''.join(ppr)}</w:pPr>" if ppr else ''
    return f'<w:p>{ppr_xml}<w:r><w:t xml:space="preserve">{text}</w:t></w:r></w:p>'

def heading(level: int, text: str):
    return f'<w:p><w:pPr><w:pStyle w:val="Heading{level}"/></w:pPr><w:r><w:t>{text}</w:t></w:r></w:p>'

def list_p(num_id: int, ilvl: int, text: str):
    return f'<w:p><w:pPr><w:numPr><w:ilvl w:val="{ilvl}"/><w:numId w:val="{num_id}"/></w:numPr></w:pPr><w:r><w:t xml:space="preserve">{text}</w:t></w:r></w:p>'

def run_mix(seed: int):
    return f'''<w:p>
      <w:r><w:t>混合样式段 {seed}: </w:t></w:r>
      <w:r><w:rPr><w:color w:val="EE0000"/><w:b/></w:rPr><w:t>红色加粗</w:t></w:r>
      <w:r><w:t> / </w:t></w:r>
      <w:r><w:rPr><w:color w:val="0070C0"/><w:i/></w:rPr><w:t>蓝色斜体</w:t></w:r>
      <w:r><w:t> / </w:t></w:r>
      <w:r><w:rPr><w:u w:val="single"/><w:color w:val="00B050"/></w:rPr><w:t>绿色下划线</w:t></w:r>
      <w:r><w:t> / </w:t></w:r>
      <w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>高亮</w:t></w:r>
      <w:r><w:t> / </w:t></w:r>
      <w:r><w:rPr><w:strike/></w:rPr><w:t>删除线</w:t></w:r>
      <w:r><w:t> / 上标x</w:t></w:r>
      <w:r><w:rPr><w:vertAlign w:val="superscript"/></w:rPr><w:t>2</w:t></w:r>
      <w:r><w:t> 下标H</w:t></w:r>
      <w:r><w:rPr><w:vertAlign w:val="subscript"/></w:rPr><w:t>2</w:t></w:r>
      <w:r><w:t>O</w:t></w:r>
    </w:p>'''

def image_paragraph(rid: str, docpr_id: int, cx: int, cy: int):
    return f'''<w:p><w:r><w:drawing>
      <wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
        <wp:extent cx="{cx}" cy="{cy}"/>
        <wp:docPr id="{docpr_id}" name="img-{docpr_id}"/>
        <wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>
        <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic>
          <pic:nvPicPr><pic:cNvPr id="{docpr_id}" name="img-{docpr_id}"/><pic:cNvPicPr/></pic:nvPicPr>
          <pic:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="{rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
          <pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
        </pic:pic></a:graphicData></a:graphic>
      </wp:inline>
    </w:drawing></w:r></w:p>'''

def table_block(rows=8, cols=4):
    trs = []
    for r in range(rows):
      tcs = []
      for c in range(cols):
        content = f'R{r+1}C{c+1} 表格单元格测试：长文本用于验证换行与padding。'
        tcs.append(f'<w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>{content}</w:t></w:r></w:p></w:tc>')
      trs.append('<w:tr>' + ''.join(tcs) + '</w:tr>')
    return '<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="8"/><w:left w:val="single" w:sz="8"/><w:bottom w:val="single" w:sz="8"/><w:right w:val="single" w:sz="8"/><w:insideH w:val="single" w:sz="6"/><w:insideV w:val="single" w:sz="6"/></w:tblBorders></w:tblPr><w:tblGrid>' + ''.join(['<w:gridCol w:w="2400"/>' for _ in range(cols)]) + '</w:tblGrid>' + ''.join(trs) + '</w:tbl>'

parts = []
parts.append(heading(1, 'Word 高保真渲染极限压力测试文档'))
parts.append(p('本文件用于综合验证标题、段落、列表、图片、表格、分页与keep规则在长文档中的稳定性。'))

for section in range(1, 9):
    parts.append(heading(2, f'章节 {section}: 长文本与格式混排'))
    parts.append(p(f'章节 {section} 导语段。', keep_next=True))
    for i in range(1, 11):
        parts.append(p(f'章节 {section} - 段落 {i}: 这是一段较长文本，用于测试行高、段间距、换行、标点与中英混排。Performance baseline and fidelity alignment are both required.', keep_lines=(i % 3 == 0)))
        if i % 4 == 0:
            parts.append(run_mix(section * 100 + i))

    parts.append(heading(3, f'章节 {section}: 多级编号列表'))
    for i in range(1, 6):
        parts.append(list_p(1, 0, f'编号一级 {section}.{i}'))
        parts.append(list_p(1, 1, f'编号二级 {section}.{i}.a'))
        parts.append(list_p(1, 2, f'编号三级 {section}.{i}.a.i'))

    parts.append(heading(3, f'章节 {section}: 多级项目符号'))
    for i in range(1, 5):
        parts.append(list_p(2, 0, f'项目符号一级 {section}.{i}'))
        parts.append(list_p(2, 1, f'项目符号二级 {section}.{i}'))
        parts.append(list_p(2, 2, f'项目符号三级 {section}.{i}'))

    if section % 2 == 0:
        parts.append(heading(3, f'章节 {section}: 表格块'))
        parts.append(table_block(rows=6, cols=4))

    if section % 3 == 0:
        parts.append(heading(3, f'章节 {section}: 图片块（小中大）'))
        parts.append(image_paragraph('rId3', 2000 + section * 10 + 1, 914400, 685800))
        parts.append(image_paragraph('rId4', 2000 + section * 10 + 2, 2743200, 2057400))
        parts.append(image_paragraph('rId5', 2000 + section * 10 + 3, 4572000, 3429000))

    if section in (3, 6):
        parts.append(p(f'章节 {section} 强制分页段（pageBreakBefore）。', page_break=True))

parts.append(heading(2, '结尾签名区'))
parts.append(p('请验证尾部段落、日期对齐和图片后流式排版是否稳定。'))
parts.append('<w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:t>2026 年 2 月 13 日</w:t></w:r></w:p>')

body_xml = '\n'.join(parts)

document = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    {body_xml}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1800" w:bottom="1440" w:left="1800" w:header="851" w:footer="992" w:gutter="0"/>
      <w:cols w:space="425"/>
      <w:docGrid w:type="lines" w:linePitch="312"/>
    </w:sectPr>
  </w:body>
</w:document>
'''

with ZipFile(out_file, 'w', ZIP_DEFLATED) as z:
    z.writestr('[Content_Types].xml', content_types)
    z.writestr('_rels/.rels', rels)
    z.writestr('word/document.xml', document)
    z.writestr('word/styles.xml', styles)
    z.writestr('word/numbering.xml', numbering)
    z.writestr('word/_rels/document.xml.rels', doc_rels)
    z.writestr('word/media/image-small.png', PNG_RED)
    z.writestr('word/media/image-medium.png', PNG_GREEN)
    z.writestr('word/media/image-large.png', PNG_BLUE)

print(str(out_file))
