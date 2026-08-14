# 债券文档智能编辑器

债券文档智能编辑器：高保真导入导出 Word、可视化插入控件与可变段落、模板化、内容生成填值导出。

## 技术栈

- **前端**：React 18 + TypeScript + Vite + Ant Design 5
- **文档引擎**：[docx-editor.dev](https://docx-editor.dev)（`@docx-editor.dev/core` / `@docx-editor.dev/react`，精确锁版 `2.2.1`）
- **Monorepo**：pnpm workspace + Turborepo
- **测试**：Vitest；**接口 mock**：MSW（Mock Service Worker）

## 目录结构

```
.
├── packages/core                 # 核心库 @bond-doc/core（三层）
│   └── src
│       ├── model/                # 模型层：Template/Control/可变段落/Token/校验/场景计算/API 契约
│       ├── engine/               # 引擎层：IDocumentAdapter + DocxDocumentAdapter（防腐层）+ 导出编排
│       │   └── SPIKE.md          # docx-editor.dev 引擎关键 API 结论（权威来源）
│       └── react/                # React 层：BondEditor 组件（封装 docx-editor.dev/react）
└── apps/demo                     # 演示应用 @bond-doc/demo
    └── src
        ├── pages/                # 模板列表 / 模板编辑 / 内容生成
        ├── editor/               # 控件插入器、控件检查器
        ├── api/client.ts         # REST 客户端
        └── mocks/                # MSW 契约测试 + 浏览器 mock
```

## 快速开始

```bash
pnpm install

# 启动 demo（dev）
pnpm -C apps/demo dev

# 核心库测试 / 构建（tsc 类型检查）
pnpm -C packages/core test
pnpm -C packages/core build

# demo 契约测试 / 构建
pnpm -C apps/demo test
pnpm -C apps/demo build
```

## 使用流程

1. **新建模板**：在模板列表页创建模板。
2. **导入 docx**：在模板编辑页导入真实 `.docx`，编辑器按原文高保真渲染。
3. **插入控件 / 可变段落**：在文档中插入文本、日期、下拉、金额控件，以及可变段落（含多个场景变体）。
4. **保存**：保存模板（docx 字节 + 元数据）。
5. **内容生成**：进入「内容生成」页，选择每个可变段落的场景变体。
6. **填值 → 导出 Word**：左侧为各控件填值，导出成品 Word；控件标记被替换为值、未选中的变体段落被删除、格式无破坏。

## 架构要点

### 防腐层与版本隔离

`@docx-editor.dev/*` 的 import **只允许出现在**以下两个文件中：

- `packages/core/src/engine/DocxDocumentAdapter.ts`（引擎适配）
- `packages/core/src/react/BondEditor.tsx`（React 封装）

其余代码一律通过 `packages/core/src/engine/adapter.ts` 的 `IDocumentAdapter` 接口与模型层 `Block`/`Template` 等类型交互，不直接依赖引擎。

版本**精确锁定**为 `2.2.1`（`package.json` 中 `@docx-editor.dev/core` / `@docx-editor.dev/react` 均固定 `2.2.1`）。未来升级引擎时**只需改动上述两个文件**。

### 引擎 API 结论

docx-editor.dev 免费版（Apache 2.0 core）的能力边界、`Automation` 协议原语（`search` / `replaceSpan` / `deleteParagraph` / `getParagraphs`）、以及 `IDocumentAdapter` 到引擎原语的映射，详见：

**`packages/core/src/engine/SPIKE.md`**

## 已知限制

- 真实引擎 adapter 的浏览器端端到端行为（`search` / `replaceSpan` / `deleteParagraph` 的运行时表现）需用真实 docx 人工验证，尚未自动化覆盖。
- 表格内段落 / 可变段落的块级标记在表格内的处理策略待明确（当前 `getParagraphs` 展平后视为普通段落）。
- 文档内标记的高亮 / 滚动定位为待增强项（当前仅左侧列表高亮，未实现文档内定位跳转）。

## 保真验证（手动）

1. `pnpm -C apps/demo dev`，打开 http://localhost:5173
2. 准备一个真实债券模板 `.docx`（含表格 / 文本格式）
3. 新建模板 → 导入该 docx → 观察编辑器渲染是否与 Word 一致（保真）
4. 插入一个「文本」控件、一个「日期」控件、一个「可变段落」
5. 保存 → 返回 → 打开「内容生成」→ 左侧填值 → 导出 Word
6. 用 Word 打开导出文件：确认控件标记已被值替换、未选中变体已删除、文档格式无破坏
7. 记录保真偏差到本 README 或 `packages/core/src/engine/SPIKE.md`
