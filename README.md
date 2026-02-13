# Render-first Word Fidelity Editor

企业级在线文档系统骨架，目标是将 Word/WPS/Google Docs 内容在 Web 中实现接近像素级保真渲染，并支持可持续演进的局部编辑架构。

本项目当前聚焦 **自研 Render-first 引擎**（`/editor/custom`），用于展示可控性、长期扩展性和工程化能力。

## 项目目标

- 将 Word 内容“先渲染后编辑”，而不是先语义重建再渲染
- 通过 `iframe` 隔离完整 HTML Snapshot，最大化保真度
- 基于 Block Incremental Editing 保障交互和性能
- 通过 DOCX 基线 + HTML 兼容层覆盖多来源粘贴场景
- 输出可测试、可诊断、可度量的生产级骨架

## 技术栈

- Framework: Next.js 15 (App Router) + React 19 + TypeScript
- Parsing: JSZip + DOMParser（DOCX XML 解析）
- Rendering: iframe Render Layer + Overlay Editing Layer
- Testing: Vitest + jsdom
- Quality: ESLint + TypeScript strict mode
- Asset storage: Upyun（服务端上传，客户端仅走 API）
- Optional runtime: Docker / Bun（用于构建提速与环境统一）

## 路由

- `/`：主页入口
- `/editor/custom`：自研高保真编辑器
- `/editor/sdk`：已下线（返回 `notFound()`）

## 架构总览

### 1. Dual-Layer Editor

1. Fidelity Render Layer
- `iframe` 承载原始 HTML Snapshot
- 保留 inline style、style 标签、结构层级
- 避免语义重建导致的样式漂移

2. Editable Overlay Layer
- 扫描渲染 DOM，建立 Block Index
- 定位 block 边界并进行局部冻结编辑
- 仅替换目标 block（Incremental Editing）

### 2. DOCX Baseline Pipeline

上传 `.docx` 后解析并生成 `WordStyleProfile`：

- 页面：页高、页边距、版心宽度
- 字体：默认字体族
- 段落：对齐、段距、行距、缩进、keep/page-break
- run：字号、颜色、粗斜体、下划线、删除线、高亮、底纹、上下标、字距、阴影
- 列表：`numId/ilvl/numFmt/lvlText/start`
- 表格：默认单元格边距

### 3. Render Apply Pipeline（核心）

`lib/word/renderApply.ts` 负责统一渲染应用流程：

1. Word HTML 兼容适配（`mso-*`）
2. 全局基线注入（字体/版心/表格默认样式）
3. 段落级样式映射
4. run 级样式映射
5. 列表 marker 重建（含 `%1.%2.` 模板）
6. 分页与 keep 规则应用
7. 可选格式标记显示（调试/诊断）

## 设计模式（面试可直接讲）

1. Pipeline Pattern
- 渲染逻辑按阶段串联，支持插拔与回归验证

2. Adapter Pattern
- `htmlCompat` 将 Word `mso-*` 属性适配为标准 CSS

3. Strategy Pattern
- 列表 marker 根据 `numFmt/lvlText` 选择格式化策略

4. Incremental Update Pattern
- 编辑仅替换目标 block，避免整文重排

5. Single Responsibility
- 解析（`styleProfile`）/应用（`renderApply`）/诊断（`audit`）/覆盖率（`coverage`）分治

6. Defensive Compatibility
- DOCX 基线与 HTML 粘贴回退并存，保证“可渲染优先”

## 兼容能力矩阵

### A. 已支持（当前可运行能力）

- 粘贴来源
- Word / WPS / Google Docs HTML 粘贴

- 页面与版式
- 页面尺寸与边距基线
- 版心宽度计算
- 基础分页与 keep 规则

- 段落级
- 对齐：left/center/right
- 段前后距
- 行距
- 缩进：left/right/firstLine/hanging
- keepNext / keepLines / pageBreakBefore

- run 级
- 字号、颜色、字体族
- bold/italic/underline/strike
- highlight、底纹
- superscript/subscript
- 字符间距（tracking）
- 文本阴影

- 列表
- 多级编号解析
- `%1.%2.` 模板生成 marker
- section-break 场景计数重置

- 表格
- 默认 `border-collapse`/`border-spacing`
- 表格单元格 padding（来自 DOCX style）
- 单元格垂直对齐兜底

- 图片
- 二进制抽取
- Hash 命名与上传
- CDN URL 回填

- 可观测性
- 样式一致性诊断面板
- 兼容覆盖率统计

### B. 部分支持（已有框架，持续补齐）

- 复杂跨页场景（widow/orphan 全规则）
- 复杂列表跨章节连续性
- 复杂表格嵌套语义保真
- 部分 DrawingML 锚点对象

### C. 规划中

- 修订记录（Track Changes）
- 批注系统
- 域代码/目录自动刷新
- SmartArt/图表/公式深层支持

## 工程目录

```txt
app/
  api/assets/upload/route.ts
  editor/custom/page.tsx

components/editor/custom/
  WordCustomEditorShell.tsx
  WordRenderer.tsx
  OverlayEditor.tsx
  BlockIndexer.ts

lib/word/
  styleProfile.ts
  htmlCompat.ts
  renderApply.ts
  audit.ts
  coverage.ts
  editorHtml.ts

lib/assets/
  imagePipeline.ts

tests/lib/word/
  htmlCompat.test.ts
  renderApply.test.ts
  coverage.test.ts
```

## 环境变量

```bash
UPYUN_BUCKET=your_bucket
UPYUN_OPERATOR=your_operator
UPYUN_PASSWORD=your_password
UPYUN_DOMAIN=https://v0.api.upyun.com
UPYUN_CDN_DOMAIN=https://your-cdn-domain
```

## 本地运行

```bash
npm install
npm run dev
```

访问：`http://localhost:3000/editor/custom`

## 质量门禁

```bash
npm run typecheck
npm run lint
npm run test
```

建议提交流程：

```bash
npm run typecheck && npm run lint && npm run test
```

## Docker / Bun（可选）

适用于国内网络与团队统一环境：

```bash
docker compose up --build
```

可结合 Bun 镜像和镜像源优化构建速度。

## 面试官阅读路径

1. `lib/word/styleProfile.ts`
- 看 DOCX 样式模型如何抽象成可执行 profile

2. `lib/word/renderApply.ts`
- 看渲染流程如何分阶段应用并支持 keep/list/run

3. `components/editor/custom/WordCustomEditorShell.tsx`
- 看 UI orchestration、状态机和交互编排

4. `tests/lib/word/renderApply.test.ts`
- 看关键规则的行为化测试覆盖

5. `lib/word/coverage.ts`
- 看兼容能力如何产品化度量

## 项目价值总结

这个仓库不是“富文本 Demo”，而是企业级 Word 在线编辑器的可落地架构骨架：

- 以保真渲染为第一原则
- 以局部编辑保障可交互性
- 以兼容矩阵和测试体系保障可演进性
- 以模块化边界支撑团队协作与长期维护
