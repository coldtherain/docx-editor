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

export function validateTemplateMetadata(metadata: TemplateMetadata, blocks: Blocks): string[] {
  const issues: string[] = [];
  const declared = new Set(metadata.controls.map((c) => c.id));
  const inDoc = new Set<string>();
  for (const b of blocks) for (const u of controlTokensIn(b.text)) inDoc.add(u);
  for (const id of inDoc) if (!declared.has(id)) issues.push(`文档中的控件标记 {{c:${id}}} 未在元数据中声明`);
  for (const id of declared) if (!inDoc.has(id)) issues.push(`元数据中的控件「${id}」在文档中缺少标记`);
  return issues;
}
