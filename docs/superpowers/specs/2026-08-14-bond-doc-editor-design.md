# 债券文档智能编辑器（Bond Doc Editor）设计

日期：2026-08-14
状态：待评审（已按"占位标记"路线修订）

## 1. 背景与目标

金融行业（债券发行）需要一个 Web 端富文本编辑器，核心场景是：

1. 高保真导入导出 Word（金融文档对保真要求极高）
2. 在 Word 文档中可视化插入自定义控件（输入框、日期、下拉、金额），控件带属性（名称、输入限制、默认值等）
3. 插入"可变段落"：同一段落因场景（A/B/C，由后端按债券返回）显示不同内容
4. 文档可保存为模板
5. 模板进入"内容生成"：左侧预览高亮自定义项，点击后右侧面板读取/编辑属性与真实值

约束：尽量免费开源、支持二开；后端本项目不实现，只做前端 + mock。

## 2. 核心决策

| 决策点 | 结论 | 理由 |
|---|---|---|
| 编辑器引擎 | docx-editor.dev（EigenPal，Apache 2.0 免费核心） | 无损 OOXML 往返保真最强 |
| 控件承载机制 | **占位标记文本**（`{{c:<uuid>}}`），非 Word 内容控件 | 免费版无"插入内容控件"能力；且控件不导出、只存后端，无需真内容控件 |
| 可变段落 | **标记包裹的条件块**（`{{vp:<uuid>:<场景>}}` … `{{/vp:<uuid>}}`） | 生成时按场景保留选中块、删除其余 |
| 控件是否导出 | 不导出；导出前用填好的值替换标记，输出纯净 docx | 符合业务要求"控件只存在后端，填完才导出" |
| Demo 框架 | React + TypeScript + Vite + AntD | docx-editor.dev 原生 React；AntD 适合表单面板与 CRUD |
| Mock 后端 | MSW（浏览器内拦截） | 无需起服务，Monorepo 干净，场景返回用 handler 模拟 |
| Monorepo | pnpm workspaces + turborepo | 包间依赖清晰，构建/测试可编排 |
| 微前端 | 本次不实现。demo 按"独立自包含、可独立部署"的 React 应用结构编写 | 未来可接 wujie 或封装自研适配器 |

> 关键约束发现：docx-editor.dev 免费版（含 Pro editor-api）均**无法在编辑器内插入内容控件**，只能填充 Word 中已存在的内容控件；Pro 的 custom nodes 可创建控件但仅内联、且付费。因此控件改用占位标记 + 后端元数据。

## 3. 架构与 Monorepo 结构

```
富文本编辑器-react/
├── pnpm-workspace.yaml
├── package.json                # workspace 根，turbo 编排
├── docs/superpowers/specs/     # 本设计文档
├── packages/
│   └── core/                   # 核心包（可复用）
│       ├── src/
│       │   ├── model/          # 纯模型层（0 依赖）
│       │   │   ├── model.ts    # 数据模型 + 类型
│       │   │   ├── tokens.ts   # 标记语法：{{c:<uuid>}} / {{vp:...}} 解析
│       │   │   ├── validation.ts # 控件属性校验（纯函数）
│       │   │   ├── scenario.ts # 场景映射 + 变体块选择（纯函数）
│       │   │   ├── template.ts # 模板序列化：docx buffer + 元数据 JSON
│       │   │   └── api.ts      # 后端契约（TS 接口 + mock 数据类型）
│       │   ├── engine/         # 引擎层（依赖 @docx-editor.dev/core，无 React）
│       │   │   ├── document.ts # 编辑器文档块 <-> 纯文本块 的读写桥
│       │   │   └── export.ts   # 标记替换 + 场景应用 + 导出 docx
│       │   └── react/          # 组件层（依赖 React + @docx-editor.dev/react）
│       │       └── BondEditor.tsx
│       └── package.json
└── apps/
    └── demo/                   # React + TS + Vite + AntD + MSW
        ├── src/
        │   ├── main.tsx
        │   ├── App.tsx         # 路由：模板列表 / 模板编辑 / 内容生成
        │   ├── pages/
        │   │   ├── TemplateList.tsx
        │   │   ├── TemplateEditor.tsx
        │   │   └── ContentGen.tsx
        │   ├── editor/
        │   │   ├── ControlInserter.tsx    # 插入控件/可变段落（使用 core/react BondEditor）
        │   │   ├── ControlHighlighter.tsx # 按标记高亮/定位
        │   │   └── ControlInspector.tsx   # 右侧属性/取值面板
        │   ├── api/client.ts    # 前端 API 调用层
        │   ├── mocks/handlers.ts # MSW
        │   └── store.ts         # 轻量状态（模板、场景映射、控件元数据）
        └── package.json
```

### 核心包分层（关键原则）

`packages/core` 内部按依赖方向分层，保证可复用性与可测试性：

- **model/ 纯模型层**：0 依赖。数据模型、标记解析、校验、场景逻辑、API 契约。
  操作对象是**纯文本块序列**（`Block = { text }`），可独立单元测试，可被 Node 脚本/其它引擎复用。
- **engine/ 引擎层**：依赖 `@docx-editor.dev/core`（框架无关，无 React）。
  负责把 docx-editor.dev 的文档与纯文本块序列互转、插入标记文本、替换/删除标记块、导出 docx。
- **react/ 组件层**：依赖 React + `@docx-editor.dev/react`。BondEditor 等组件。

> demo 与 core 解耦：demo 只 `import` core 的公开 API，不依赖 core 内部实现。
> 微前端化时，demo 整体作为独立 React 应用打包，框架隔离交给微前端方案。

## 4. 数据模型

### 标记语法（tokens.ts）

- 控件标记：`{{c:<uuid>}}`（内联于段落中）
- 可变段落开始：`{{vp:<uuid>:<场景>}}`（独立成段）
- 可变段落结束：`{{/vp:<uuid>}}`（独立成段）

`<uuid>` 为无前缀唯一标识；`<场景>` 为 `A`/`B`/`C` 等。标记在文档中带类型专属样式（按类型着色），便于视觉区分；该样式不进入最终导出。

### 控件（ControlDef）

```ts
type ControlType = 'text' | 'date' | 'select' | 'amount';

interface ControlDef {
  id: string;            // uuid，对应标记 {{c:<id>}}
  type: ControlType;
  name: string;          // 显示名，如"债权名称"、"付息日"
  required?: boolean;

  text?:   { placeholder?: string; defaultValue?: string; maxLength?: number };
  date?:   { defaultValue?: string; min?: string; max?: string; format?: string };
  select?: { options: { label: string; value: string }[]; defaultValue?: string };
  amount?: { min?: number; max?: number; defaultValue?: number };
}
```

### 可变段落（VariableParagraphDef）

```ts
interface VariableParagraphDef {
  id: string;              // uuid，对应标记 {{vp:<id>:<场景>}} / {{/vp:<id>}}
  name: string;            // 显示名，如"付息安排"
  scenarios: string[];     // 支持的场景，如 ['A','B','C']
}
```

### 模板（Template）

```ts
interface Template {
  id: string;
  name: string;
  docx: ArrayBuffer;   // 规范 OOXML（标记文本在其中）
  metadata: {
    controls: ControlDef[];
    variableParagraphs: VariableParagraphDef[];
  };
  createdAt: string;
  updatedAt: string;
}
```

### 块模型（engine 层与 model 层之间的桥梁）

```ts
interface Block { text: string }   // 一个段落
type Blocks = Block[]              // 文档按段落顺序的文本表示
```

model 层的标记解析、场景应用、填充替换都基于 `Blocks` 操作，与具体编辑器解耦。

## 5. 数据流

### 5.1 模板创建（TemplateEditor）

1. 导入 Word 文件（`ArrayBuffer`）→ BondEditor 加载，无损解析
2. 光标定位 → 工具栏插入控件（选择类型）→ 在光标处插入带样式标记 `{{c:<uuid>}}`，并写入 metadata（含类型、名称、属性）
3. 选中段落 → 插入可变段落 → 生成各场景标记块（`{{vp:<id>:A}} … {{/vp:<id>}}` 等），写入 metadata
4. 右侧属性面板编辑 ControlDef 属性（名称、默认值、输入限制、时间范围、选项等）
5. 保存 → `docx buffer + metadata JSON` → `POST /api/templates`

### 5.2 内容生成（ContentGen）

1. 从模板列表打开模板 → 加载 docx + metadata，编辑器只读（`mode="view"` 或隐藏编辑能力）
2. 调 `POST /api/templates/:id/generate`（mock 返回场景映射，模拟"债券支数→各段落场景"）
3. 左侧面板列出所有控件与可变段落；文档中对应标记按类型着色显示（高亮仅页面显示）
4. 点击左侧项 → 定位/滚动到该标记并高亮 → 右侧面板读取属性、编辑真实值（带校验）
5. 导出：校验必填 → engine 层读取 `Blocks` → 应用场景（删未选中变体块）→ 用值替换控件标记 → 输出纯净 docx 下载

## 6. 后端契约（MSW 实现）

```
GET    /api/templates            → TemplateSummary[]   模板列表
POST   /api/templates            → Template            创建（docx + metadata）
GET    /api/templates/:id        → Template            详情
PUT    /api/templates/:id        → Template            更新
DELETE /api/templates/:id        → void                删除
POST   /api/templates/:id/generate → GenerateResponse  场景计算
```

```ts
interface GenerateRequest  { params: Record<string, unknown> }  // 债券参数
interface GenerateResponse { scenarioMap: Record<string, string> } // vpUuid -> 场景
```

Mock 存储：内存/`localStorage`（demo 级别）。`generate` handler 根据请求参数模拟"两支债券 → vp1: A, vp2: B"等场景返回，便于演示可变段落。

## 7. 交互设计要点

- **高亮仅页面显示**：标记的着色/高亮是编辑器渲染层行为，不影响最终 docx 内容
- **左侧列表 ↔ 文档定位**：按 uuid 查找标记并滚动/高亮
- **右侧面板读写**：文本、日期、下拉、金额的真实值写入与校验；校验失败（超长/超范围/必填未填）面板内提示并阻止导出
- **可变段落呈现**：收到场景映射后，编辑器中非选中变体块置灰/弱化，选中变体正常显示；实际删除发生在导出时

## 8. 错误处理

- 导入失败（损坏/非 docx/不支持结构）：提示错误，不进入编辑器
- 校验失败：面板内报错，列出未填必填项，阻止导出
- 标记解析异常（标记不闭合/重复 uuid）：模板保存时校验 metadata 与标记一致性，提示
- 网络/Mock 失败：loading / error 状态 + 重试

## 9. 测试策略

- `packages/core`：Vitest 单元测试（标记解析、场景应用、属性校验、填充替换、序列化 round-trip、模板元数据完整性）
- `apps/demo`：MSW 契约测试（API 接口与 mock 一致）；关键组件（属性面板校验）可选测试
- 保真 POC：准备一个真实债券模板 docx，验证 导入→插入标记→导出 往返保真度

## 10. 已知限制与风险

| 风险 | 影响 | 应对 |
|---|---|---|
| docx-editor.dev 项目年轻（185 stars） | 长期稳定性/支持不确定 | demo 先行，保持跟进；核心包薄封装，便于换引擎 |
| **程序化插入文本/查找替换/删除块的确切 API 未在文档确认** | 标记插入与导出的引擎对接是关键路径 | 计划首任务做 spike 验证，锁定精确签名后再铺开 |
| 占位标记是普通文本，模板编辑时可能被误删 | 模板编辑期用户误删标记 | 标记带醒目样式；保存时校验 metadata 与标记一致性 |
| 可变段落无内置能力 | 需自研变体选择/删除逻辑 | 已设计为标记块方案，纯逻辑在 core 可测 |
| 修订/批注属 Pro 付费 | 本次不需要，后续按需评估 | 不在 v1 范围 |

## 11. 后续演进（不在本次范围）

- 微前端化（wujie）或封装自研适配器
- 真实后端对接（替换 MSW，按 api.ts 契约）
- Pro 能力评估：修订、批注、自定义节点
- 金额大写转换等金融专属校验增强
- 标记的人名友好显示（uuid 标记上叠加控件名渲染）
