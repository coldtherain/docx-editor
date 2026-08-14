# SPIKE — docx-editor.dev 引擎关键 API 结论

> 结论基于 `@docx-editor.dev/core@2.2.1` / `@docx-editor.dev/react@2.2.1` 的 `.d.ts` 与编译后源码（`apps/demo/node_modules/@docx-editor.dev/*/dist/`），逐字核对了类型声明与运行时 dispatch。日期 2026-08-14。

## 一句话结论

免费版（Apache 2.0 core）**可以实现**全部五项能力，但存在一个关键架构事实：

> **live 编辑器的 `editor.exec(...)` 只支持"以当前选区为目标的命令"，不实现 `replaceText` / `replaceAllMatches` / `replaceMatch`，也拒绝任何带 `target`（DocAnchor/DocLocation/DocRange）的 `insertText` / `deleteText`。**
>
> 精确的"定位替换 run"与"删除段落区间"必须走 **Automation 协议**：`createBrowserAutomationHost(editor)`（`@docx-editor.dev/core/editor`）暴露 `search` / `replaceSpan` / `deleteParagraph` / `getParagraphs` 等操作。保存仍走 `editor.save()` / `ref.save()`。

因此 `IDocumentAdapter` 的实现需要同时持有：① live `Editor`（`exec` 光标插入 + `save`）；② `AutomationHost`（读取块 / 替换 / 删除）。

---

## 五项能力逐条结论

### ① 光标处插入文本 —— 支持

**签名**（live 编辑器）：

```ts
// Editor 接口（contracts/editor）
exec(command: EditorCommand, options?: { scope?: EditorScope }): ExecResult;

// EditorCommand 中的 insertText 分支（由 EditorCommands extends EditorCommandShape<DocEdits> 派生）：
{ type: 'insertText'; text: string; target?: DocTarget }
// target 缺省时在“当前选区/光标”插入；传入 target 会被拒绝。
```

**依据**：
- `contracts/document.d.ts`：`DocEdits.insertText = { target: DocTarget; text: string }`。
- `editor-C8oaTHr3.d.ts`：`EditorCommands extends EditorCommandShape<DocEdits>`，`EditorCommandShape` 将 `target`/`author` 变为可选（"In the editor a command targets the current selection unless told otherwise"）。
- 运行时 `chunk-PD4BVZW5.js` 的 support 检查：`case "insertText": return e.target===void 0 ? {supported:true,mutating:true} : {supported:false,reason:"DocTarget addressing is not supported; text inserts at the selection"}`。

另有 `paste: { text: string }`（换行转真实段落）与 `insertBreak: { kind: 'page'|'column'|'line'|'section' }` 可用。

### ② 读取文档段落/块文本 —— 支持

**签名 A（live 编辑器查询）**：

```ts
query<K extends keyof EditorQueries>(query: { type: K } & EditorQueries[K], options?: { scope?: EditorScope }): EditorQueryResults[K];

// 读取所有段落：
editor.query({ type: 'paragraphs' }); // → readonly ParagraphSummary[]
// ParagraphSummary = { paraId?: string; text: string; styleId?: string }
```

**签名 B（Automation，推荐，与删除/替换同源）**：

```ts
// @docx-editor.dev/core/automation 协议
{ op: 'getDocument' }                    // → { kind:'handle' }
{ op: 'getBody', document }              // → { kind:'handle' }  // 正文 story
{ op: 'getParagraphs', body }            // → { kind:'handles', handles: AutomationHandle[] }  // 阅读顺序，含表格内段落
{ op: 'getText', target: paragraph }     // → { kind:'text', text: string }
```

**依据**：
- `editor-C8oaTHr3.d.ts`：`EditorQueries extends DocQueries`；`DocQueries.paragraphs = { container?: ContainerRef }`，`DocQueryResults.paragraphs = readonly ParagraphSummary[]`。
- `EditorSnapshot`（`snapshot()`）**不含** body/段落文本（只有 scope/selection/formatting/page 等），快照不是文本来源。
- `protocol-BWVA3Q1p.d.ts`：`getParagraphs` 注释明确"Includes paragraphs inside tables — descending through rows, cells and nested tables"。

### ③ 替换 run 文本（token）—— 支持（但不在 live `exec`，而在 Automation）

**不支持（live 编辑器）**：`replaceText` / `replaceAllMatches` / `replaceMatch` 三个命令在免费版运行时**完全不存在**——全量搜索 `dist/*.js`，`replaceText`、`replaceAllMatches`、`replaceMatch` 字符串零命中（仅在 `.d.ts` 契约中声明）。live 编辑器只有 `findMatches(query, options): TextMatch[]` 与 `selectMatch(match)`（查找/定位），无"替换"命令。

**支持（Automation 协议）**：

```ts
{ op: 'search',  scope: AutomationSpanRef, text: string, options?: AutomationSearchOptions } // → { kind:'spans', spans: AutomationSpan[] }
{ op: 'replaceSpan', span: AutomationSpanRef, text: string }                                // 用 text 替换 span；text 为 '' 即删除
```

用法：先 `search { scope: { body }, text: '{{c:<uuid>}}' }` 得到精确 span（可跨 run，`search` 按阅读顺序返回），再 `replaceSpan { span, text: value }`。span 之外的段落其余内容与格式保持不变；被替换片段之外 run 的 `rPr` 不被改动。

**依据**：`protocol-BWVA3Q1p.d.ts` 中 `replaceSpan` 注释："Replace a span with text, which may be empty — that is how a deletion is spelled."（跨表格单元边界的 span 会被拒绝；我们的标记是段内文本，不受影响）。

### ④ 删除指定段落区间 —— 支持（Automation 协议）

**不支持（live 编辑器）**：`deleteText` 仅能"删除当前选区"——运行时检查 `case "deleteText": return e.target===void 0 ? {supported:true} : {supported:false, reason:"DocTarget addressing is not supported; deletion removes the selection"}`。无"删第 N..M 段"命令。

**支持（Automation 协议）**：

```ts
{ op: 'getParagraphs', body }          // → paragraph handles（阅读顺序，含表格内段落）
{ op: 'deleteParagraph', paragraph }   // 删除该段及其全部内容
// 或对连续区间：
{ op: 'replaceSpan', span: { start: { paragraph: pN, at: 'start' }, end: { paragraph: pM, at: 'end' } }, text: '' }
```

用法：用 `getParagraphs` 得到的 handle 数组，按索引（与模型层 `computeDeletions` 返回的块索引一致）逐段 `deleteParagraph`；删除顺序应从后往前（索引随删除前移）。块索引 = `getParagraphs` 结果数组下标，与 `getBlocks()` 完全对齐。

**依据**：`protocol-BWVA3Q1p.d.ts`：`deleteParagraph` 注释 "Remove a paragraph and everything in it."；`AUTOMATION_COMMAND_OPERATIONS` 含 `"deleteParagraph"`、`"replaceSpan"`。

### ⑤ save() —— 支持

**签名**：

```ts
// Editor 接口
save(): Promise<ArrayBuffer>;                       // 序列化当前规范文档为 DOCX 字节（含标记）
// React 封装
DocxEditorRef.save(): Promise<ArrayBuffer | null>;  // 未挂载时为 null
```

**依据**：`editor-C8oaTHr3.d.ts`：`save(): Promise<ArrayBuffer>`（"Serialize the current canonical document to DOCX bytes"）；`@docx-editor.dev/react` 的 `DocxEditorRef.save(): Promise<ArrayBuffer | null>`。浏览器 Automation host 的 `save` 亦可用（`BROWSER_AUTOMATION_CAPABILITIES = { document:true, save:true, ... }`，运行时委托给 session 的 `save()`），但推荐走 `editor.save()` / `ref.save()`。

---

## 关键底层原语（Automation 协议，`@docx-editor.dev/core/automation` / `@docx-editor.dev/core/editor`）

```ts
// 创建 host（浏览器，借用 live 编辑器会话）——免费 core 导出
import { createBrowserAutomationHost } from '@docx-editor.dev/core/editor';
const host: AutomationHost = createBrowserAutomationHost(editor); // editor = useDocxEditor()

host.execute({ operations: AutomationOperation[], expectedRevision?: number }): AutomationBatchResponse;
// AutomationBatchResponse = { ok, results, revision, changed }

// 另有 headless 版本（独立于 live 编辑器）：
import { createServerAutomationHost } from '@docx-editor.dev/core/automation';
createServerAutomationHost(bytes: Uint8Array): { ok: true; host } | { ok: false; reason }
```

`AutomationHost.execute` 批量提交：整批原子（一个 revision、一个 undo unit），任一操作被拒则整批不写。

---

## 最终 IDocumentAdapter 方法签名（Task 7 输入）

接口形态与计划一致（`packages/core/src/engine/adapter.ts`）：

```ts
import { Block } from '../model/model';

export interface IDocumentAdapter {
  getBlocks(): Block[];                          // 读段落文本列表（顺序）
  insertTextAtCursor(text: string): void;        // 光标处插入文本
  replaceToken(token: string, value: string): void; // 精确替换 {{c:<uuid>}} 标记
  deleteBlockIndices(indices: number[]): void;   // 删除指定块区间（索引）
  save(): Promise<ArrayBuffer | null>;           // 导出含标记的 docx
}
```

`DocxDocumentAdapter` 实现映射（关键）：

| 接口方法 | 实现原语 | 来源 |
|---|---|---|
| `getBlocks()` | `host.execute([getDocument, getBody, getParagraphs])` + 每段 `getText` | Automation |
| `insertTextAtCursor(text)` | `editor.exec({ type: 'insertText', text })` | live Editor |
| `replaceToken(token, value)` | `host.execute([search({scope:{body}, text:token}), replaceSpan(span, value)])` | Automation |
| `deleteBlockIndices(indices)` | `host.execute([...getParagraphs])` 后对每个索引 `deleteParagraph`（从后往前） | Automation |
| `save()` | `editor.save()`（或 `ref.save()`） | live Editor |

- 构造入参：`DocxDocumentAdapter` 需同时持有 `DocxEditorInstance`（或 `Editor`）与 `AutomationHost = createBrowserAutomationHost(editor)`。
- `editor` 从 `useDocxEditor()`（返回 `DocxEditorInstance | null`）或 `DocxEditorRef.getEditor()` 获取；`DocxEditorInstance` 满足 `createBrowserAutomationHost(editor: DocxEditorInstance)` 的入参类型。

## 担忧 / 待运行时确认

1. 结论基于类型与编译后源码静态核对，未在浏览器端跑通（本 spike 不要求开浏览器）；`createBrowserAutomationHost` 的实际端到端行为（尤其 `surface.applyAutomationOps` 对 `search`/`replaceSpan`/`deleteParagraph` 的支持度）需 Task 7 用真实 docx 验证。
2. `getParagraphs` 会下钻表格/内容控件，`getBlocks()` 得到的是"展平段落"；模型层 `Block[]` 不含表格语义，需在 Task 7 明确表格内段落的处理策略（当前视为普通段落）。
3. `replaceSpan` 替换文本会继承 span 首 run 的格式（Word 式替换语义），对"标记内文本自带特殊样式"的预期无影响，但跨 run 且格式不一时的替换样式归属需留意。
