# 债券文档智能编辑器（Bond Doc Editor）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个债券文档智能编辑器 Monorepo：高保真导入导出 Word、可视化插入自定义控件与可变段落、模板化管理、内容生成（左预览高亮 + 右属性编辑 + 填充后导出纯净 docx）。

**Architecture:** pnpm + turborepo Monorepo。`packages/core` 分三层（model 纯逻辑 / engine 绑 docx-editor.dev / react 组件）；`apps/demo` 为 React + AntD + MSW 应用。控件与可变段落用"占位标记文本"承载，后端只存元数据，导出时替换标记输出纯净 docx。

**Tech Stack:** React 18/19、TypeScript、Vite、Ant Design、MSW、Vitest、pnpm、turborepo、`@docx-editor.dev/react` + `@docx-editor.dev/core`。

## Global Constraints

- React 版本 `^18 || ^19`（docx-editor.dev 硬性要求）。
- 编辑器包：`@docx-editor.dev/react` + `@docx-editor.dev/core`（core 是 peer 依赖），均为 Apache 2.0。
- 必须导入一次样式：`import '@docx-editor.dev/core/styles/editor.css'`。
- `<DocxEditor>` 填满父容器，父容器必须有真实高度，否则塌陷不可见。
- 编辑器只能客户端渲染（无 SSR；本项目用 Vite，天然满足）。
- `<DocxEditor document={bytes} mode="edit|view" />`；`document` 接受 `Uint8Array | ArrayBuffer`；`ref.save()` 返回 `Promise<ArrayBuffer | null>`。
- 标记语法（唯一权威，所有任务一致）：
  - 控件：`{{c:<uuid>}}`（内联于段落文本中）
  - 可变段落开始：`{{vp:<uuid>:<场景>}}`（独立成段）
  - 可变段落结束：`{{/vp:<uuid>}}`（独立成段）
- 控件**不导出**：导出时用填好的值替换 `{{c:<uuid>}}` 标记，输出纯净 docx。
- 后端契约（MSW）：`GET/POST /api/templates`、`GET/PUT/DELETE /api/templates/:id`、`POST /api/templates/:id/generate → { scenarioMap }`。
- Monorepo 用 pnpm workspaces + turborepo；包名 `@bond-doc/core`、`@bond-doc/demo`。
- 不使用 git（用户明确要求，任务中所有 commit 步骤一律跳过）。

---

### Task 1: Monorepo 脚手架 + core 包骨架

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json`
- Create: `turbo.json`
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/vitest.config.ts`
- Create: `packages/core/src/index.ts`
- Create: `apps/demo/package.json`（占位，Task 2 填 Vite）

**Interfaces:**
- Consumes: 无
- Produces: workspace 布局；`@bond-doc/core` 可被 workspace 内安装；`pnpm -C packages/core test` 可跑。

- [ ] **Step 1: 创建根 package.json**

```json
{
  "name": "bond-doc-editor",
  "private": true,
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

- [ ] **Step 2: 创建 pnpm-workspace.yaml**

```yaml
packages:
  - "packages/*"
  - "apps/*"
```

- [ ] **Step 3: 创建 turbo.json**

```json
{
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "test": { "dependsOn": ["^build"] }
  }
}
```

- [ ] **Step 4: 创建 packages/core/package.json**

```json
{
  "name": "@bond-doc/core",
  "version": "0.0.0",
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "dependencies": {},
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 5: 创建 packages/core/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "declaration": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 6: 创建 packages/core/vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node' } });
```

- [ ] **Step 7: 创建 packages/core/src/index.ts**

```ts
export const CORE_VERSION = '0.0.0';
```

- [ ] **Step 8: 安装依赖并验证**

Run: `pnpm install`
Run: `pnpm -C packages/core test`
Expected: vitest 报"no test files"或通过（空测试），无配置错误。

---

### Task 2: docx-editor.dev 引擎 Spike（锁定关键 API）

**目的：** 文档未明确免费版能否"程序化插入文本 / 查找替换 / 删除段落块"。本任务产出可运行验证 + 落盘的签名结论，后续 engine 层据此实现。

**Files:**
- Create: `apps/demo/package.json`
- Create: `apps/demo/vite.config.ts`
- Create: `apps/demo/tsconfig.json`
- Create: `apps/demo/index.html`
- Create: `apps/demo/src/main.tsx`
- Create: `apps/demo/src/Spike.tsx`
- Create: `packages/core/src/engine/SPIKE.md`

**Interfaces:**
- Consumes: `@bond-doc/core`（Task 1）
- Produces: `SPIKE.md` 记录以下四点的**已验证结论与精确签名**：① 光标处插入文本；② 读取文档段落文本列表；③ 按标记文本替换 run；④ 删除指定段落区间；⑤ `save()` 导出。后续 Task 7 的 `DocxDocumentAdapter` 据此实现。

- [ ] **Step 1: 创建 apps/demo/package.json**

```json
{
  "name": "@bond-doc/demo",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0",
    "antd": "^5.20.0",
    "@docx-editor.dev/react": "^2.2.1",
    "@docx-editor.dev/core": "^2.2.1",
    "@bond-doc/core": "workspace:*"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "vitest": "^2.0.0",
    "msw": "^2.4.0"
  }
}
```

- [ ] **Step 2: 创建 apps/demo/vite.config.ts**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
```

- [ ] **Step 3: 创建 apps/demo/tsconfig.json 与 index.html**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

```html
<!doctype html>
<html lang="zh-CN">
  <head><meta charset="UTF-8" /><title>Bond Doc Editor</title></head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: 创建 apps/demo/src/main.tsx**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import '@docx-editor.dev/core/styles/editor.css';
import { Spike } from './Spike';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Spike />
  </React.StrictMode>
);
```

- [ ] **Step 5: 创建 apps/demo/src/Spike.tsx（逐项验证）**

```tsx
import { useRef, useState } from 'react';
import { DocxEditor, type DocxEditorRef } from '@docx-editor.dev/react';
import { useDocxEditor } from '@docx-editor.dev/react';

export function Spike() {
  const ref = useRef<DocxEditorRef>(null);
  const [bytes, setBytes] = useState<Uint8Array>();

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 8, display: 'flex', gap: 8 }}>
        <input
          type="file"
          accept=".docx"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) setBytes(new Uint8Array(await f.arrayBuffer()));
          }}
        />
        <button onClick={() => void ref.current?.save()}>Save(验证导出)</button>
        <Probe />
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        {bytes && <DocxEditor ref={ref} document={bytes} mode="edit" />}
      </div>
    </div>
  );
}

function Probe() {
  const editor = useDocxEditor();
  return (
    <>
      <button onClick={() => console.log('exec insertText:', editor?.exec({ type: 'insertText', text: '{{c:test}}' }))}>
        A: 光标插入文本
      </button>
      <button onClick={() => console.log('snapshot:', editor?.snapshot())}>
        B: 读取快照(找段落文本来源)
      </button>
    </>
  );
}
```

- [ ] **Step 6: 运行并逐一验证五类能力**

Run: `pnpm -C apps/demo dev`（打开 http://localhost:5173，导入一个含多段文本的 .docx）

在浏览器控制台逐项确认，并在 `packages/core/src/engine/SPIKE.md` 记录：
1. **插入文本**：`editor.exec({ type: 'insertText', text })` 是否有效？若无效，改用 `document.execCommand('insertText', ...)` 或 `insertHTML`，或核心库 `insertBreak` 之外的命令。记录最终可用签名。
2. **读取段落**：`editor.snapshot()` 结构里是否有 body/paragraph 文本数组？若无，用 `editor.query(...)`（见 `@docx-editor.dev/core/contracts/document` 的查询词汇）能否按序遍历块并取文本？记录签名。
3. **替换 run**：能否对"文本包含 `{{c:xxx}}` 的 run"做精确替换（保留其余格式）？若只能 search+replace 全量文本，记录并评估对保真的影响。
4. **删除段落区间**：能否删除第 N 到第 M 个段落？记录签名或"不支持+替代方案（如清空段落文本 / 用 automation 子路径）"。
5. **save()**：确认 `ref.save()` 返回含标记的 docx，可用 Word 打开。

- [ ] **Step 7: 落盘结论**

把最终可行的 `IDocumentAdapter` 方法签名写入 `SPIKE.md` 末尾，作为 Task 7 的输入。若某能力免费版完全无法实现，立即停止并向用户报告（回退到 canvas-editor 或其它方案），不要继续后续任务。

---

### Task 3: 数据模型与标记解析（model 层）

**Files:**
- Create: `packages/core/src/model/model.ts`
- Create: `packages/core/src/model/tokens.ts`
- Test: `packages/core/src/model/tokens.test.ts`

**Interfaces:**
- Consumes: 无（0 依赖）
- Produces: `ControlType`、`ControlDef`、`VariableParagraphDef`、`Template`、`TemplateMetadata`、`Block`、`Blocks`；`controlToken()`、`vpStartToken()`、`vpEndToken()`、`isVpStartBlock()`、`isVpEndBlock()`、`controlTokensIn()`、`replaceControlTokens()`。

- [ ] **Step 1: 写失败测试**

```ts
import { describe, it, expect } from 'vitest';
import { controlToken, vpStartToken, vpEndToken, isVpStartBlock, isVpEndBlock, controlTokensIn, replaceControlTokens } from './tokens';

describe('tokens', () => {
  it('生成与识别控件标记', () => {
    const t = controlToken('3f9a');
    expect(t).toBe('{{c:3f9a}}');
    expect(controlTokensIn('前{{c:3f9a}}后')).toEqual(['3f9a']);
  });

  it('识别可变段落开始/结束块', () => {
    expect(isVpStartBlock('{{vp:1:A}}')).toEqual({ uuid: '1', scenario: 'A' });
    expect(isVpStartBlock('  {{vp:1:A}}  ')).toEqual({ uuid: '1', scenario: 'A' });
    expect(isVpEndBlock('{{/vp:1}}')).toEqual({ uuid: '1' });
    expect(isVpStartBlock('普通文本')).toBeNull();
    expect(isVpEndBlock('{{c:1}}')).toBeNull();
  });

  it('替换文本内的多个控件标记', () => {
    const text = '名称={{c:a}}，日期={{c:b}}';
    expect(replaceControlTokens(text, { a: '债A', b: '2026-08-14' }))
      .toBe('名称=债A，日期=2026-08-14');
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm -C packages/core test`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 model.ts**

```ts
export type ControlType = 'text' | 'date' | 'select' | 'amount';

export interface ControlDef {
  id: string;
  type: ControlType;
  name: string;
  required?: boolean;
  text?: { placeholder?: string; defaultValue?: string; maxLength?: number };
  date?: { defaultValue?: string; min?: string; max?: string; format?: string };
  select?: { options: { label: string; value: string }[]; defaultValue?: string };
  amount?: { min?: number; max?: number; defaultValue?: number };
}

export interface VariableParagraphDef {
  id: string;
  name: string;
  scenarios: string[];
}

export interface TemplateMetadata {
  controls: ControlDef[];
  variableParagraphs: VariableParagraphDef[];
}

export interface Template {
  id: string;
  name: string;
  docx: ArrayBuffer;
  metadata: TemplateMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface Block {
  text: string;
}

export type Blocks = Block[];
```

- [ ] **Step 4: 实现 tokens.ts**

```ts
const CONTROL_RE = /\{\{c:([0-9a-zA-Z-]+)\}\}/g;
const VP_START_RE = /^\s*\{\{vp:([0-9a-zA-Z-]+):([A-Za-z0-9]+)\}\}\s*$/;
const VP_END_RE = /^\s*\{\{\/vp:([0-9a-zA-Z-]+)\}\}\s*$/;

export function controlToken(uuid: string): string {
  return `{{c:${uuid}}}`;
}
export function vpStartToken(uuid: string, scenario: string): string {
  return `{{vp:${uuid}:${scenario}}}`;
}
export function vpEndToken(uuid: string): string {
  return `{{/vp:${uuid}}}`;
}

export function isVpStartBlock(text: string): { uuid: string; scenario: string } | null {
  const m = text.match(VP_START_RE);
  return m ? { uuid: m[1], scenario: m[2] } : null;
}
export function isVpEndBlock(text: string): { uuid: string } | null {
  const m = text.match(VP_END_RE);
  return m ? { uuid: m[1] } : null;
}

export function controlTokensIn(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(CONTROL_RE)) out.push(m[1]);
  return out;
}

export function replaceControlTokens(text: string, valueByUuid: Record<string, string>): string {
  return text.replace(CONTROL_RE, (_all, uuid: string) => valueByUuid[uuid] ?? _all);
}
```

- [ ] **Step 5: 运行确认通过**

Run: `pnpm -C packages/core test`
Expected: PASS

---

### Task 4: 场景应用与填充替换（model 层）

**Files:**
- Create: `packages/core/src/model/scenario.ts`
- Test: `packages/core/src/model/scenario.test.ts`

**Interfaces:**
- Consumes: `Block`/`Blocks`（Task 3）、`isVpStartBlock`/`isVpEndBlock`（Task 3）
- Produces: `applyScenario(blocks, scenarioMap)`、`fillControls(blocks, valueByUuid)`、`computeReplacements(blocks, values)`（供 engine 层按标记替换）、`computeDeletions(blocks, scenarioMap)`（供 engine 层按块区间删除）

- [ ] **Step 1: 写失败测试**

```ts
import { describe, it, expect } from 'vitest';
import { applyScenario, fillControls, computeDeletions, computeReplacements } from './scenario';
import { Blocks } from './model';

describe('scenario', () => {
  const blocks: Blocks = [
    { text: '开头' },
    { text: '{{vp:1:A}}' },
    { text: 'A 内容' },
    { text: '{{/vp:1}}' },
    { text: '{{vp:1:B}}' },
    { text: 'B 内容' },
    { text: '{{/vp:1}}' },
    { text: '结尾，金额={{c:amt}}' },
  ];

  it('applyScenario 只保留选中变体', () => {
    expect(applyScenario(blocks, { '1': 'B' }).map((b) => b.text)).toEqual([
      '开头', 'B 内容', '结尾，金额={{c:amt}}',
    ]);
  });

  it('未给场景时保留首个变体', () => {
    expect(applyScenario(blocks, {}).map((b) => b.text)).toEqual([
      '开头', 'A 内容', '结尾，金额={{c:amt}}',
    ]);
  });

  it('fillControls 替换控件标记', () => {
    const after = applyScenario(blocks, { '1': 'B' });
    expect(fillControls(after, { amt: '100.00' }).map((b) => b.text)).toEqual([
      '开头', 'B 内容', '结尾，金额=100.00',
    ]);
  });

  it('computeDeletions 返回需删除的块区间(原索引)', () => {
    const del = computeDeletions(blocks, { '1': 'B' });
    // 删除 A 变体块：索引 1..3；以及 B 变体自身标记块 4 与 6
    expect(del).toEqual([1, 2, 3, 4, 6]);
  });

  it('computeReplacements 返回标记->值映射', () => {
    expect(computeReplacements(blocks, { amt: '99' })).toEqual([{ token: '{{c:amt}}', value: '99' }]);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm -C packages/core test`
Expected: FAIL

- [ ] **Step 3: 实现 scenario.ts**

```ts
import { Block, Blocks } from './model';
import { isVpStartBlock, isVpEndBlock, controlTokensIn } from './tokens';

export function applyScenario(blocks: Blocks, scenarioMap: Record<string, string>): Blocks {
  const out: Blocks = [];
  let i = 0;
  while (i < blocks.length) {
    const start = isVpStartBlock(blocks[i].text);
    if (!start) {
      out.push(blocks[i]);
      i++;
      continue;
    }
    const { uuid, scenario } = start;
    const chosen = scenarioMap[uuid];
    let j = i + 1;
    const content: Blocks = [];
    while (j < blocks.length) {
      const end = isVpEndBlock(blocks[j].text);
      if (end && end.uuid === uuid) break;
      content.push(blocks[j]);
      j++;
    }
    if (chosen === undefined || scenario === chosen) out.push(...content);
    i = j + 1;
  }
  return out;
}

export function fillControls(blocks: Blocks, valueByUuid: Record<string, string>): Blocks {
  const { replaceControlTokens } = require('./tokens') as typeof import('./tokens');
  return blocks.map((b) => ({ text: replaceControlTokens(b.text, valueByUuid) }));
}

export function computeDeletions(blocks: Blocks, scenarioMap: Record<string, string>): number[] {
  const del: number[] = [];
  let i = 0;
  while (i < blocks.length) {
    const start = isVpStartBlock(blocks[i].text);
    if (!start) {
      i++;
      continue;
    }
    const { uuid, scenario } = start;
    const chosen = scenarioMap[uuid];
    const keep = chosen === undefined || scenario === chosen;
    del.push(i);
    let j = i + 1;
    while (j < blocks.length) {
      const end = isVpEndBlock(blocks[j].text);
      if (end && end.uuid === uuid) {
        del.push(j);
        break;
      }
      if (!keep) del.push(j);
      j++;
    }
    i = j + 1;
  }
  return del;
}

export function computeReplacements(blocks: Blocks, valueByUuid: Record<string, string>): { token: string; value: string }[] {
  const { controlToken } = require('./tokens') as typeof import('./tokens');
  const out: { token: string; value: string }[] = [];
  for (const b of blocks) {
    for (const uuid of controlTokensIn(b.text)) {
      if (uuid in valueByUuid) out.push({ token: controlToken(uuid), value: valueByUuid[uuid] });
    }
  }
  return out;
}
```

> 注：`require` 在此处仅为避免重复 import 的示意，实际实现请使用顶部 `import { controlToken, replaceControlTokens } from './tokens'`。

- [ ] **Step 4: 修正 import（将 `require` 改为顶部 ESM import）**

```ts
import { Block, Blocks } from './model';
import { isVpStartBlock, isVpEndBlock, controlTokensIn, controlToken, replaceControlTokens } from './tokens';
```

- [ ] **Step 5: 运行确认通过**

Run: `pnpm -C packages/core test`
Expected: PASS

---

### Task 5: 控件值校验（model 层）

**Files:**
- Create: `packages/core/src/model/validation.ts`
- Test: `packages/core/src/model/validation.test.ts`

**Interfaces:**
- Consumes: `ControlDef`（Task 3）
- Produces: `ValidationError { uuid; name; message }`、`validateValues(controls, values): ValidationError[]`

- [ ] **Step 1: 写失败测试**

```ts
import { describe, it, expect } from 'vitest';
import { validateValues } from './validation';
import { ControlDef } from './model';

describe('validation', () => {
  const controls: ControlDef[] = [
    { id: 'a', type: 'text', name: '名称', required: true, text: { maxLength: 5 } },
    { id: 'd', type: 'date', name: '付息日', date: { min: '2026-01-01', max: '2026-12-31' } },
    { id: 'amt', type: 'amount', name: '金额', amount: { min: 0, max: 100 } },
    { id: 's', type: 'select', name: '类型', select: { options: [{ label: 'A', value: 'A' }, { label: 'B', value: 'B' }] } },
  ];

  it('必填为空报错', () => {
    const errs = validateValues(controls, {});
    expect(errs.some((e) => e.uuid === 'a')).toBe(true);
  });

  it('超长报错', () => {
    const errs = validateValues(controls, { a: '123456' });
    expect(errs.some((e) => e.uuid === 'a')).toBe(true);
  });

  it('日期越界报错', () => {
    const errs = validateValues(controls, { a: 'ok', d: '2027-01-01' });
    expect(errs.some((e) => e.uuid === 'd')).toBe(true);
  });

  it('金额非数字或越界报错', () => {
    expect(validateValues(controls, { a: 'ok', amt: 'abc' }).some((e) => e.uuid === 'amt')).toBe(true);
    expect(validateValues(controls, { a: 'ok', amt: '999' }).some((e) => e.uuid === 'amt')).toBe(true);
  });

  it('下拉值不在选项内报错', () => {
    expect(validateValues(controls, { a: 'ok', s: 'C' }).some((e) => e.uuid === 's')).toBe(true);
  });

  it('全部合法返回空', () => {
    expect(validateValues(controls, { a: 'ok', d: '2026-06-01', amt: '50', s: 'A' })).toEqual([]);
  });
});
```

- [ ] **Step 2: 运行确认失败** — `pnpm -C packages/core test`，Expected: FAIL
- [ ] **Step 3: 实现 validation.ts**

```ts
import { ControlDef } from './model';

export interface ValidationError {
  uuid: string;
  name: string;
  message: string;
}

export function validateValues(controls: ControlDef[], values: Record<string, string>): ValidationError[] {
  const errs: ValidationError[] = [];
  for (const c of controls) {
    const v = values[c.id];
    const empty = v === undefined || v.trim() === '';
    if (c.required && empty) {
      errs.push({ uuid: c.id, name: c.name, message: '必填' });
      continue;
    }
    if (empty) continue;
    if (c.type === 'text' && c.text?.maxLength && v.length > c.text.maxLength) {
      errs.push({ uuid: c.id, name: c.name, message: `不能超过 ${c.text.maxLength} 字符` });
    }
    if (c.type === 'date' && c.date) {
      if (c.date.min && v < c.date.min) errs.push({ uuid: c.id, name: c.name, message: `不能早于 ${c.date.min}` });
      if (c.date.max && v > c.date.max) errs.push({ uuid: c.id, name: c.name, message: `不能晚于 ${c.date.max}` });
    }
    if (c.type === 'amount' && c.amount) {
      const n = Number(v);
      if (Number.isNaN(n)) errs.push({ uuid: c.id, name: c.name, message: '必须是数字' });
      else {
        if (c.amount.min !== undefined && n < c.amount.min) errs.push({ uuid: c.id, name: c.name, message: `不能小于 ${c.amount.min}` });
        if (c.amount.max !== undefined && n > c.amount.max) errs.push({ uuid: c.id, name: c.name, message: `不能大于 ${c.amount.max}` });
      }
    }
    if (c.type === 'select' && c.select) {
      const ok = c.select.options.some((o) => o.value === v);
      if (!ok) errs.push({ uuid: c.id, name: c.name, message: '值不在选项内' });
    }
  }
  return errs;
}
```

- [ ] **Step 4: 运行确认通过** — `pnpm -C packages/core test`，Expected: PASS

---

### Task 6: 模板序列化 + 后端契约（model 层）

**Files:**
- Create: `packages/core/src/model/template.ts`
- Create: `packages/core/src/model/api.ts`
- Test: `packages/core/src/model/template.test.ts`

**Interfaces:**
- Consumes: `Template`/`TemplateMetadata`（Task 3）
- Produces: `templateToJSON(t): string`、`templateFromJSON(s): Template`；`TemplateSummary`、`GenerateRequest`、`GenerateResponse`、`ENDPOINTS`、`validateTemplateMetadata(t)`（校验 metadata 与标记一致性）

- [ ] **Step 1: 写失败测试**

```ts
import { describe, it, expect } from 'vitest';
import { templateToJSON, templateFromJSON, validateTemplateMetadata } from './template';
import { Template, Blocks } from './model';
import { controlTokensIn } from './tokens';

describe('template', () => {
  it('base64 序列化往返', () => {
    const t: Template = {
      id: '1', name: '模板',
      docx: new TextEncoder().encode('hello').buffer,
      metadata: { controls: [{ id: 'a', type: 'text', name: '名称' }], variableParagraphs: [] },
      createdAt: '2026-08-14', updatedAt: '2026-08-14',
    };
    const back = templateFromJSON(templateToJSON(t));
    expect(new Uint8Array(back.docx)).toEqual(new TextEncoder().encode('hello'));
    expect(back.metadata.controls[0].name).toBe('名称');
  });

  it('metadata 与标记一致性校验', () => {
    const metadata = { controls: [{ id: 'a', type: 'text' as const, name: 'x' }], variableParagraphs: [] };
    const blocksOk: Blocks = [{ text: 'x {{c:a}}' }];
    const blocksBad: Blocks = [{ text: 'x {{c:missing}}' }];
    expect(validateTemplateMetadata(metadata, blocksOk)).toEqual([]);
    expect(validateTemplateMetadata(metadata, blocksBad).length).toBe(1);
  });
});
```

- [ ] **Step 2: 运行确认失败** — `pnpm -C packages/core test`，Expected: FAIL
- [ ] **Step 3: 实现 template.ts**

```ts
import { Template, TemplateMetadata, Blocks } from './model';
import { controlTokensIn } from './tokens';

export function templateToJSON(t: Template): string {
  const bytes = new Uint8Array(t.docx);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return JSON.stringify({ ...t, docx: btoa(bin) });
}

export function templateFromJSON(s: string): Template {
  const o = JSON.parse(s);
  const bin = atob(o.docx);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { ...o, docx: bytes.buffer };
}

export interface TemplateConsistencyIssue {
  message: string;
}

export function validateTemplateMetadata(metadata: TemplateMetadata, blocks: Blocks): string[] {
  const issues: string[] = [];
  const declared = new Set(metadata.controls.map((c) => c.id));
  const inDoc = new Set<string>();
  for (const b of blocks) for (const u of controlTokensIn(b.text)) inDoc.add(u);
  for (const id of inDoc) if (!declared.has(id)) issues.push(`文档中的控件标记 {{c:${id}}} 未在元数据中声明`);
  for (const id of declared) if (!inDoc.has(id)) issues.push(`元数据中的控件「${id}」在文档中缺少标记`);
  return issues;
}
```

- [ ] **Step 4: 实现 api.ts**

```ts
export interface TemplateSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateRequest {
  params: Record<string, unknown>;
}

export interface GenerateResponse {
  scenarioMap: Record<string, string>;
}

export const ENDPOINTS = {
  templates: '/api/templates',
  template: (id: string) => `/api/templates/${id}`,
  generate: (id: string) => `/api/templates/${id}/generate`,
} as const;
```

- [ ] **Step 5: 运行确认通过** — `pnpm -C packages/core test`，Expected: PASS

---

### Task 7: 引擎适配器 + 导出编排（engine 层）

**依赖 Task 2（SPIKE.md）的结论实现。** 若 Task 2 发现免费版无法完成插入/替换/删除，则本任务前先回报用户。

**Files:**
- Create: `packages/core/src/engine/adapter.ts`
- Create: `packages/core/src/engine/export.ts`
- Create: `packages/core/src/engine/DocxDocumentAdapter.ts`
- Test: `packages/core/src/engine/export.test.ts`（用 fake adapter，不依赖真实引擎）

**Interfaces:**
- Consumes: `Block`/`Blocks`、`TemplateMetadata`（Task 3）、`computeDeletions`/`computeReplacements`（Task 4）、`validateValues`（Task 5）
- Produces: `IDocumentAdapter`、`DocxDocumentAdapter`（按 SPIKE 实现）、`exportDocument(adapter, metadata, values, scenarioMap): Promise<ArrayBuffer>`

- [ ] **Step 1: 定义 adapter.ts**

```ts
import { Block } from '../model/model';

export interface IDocumentAdapter {
  getBlocks(): Block[];
  insertTextAtCursor(text: string): void;
  replaceToken(token: string, value: string): void;
  deleteBlockIndices(indices: number[]): void;
  save(): Promise<ArrayBuffer | null>;
}
```

- [ ] **Step 2: 写失败测试（fake adapter）**

```ts
import { describe, it, expect } from 'vitest';
import { IDocumentAdapter } from './adapter';
import { exportDocument, ExportValidationError } from './export';
import { Block, TemplateMetadata } from '../model/model';

class FakeAdapter implements IDocumentAdapter {
  blocks: Block[];
  constructor(blocks: Block[]) { this.blocks = blocks; }
  getBlocks() { return this.blocks; }
  insertTextAtCursor(text: string) { this.blocks.push({ text }); }
  replaceToken(token: string, value: string) {
    this.blocks = this.blocks.map((b) => ({ text: b.text.replaceAll(token, value) }));
  }
  deleteBlockIndices(indices: number[]) {
    this.blocks = this.blocks.filter((_, i) => !indices.includes(i));
  }
  async save() { return new ArrayBuffer(1); }
}

describe('exportDocument', () => {
  const metadata: TemplateMetadata = {
    controls: [{ id: 'amt', type: 'amount', name: '金额', required: true }],
    variableParagraphs: [{ id: '1', name: '付息', scenarios: ['A', 'B'] }],
  };
  const blocks: Block[] = [
    { text: '{{vp:1:A}}' }, { text: 'A内容' }, { text: '{{/vp:1}}' },
    { text: '{{vp:1:B}}' }, { text: 'B内容' }, { text: '{{/vp:1}}' },
    { text: '金额={{c:amt}}' },
  ];

  it('导出时应用场景并替换控件值', async () => {
    const adapter = new FakeAdapter(blocks);
    await exportDocument(adapter, metadata, { amt: '100' }, { '1': 'B' });
    expect(adapter.blocks.map((b) => b.text)).toEqual(['B内容', '金额=100']);
  });

  it('必填未填抛出校验错误', async () => {
    const adapter = new FakeAdapter(blocks);
    await expect(exportDocument(adapter, metadata, {}, { '1': 'B' })).rejects.toThrow(ExportValidationError);
  });
});
```

- [ ] **Step 3: 运行确认失败** — `pnpm -C packages/core test`，Expected: FAIL
- [ ] **Step 4: 实现 export.ts**

```ts
import { IDocumentAdapter } from './adapter';
import { TemplateMetadata } from '../model/model';
import { computeDeletions, computeReplacements } from '../model/scenario';
import { validateValues, ValidationError } from '../model/validation';

export class ExportValidationError extends Error {
  constructor(public readonly errors: ValidationError[]) {
    super('校验未通过');
  }
}

export async function exportDocument(
  adapter: IDocumentAdapter,
  metadata: TemplateMetadata,
  values: Record<string, string>,
  scenarioMap: Record<string, string>,
): Promise<ArrayBuffer> {
  const errs = validateValues(metadata.controls, values);
  if (errs.length) throw new ExportValidationError(errs);

  const blocks = adapter.getBlocks();
  const deletions = computeDeletions(blocks, scenarioMap);
  const replacements = computeReplacements(blocks, values);

  if (deletions.length) adapter.deleteBlockIndices(deletions);
  for (const r of replacements) adapter.replaceToken(r.token, r.value);

  const buffer = await adapter.save();
  if (!buffer) throw new Error('导出失败：无文档');
  return buffer;
}
```

- [ ] **Step 5: 运行确认通过** — `pnpm -C packages/core test`，Expected: PASS
- [ ] **Step 6: 实现 DocxDocumentAdapter.ts（按 SPIKE.md 结论）**

依据 `packages/core/src/engine/SPIKE.md` 记录的可运行签名，实现 `DocxDocumentAdapter` 的五个方法（`getBlocks` 用查询词汇遍历块取文本；`insertTextAtCursor` 用验证过的插入命令；`replaceToken`/`deleteBlockIndices` 用验证过的替换/删除能力；`save` 调 `ref.save()` 或编辑器 `save()`）。若 SPIKE 表明某方法无免费实现，回报用户。

---

### Task 8: BondEditor 组件（react 层）

**Files:**
- Create: `packages/core/src/react/BondEditor.tsx`
- Modify: `packages/core/src/index.ts`（导出新符号）

**Interfaces:**
- Consumes: `@docx-editor.dev/react`
- Produces: `BondEditor`（封装 `<DocxEditor>`，透传 `document`/`mode`/`onSave`，并暴露 `getAdapter()` 供 demo 获取 `IDocumentAdapter` 与 `save`）

- [ ] **Step 1: 实现 BondEditor.tsx**

```tsx
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { DocxEditor, type DocxEditorRef } from '@docx-editor.dev/react';
import '@docx-editor.dev/core/styles/editor.css';

export interface BondEditorRef {
  save(): Promise<ArrayBuffer | null>;
  focus(): void;
}

export interface BondEditorProps {
  document?: Uint8Array | ArrayBuffer;
  mode?: 'edit' | 'view';
  onSave?: () => void;
  style?: React.CSSProperties;
}

export const BondEditor = forwardRef<BondEditorRef, BondEditorProps>(
  function BondEditor({ document, mode = 'edit', onSave, style }, ref) {
    const inner = useRef<DocxEditorRef>(null);
    useImperativeHandle(ref, () => ({
      save: () => inner.current?.save() ?? Promise.resolve(null),
      focus: () => inner.current?.focus(),
    }));

    return (
      <div style={{ height: '100%', minHeight: 0, ...style }}>
        <DocxEditor ref={inner} document={document} mode={mode} onSave={onSave} />
      </div>
    );
  },
);
```

- [ ] **Step 2: 更新 index.ts 导出**

```ts
export * from './model/model';
export * from './model/tokens';
export * from './model/scenario';
export * from './model/validation';
export * from './model/template';
export * from './model/api';
export * from './engine/adapter';
export * from './engine/export';
export { BondEditor } from './react/BondEditor';
export type { BondEditorRef, BondEditorProps } from './react/BondEditor';
```

- [ ] **Step 3: 验证类型** — `pnpm -C packages/core build`（`tsc --noEmit`），Expected: 无类型错误

---

### Task 9: demo 应用壳 + MSW + 模板 CRUD

**Files:**
- Create: `apps/demo/src/App.tsx`
- Create: `apps/demo/src/api/client.ts`
- Create: `apps/demo/src/mocks/handlers.ts`
- Create: `apps/demo/src/mocks/browser.ts`
- Create: `apps/demo/src/store.ts`
- Create: `apps/demo/src/pages/TemplateList.tsx`
- Modify: `apps/demo/src/main.tsx`（接入 MSW + 路由）

**Interfaces:**
- Consumes: `@bond-doc/core` 的 `TemplateSummary`/`Template`/`ENDPOINTS`/`templateToJSON`/`templateFromJSON`
- Produces: `api.client.ts` 的 `listTemplates`/`createTemplate`/`getTemplate`/`updateTemplate`/`deleteTemplate`/`generate`

- [ ] **Step 1: 实现 client.ts**

```ts
import { Template, TemplateSummary, GenerateRequest, GenerateResponse, ENDPOINTS, templateToJSON, templateFromJSON } from '@bond-doc/core';

const j = (r: Response) => { if (!r.ok) throw new Error(`${r.status}`); return r; };

export async function listTemplates(): Promise<TemplateSummary[]> {
  return (await j(await fetch(ENDPOINTS.templates))).json();
}
export async function createTemplate(t: Template): Promise<Template> {
  const res = await j(await fetch(ENDPOINTS.templates, { method: 'POST', body: templateToJSON(t) }));
  return templateFromJSON(await res.text());
}
export async function getTemplate(id: string): Promise<Template> {
  const res = await j(await fetch(ENDPOINTS.template(id)));
  return templateFromJSON(await res.text());
}
export async function updateTemplate(id: string, t: Template): Promise<Template> {
  const res = await j(await fetch(ENDPOINTS.template(id), { method: 'PUT', body: templateToJSON(t) }));
  return templateFromJSON(await res.text());
}
export async function deleteTemplate(id: string): Promise<void> {
  await j(await fetch(ENDPOINTS.template(id), { method: 'DELETE' }));
}
export async function generate(id: string, params: GenerateRequest): Promise<GenerateResponse> {
  return (await j(await fetch(ENDPOINTS.generate(id), { method: 'POST', body: JSON.stringify(params) }))).json();
}
```

- [ ] **Step 2: 实现 handlers.ts（内存存储 + 场景模拟）**

```ts
import { http, HttpResponse } from 'msw';
import { Template, TemplateSummary, templateToJSON, templateFromJSON, ENDPOINTS } from '@bond-doc/core';

const store = new Map<string, Template>();
let seq = 0;

export const handlers = [
  http.get(ENDPOINTS.templates, () => {
    const list: TemplateSummary[] = [...store.values()].map((t) => ({
      id: t.id, name: t.name, createdAt: t.createdAt, updatedAt: t.updatedAt,
    }));
    return HttpResponse.json(list);
  }),
  http.post(ENDPOINTS.templates, async ({ request }) => {
    const t = templateFromJSON(await request.text());
    t.id = String(++seq);
    const now = new Date().toISOString();
    t.createdAt = now; t.updatedAt = now;
    store.set(t.id, t);
    return new HttpResponse(templateToJSON(t), { status: 201 });
  }),
  http.get(ENDPOINTS.template(':id'), ({ params }) => {
    const t = store.get(String(params.id));
    if (!t) return new HttpResponse(null, { status: 404 });
    return new HttpResponse(templateToJSON(t));
  }),
  http.put(ENDPOINTS.template(':id'), async ({ params, request }) => {
    const next = templateFromJSON(await request.text());
    next.id = String(params.id);
    next.updatedAt = new Date().toISOString();
    store.set(next.id, next);
    return new HttpResponse(templateToJSON(next));
  }),
  http.delete(ENDPOINTS.template(':id'), ({ params }) => {
    store.delete(String(params.id));
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(ENDPOINTS.generate(':id'), async ({ request }) => {
    const body = (await request.json()) as { params?: Record<string, unknown> };
    // 模拟：后端按债券支数返回场景。默认演示"两支债券"→ 首个可变段落 A、第二个 B
    const count = typeof body.params?.bondCount === 'number' ? body.params.bondCount : 2;
    const t = store.get(String(request.params?.id) ?? '');
    const scenarioMap: Record<string, string> = {};
    if (t) {
      const vps = t.metadata.variableParagraphs;
      vps.forEach((vp, idx) => {
        const scenarios = vp.scenarios;
        scenarioMap[vp.id] = count >= 2 && idx === 1 ? 'B' : scenarios[0] ?? 'A';
      });
    }
    return HttpResponse.json({ scenarioMap });
  }),
];
```

- [ ] **Step 3: 实现 browser.ts**

```ts
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
```

- [ ] **Step 4: 实现 store.ts（轻量客户端状态）**

```ts
import { create } from 'zustand';
```
> 若不想引入 zustand，改用 React Context 亦可；本计划用 zustand（见下方依赖）。请在 `apps/demo/package.json` 增加 `"zustand": "^4.5.0"` 后再实现。

```ts
import { create } from 'zustand';

interface AppState {
  scenarioMap: Record<string, string>;
  values: Record<string, string>;
  setScenarioMap(m: Record<string, string>): void;
  setValue(uuid: string, v: string): void;
}

export const useAppStore = create<AppState>((set) => ({
  scenarioMap: {},
  values: {},
  setScenarioMap: (m) => set({ scenarioMap: m }),
  setValue: (uuid, v) => set((s) => ({ values: { ...s.values, [uuid]: v } })),
}));
```

- [ ] **Step 5: 实现 App.tsx 与 TemplateList.tsx**

```tsx
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { TemplateList } from './pages/TemplateList';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TemplateList />} />
        <Route path="/templates/:id/edit" element={<div>编辑器（Task 10）</div>} />
        <Route path="/templates/:id/generate" element={<div>内容生成（Task 11）</div>} />
      </Routes>
    </BrowserRouter>
  );
}
```

```tsx
import { useEffect, useState } from 'react';
import { Button, Table, Space, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { listTemplates, createTemplate, deleteTemplate } from '../api/client';
import { TemplateSummary } from '@bond-doc/core';

export function TemplateList() {
  const [rows, setRows] = useState<TemplateSummary[]>([]);
  const nav = useNavigate();

  const refresh = () => listTemplates().then(setRows);

  useEffect(() => { void refresh(); }, []);

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          onClick={async () => {
            const t = await createTemplate({
              id: '', name: '新模板',
              docx: new ArrayBuffer(0),
              metadata: { controls: [], variableParagraphs: [] },
              createdAt: '', updatedAt: '',
            });
            nav(`/templates/${t.id}/edit`);
          }}
        >
          新建模板
        </Button>
      </Space>
      <Table
        rowKey="id"
        dataSource={rows}
        columns={[
          { title: '名称', dataIndex: 'name' },
          { title: '更新时间', dataIndex: 'updatedAt' },
          {
            title: '操作', render: (_, r) => (
              <Space>
                <a onClick={() => nav(`/templates/${r.id}/edit`)}>编辑</a>
                <a onClick={() => nav(`/templates/${r.id}/generate`)}>内容生成</a>
                <a onClick={async () => { await deleteTemplate(r.id); void refresh(); }}>删除</a>
              </Space>
            ),
          },
        ]}
      />
    </div>
  );
}
```

- [ ] **Step 6: 更新 main.tsx 接入 MSW**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import '@docx-editor.dev/core/styles/editor.css';
import { App } from './App';

async function bootstrap() {
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

void bootstrap();
```

- [ ] **Step 7: 运行验证**

Run: `pnpm install`（确保 zustand 与 msw 安装）
Run: `pnpm -C apps/demo dev`
Expected: 页面显示模板列表，可新建/删除，网络请求被 MSW 拦截（控制台无 404）。

---

### Task 10: 模板编辑器（插入控件 + 可变段落 + 属性面板）

**Files:**
- Create: `apps/demo/src/pages/TemplateEditor.tsx`
- Create: `apps/demo/src/editor/ControlInserter.tsx`
- Create: `apps/demo/src/editor/ControlInspector.tsx`

**Interfaces:**
- Consumes: `BondEditor`、`getTemplate`/`updateTemplate`、`@bond-doc/core` 的 `controlToken`/`vpStartToken`/`vpEndToken`/`ControlDef`/`VariableParagraphDef`/`crypto.randomUUID`
- Produces: 可导入 docx、插入控件标记、插入可变段落、编辑属性并保存的模板编辑页

- [ ] **Step 1: 实现 ControlInserter.tsx**

```tsx
import { Button, Space, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { controlToken, vpStartToken, vpEndToken, ControlType } from '@bond-doc/core';
import { useDocxEditor } from '@docx-editor.dev/react';

export interface InsertCallbacks {
  onInsertControl(type: ControlType, id: string): void;
  onInsertVariableParagraph(id: string, scenarios: string[]): void;
}

export function ControlInserter({ onInsertControl, onInsertVariableParagraph }: InsertCallbacks) {
  const editor = useDocxEditor();

  const insertText = (text: string) => {
    // 按 SPIKE.md 验证的插入方式插入文本；此处以 exec insertText 为例
    editor?.exec({ type: 'insertText', text } as never);
  };

  const controlItems: MenuProps['items'] = (['text', 'date', 'select', 'amount'] as ControlType[]).map((t) => ({
    key: t,
    label: ({ text: '文本', date: '日期', select: '下拉', amount: '金额' } as Record<ControlType, string>)[t],
  }));

  return (
    <Space>
      <Dropdown
        menu={{
          items: controlItems,
          onClick: ({ key }) => {
            const id = crypto.randomUUID();
            insertText(controlToken(id));
            onInsertControl(key as ControlType, id);
          },
        }}
      >
        <Button>插入控件</Button>
      </Dropdown>
      <Button
        onClick={() => {
          const id = crypto.randomUUID();
          insertText(`\n${vpStartToken(id, 'A')}\nA 内容\n${vpEndToken(id)}\n${vpStartToken(id, 'B')}\nB 内容\n${vpEndToken(id)}`);
          onInsertVariableParagraph(id, ['A', 'B']);
        }}
      >
        插入可变段落
      </Button>
    </Space>
  );
}
```

- [ ] **Step 2: 实现 ControlInspector.tsx（右侧属性面板）**

```tsx
import { Form, Input, Select, InputNumber, Switch, Button, Space } from 'antd';
import { ControlDef, ControlType } from '@bond-doc/core';

export function ControlInspector({ control, onChange, onDelete }: {
  control: ControlDef | null;
  onChange: (c: ControlDef) => void;
  onDelete: (id: string) => void;
}) {
  if (!control) return <div style={{ padding: 16 }}>未选中控件</div>;

  return (
    <div style={{ padding: 16 }}>
      <Form
        layout="vertical"
        initialValues={control}
        onValuesChange={(_, all) => onChange({ ...control, ...(all as Partial<ControlDef>) })}
      >
        <Form.Item label="名称" name="name"><Input /></Form.Item>
        <Form.Item label="必填" name="required" valuePropName="checked"><Switch /></Form.Item>
        {control.type === 'text' && (
          <>
            <Form.Item label="默认值" name={['text', 'defaultValue']}><Input /></Form.Item>
            <Form.Item label="最大长度" name={['text', 'maxLength']}><InputNumber /></Form.Item>
          </>
        )}
        {control.type === 'date' && (
          <>
            <Form.Item label="最小日期" name={['date', 'min']}><Input /></Form.Item>
            <Form.Item label="最大日期" name={['date', 'max']}><Input /></Form.Item>
          </>
        )}
        {control.type === 'select' && (
          <Form.Item label="选项(逗号分隔)" name={['select', 'options']}>
            <Input />
          </Form.Item>
        )}
        {control.type === 'amount' && (
          <>
            <Form.Item label="最小值" name={['amount', 'min']}><InputNumber /></Form.Item>
            <Form.Item label="最大值" name={['amount', 'max']}><InputNumber /></Form.Item>
          </>
        )}
      </Form>
      <Space>
        <Button danger onClick={() => onDelete(control.id)}>删除控件</Button>
      </Space>
    </div>
  );
}
```

- [ ] **Step 3: 实现 TemplateEditor.tsx**

```tsx
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Space, message } from 'antd';
import { BondEditor, BondEditorRef } from '@bond-doc/core';
import { getTemplate, updateTemplate } from '../api/client';
import { ControlInserter } from '../editor/ControlInserter';
import { ControlInspector } from '../editor/ControlInspector';
import { ControlDef, ControlType, Template, VariableParagraphDef } from '@bond-doc/core';

export function TemplateEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const editorRef = useRef<BondEditorRef>(null);
  const [docx, setDocx] = useState<ArrayBuffer>();
  const [template, setTemplate] = useState<Template | null>(null);
  const [selected, setSelected] = useState<ControlDef | null>(null);

  useEffect(() => {
    if (!id) return;
    void getTemplate(id).then((t) => { setTemplate(t); setDocx(t.docx); });
  }, [id]);

  const patchControls = (controls: ControlDef[]) =>
    setTemplate((t) => (t ? { ...t, metadata: { ...t.metadata, controls } } : t));

  const patchVps = (variableParagraphs: VariableParagraphDef[]) =>
    setTemplate((t) => (t ? { ...t, metadata: { ...t.metadata, variableParagraphs } } : t));

  const save = async () => {
    if (!template) return;
    const buf = await editorRef.current?.save();
    if (!buf) { message.error('无文档'); return; }
    await updateTemplate(template.id, { ...template, docx: buf });
    message.success('已保存');
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Space style={{ padding: 8 }}>
        <input
          type="file"
          accept=".docx"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) setDocx(await f.arrayBuffer());
          }}
        />
        <ControlInserter
          onInsertControl={(type, cid) => {
            const c: ControlDef = { id: cid, type, name: ({ text: '文本', date: '日期', select: '下拉', amount: '金额' } as Record<ControlType, string>)[type] };
            patchControls([...(template?.metadata.controls ?? []), c]);
          }}
          onInsertVariableParagraph={(vid, scenarios) => {
            const vp: VariableParagraphDef = { id: vid, name: '可变段落', scenarios };
            patchVps([...(template?.metadata.variableParagraphs ?? []), vp]);
          }}
        />
        <Button type="primary" onClick={save}>保存模板</Button>
        <Button onClick={() => nav('/')}>返回</Button>
      </Space>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {docx && <BondEditor ref={editorRef} document={docx} mode="edit" />}
        </div>
        <div style={{ width: 320, borderLeft: '1px solid #eee', overflow: 'auto' }}>
          <div style={{ padding: 16 }}>
            <div>控件列表</div>
            {(template?.metadata.controls ?? []).map((c) => (
              <a key={c.id} style={{ display: 'block' }} onClick={() => setSelected(c)}>{c.name}</a>
            ))}
          </div>
          <ControlInspector
            control={selected}
            onChange={(c) => patchControls((template?.metadata.controls ?? []).map((x) => (x.id === c.id ? c : x)))}
            onDelete={(cid) => patchControls((template?.metadata.controls ?? []).filter((x) => x.id !== cid))}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 运行验证**

Run: `pnpm -C apps/demo dev`
Expected: 可导入 docx、插入控件/可变段落标记、编辑属性、保存到 MSW。

---

### Task 11: 内容生成页（左列表高亮 + 右取值 + 导出）

**Files:**
- Create: `apps/demo/src/pages/ContentGen.tsx`
- Create: `apps/demo/src/editor/ControlHighlighter.tsx`

**Interfaces:**
- Consumes: `BondEditor`、`getTemplate`/`generate`、`exportDocument`、`useAppStore`
- Produces: 内容生成页：加载模板 → 请求场景 → 左列表 → 右取值面板（校验）→ 导出下载

- [ ] **Step 1: 实现 ControlHighlighter.tsx（占位：高亮逻辑按 SPIKE 能力实现）**

```tsx
import { useEffect } from 'react';
import { useDocxEditor } from '@docx-editor.dev/react';

export function ControlHighlighter({ activeUuid }: { activeUuid: string | null }) {
  const editor = useDocxEditor();
  useEffect(() => {
    // 按 SPIKE.md 验证的定位/滚动能力实现：定位到 activeUuid 对应标记并高亮。
    // 若无现成 API，则此函数体留空（高亮为增强项，不影响功能正确性）。
    void editor; void activeUuid;
  }, [editor, activeUuid]);
  return null;
}
```

- [ ] **Step 2: 实现 ContentGen.tsx**

```tsx
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Space, message, List, Typography } from 'antd';
import { BondEditor, BondEditorRef, getTemplate as _g } from '@bond-doc/core';
import { getTemplate, generate } from '../api/client';
import { useAppStore } from '../store';
import { Template, ControlDef } from '@bond-doc/core';
import { ValueInput } from './ValueInput';

export function ContentGen() {
  const { id } = useParams();
  const nav = useNavigate();
  const editorRef = useRef<BondEditorRef>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const { scenarioMap, setScenarioMap, values, setValue } = useAppStore();

  useEffect(() => {
    if (!id) return;
    void getTemplate(id).then(async (t) => {
      setTemplate(t);
      const r = await generate(id, { params: { bondCount: 2 } });
      setScenarioMap(r.scenarioMap);
    });
  }, [id]);

  const exportDoc = async () => {
    if (!template || !editorRef.current) return;
    try {
      const adapter = (editorRef.current as any).getAdapter?.() as import('@bond-doc/core').IDocumentAdapter | undefined;
      if (!adapter) { message.error('引擎适配器不可用'); return; }
      const buffer = await import('@bond-doc/core').then((m) =>
        m.exportDocument(adapter, template.metadata, values, scenarioMap));
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      if (e?.errors) message.error(e.errors.map((x: any) => `${x.name}:${x.message}`).join('；'));
      else message.error(String(e));
    }
  };

  if (!template) return <div style={{ padding: 24 }}>加载中…</div>;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Space style={{ padding: 8 }}>
        <Button type="primary" onClick={exportDoc}>导出 Word</Button>
        <Button onClick={() => nav('/')}>返回</Button>
      </Space>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div style={{ width: 280, borderRight: '1px solid #eee', overflow: 'auto' }}>
          <List
            size="small"
            header={<div>自定义项</div>}
            dataSource={template.metadata.controls}
            renderItem={(c) => (
              <List.Item onClick={() => setActive(c.id)} style={{ cursor: 'pointer', background: active === c.id ? '#e6f4ff' : undefined }}>
                <div>
                  <Typography.Text>{c.name}</Typography.Text>
                  <Typography.Text type="secondary"> ({c.type})</Typography.Text>
                </div>
              </List.Item>
            )}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {template.docx && <BondEditor ref={editorRef} document={template.docx} mode="view" />}
        </div>
        <div style={{ width: 320, borderLeft: '1px solid #eee', overflow: 'auto' }}>
          <ValueInput control={template.metadata.controls.find((c) => c.id === active) ?? null} value={active ? values[active] : undefined} onChange={(v) => active && setValue(active, v)} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 实现 ValueInput.tsx（取值面板，按类型渲染 + 校验）**

```tsx
import { Form, Input, Select, DatePicker, InputNumber } from 'antd';
import { ControlDef } from '@bond-doc/core';

export function ValueInput({ control, value, onChange }: {
  control: ControlDef | null;
  value?: string;
  onChange: (v: string) => void;
}) {
  if (!control) return <div style={{ padding: 16 }}>未选中控件</div>;

  const common = { value, onChange: (v: unknown) => onChange(String(v ?? '')) };

  return (
    <div style={{ padding: 16 }}>
      <h4>{control.name}</h4>
      {control.type === 'text' && <Input {...common} maxLength={control.text?.maxLength} />}
      {control.type === 'date' && <DatePicker {...common} style={{ width: '100%' }} />}
      {control.type === 'select' && (
        <Select
          {...common}
          style={{ width: '100%' }}
          options={control.select?.options}
        />
      )}
      {control.type === 'amount' && <InputNumber {...common} style={{ width: '100%' }} />}
    </div>
  );
}
```

- [ ] **Step 4: 实现 BondEditor 的 getAdapter()（打通导出链路）**

修改 `packages/core/src/react/BondEditor.tsx`：在 `useImperativeHandle` 中增加 `getAdapter()`，返回基于内部编辑器实例实现的 `IDocumentAdapter`（复用 Task 7 的 `DocxDocumentAdapter`，构造时传入 editor 实例）。

- [ ] **Step 5: 运行验证**

Run: `pnpm -C apps/demo dev`
Expected: 打开模板 → 左侧列表 → 右侧填写 → 导出下载 docx，Word 中打开无标记、值已替换、非选中变体已删除。

---

### Task 12: 端到端 + 保真 POC + 收尾

**Files:**
- Create: `README.md`（项目说明、启动步骤）
- Create: `apps/demo/src/mocks/handlers.test.ts`（MSW 契约测试）

**Interfaces:**
- Consumes: 全部
- Produces: 可运行 demo、契约测试通过、保真结论记录

- [ ] **Step 1: 写 MSW 契约测试**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
import { listTemplates, createTemplate } from '../api/client';

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterAll(() => server.close());

describe('MSW 契约', () => {
  it('创建后能列出', async () => {
    const t = await createTemplate({ id: '', name: 'x', docx: new ArrayBuffer(0), metadata: { controls: [], variableParagraphs: [] }, createdAt: '', updatedAt: '' });
    const list = await listTemplates();
    expect(list.some((s) => s.id === t.id)).toBe(true);
  });
});
```

> 注：demo 的 vitest 需要 `environment: 'jsdom'` 且 client.ts 里 `fetch` 可用；在 `apps/demo/vite.config.ts` 的 `test` 段加 `environment: 'jsdom'`。

- [ ] **Step 2: 运行测试**

Run: `pnpm -C apps/demo test`
Expected: PASS

- [ ] **Step 3: 保真 POC 与 README**

准备一个真实债券模板 .docx，走完 导入→插入控件/可变段落→内容生成→导出 全流程，在 README 记录：保真表现、已知偏差、`packages/core/src/engine/SPIKE.md` 结论、启动与测试命令。

- [ ] **Step 4: 全量验证**

Run: `pnpm -C packages/core test`（Expected: 全绿）
Run: `pnpm -C packages/core build`（Expected: 无类型错误）
Run: `pnpm -C apps/demo build`（Expected: 构建成功）

---

## Self-Review 记录

- **Spec 覆盖**：高保真导入导出（Task 2/10/12）、控件插入+属性（Task 3/10）、可变段落+场景（Task 4/9/11）、模板 CRUD（Task 9）、内容生成+左列表+右面板+导出（Task 11）、MSW 契约（Task 9/12）、测试（各 Task 测试 + Task 12）、保真 POC（Task 12）。
- **占位符扫描**：唯一刻意留白是 Task 7/10/11 中依赖 `SPIKE.md` 的引擎操作——这是 Task 2 的显式交付物，不是占位；其余步骤均有完整代码。
- **类型一致性**：`IDocumentAdapter` 五方法在 Task 7 定义、Task 11 消费一致；`computeDeletions`/`computeReplacements`/`validateValues`/`exportDocument` 签名跨任务一致；`controlToken`/`vpStartToken`/`vpEndToken` 命名一致。
