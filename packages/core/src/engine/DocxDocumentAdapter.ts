import { createBrowserAutomationHost, DocxEditorInstance } from '@docx-editor.dev/core/editor';
import {
  AutomationBatchResponse,
  AutomationHandle,
  AutomationHost,
  AutomationOperation,
  AutomationSpan,
  AutomationValue,
} from '@docx-editor.dev/core/automation';
import { IDocumentAdapter } from './adapter';
import { Block } from '../model/model';

function expectValue(response: AutomationBatchResponse, index: number): AutomationValue {
  const result = response.results[index];
  if (!result) throw new Error('自动化批处理缺少结果');
  if (result.status !== 'ok') {
    const reason = result.status === 'error' ? result.error.code : result.status;
    throw new Error(`自动化操作未成功: ${reason}`);
  }
  return result.value;
}

export class DocxDocumentAdapter implements IDocumentAdapter {
  private readonly editor: DocxEditorInstance;
  private readonly host: AutomationHost;

  constructor(editor: DocxEditorInstance) {
    this.editor = editor;
    this.host = createBrowserAutomationHost(editor);
  }

  getBlocks(): Block[] {
    const documentHandle = this.handle(this.run({ op: 'getDocument' }));
    const bodyHandle = this.handle(this.run({ op: 'getBody', document: documentHandle }));
    const paragraphs = this.handles(this.run({ op: 'getParagraphs', body: bodyHandle }));
    if (paragraphs.length === 0) return [];
    const response = this.host.execute({
      operations: paragraphs.map((paragraph) => ({ op: 'getText', target: paragraph })),
    });
    return response.results.map((_result, index) => ({ text: this.text(expectValue(response, index)) }));
  }

  insertTextAtCursor(text: string): void {
    this.editor.exec({ type: 'insertText', text });
  }

  replaceToken(token: string, value: string): void {
    const documentHandle = this.handle(this.run({ op: 'getDocument' }));
    const bodyHandle = this.handle(this.run({ op: 'getBody', document: documentHandle }));
    const spans = this.spans(this.run({ op: 'search', scope: { body: bodyHandle }, text: token }));
    if (spans.length === 0) return;
    this.run({ op: 'replaceSpan', span: spans[0], text: value });
  }

  deleteBlockIndices(indices: number[]): void {
    if (indices.length === 0) return;
    const documentHandle = this.handle(this.run({ op: 'getDocument' }));
    const bodyHandle = this.handle(this.run({ op: 'getBody', document: documentHandle }));
    const paragraphs = this.handles(this.run({ op: 'getParagraphs', body: bodyHandle }));
    const ordered = [...new Set(indices)]
      .filter((index) => index >= 0 && index < paragraphs.length)
      .sort((a, b) => b - a);
    if (ordered.length === 0) return;
    this.host.execute({
      operations: ordered.map((index) => ({ op: 'deleteParagraph', paragraph: paragraphs[index] })),
    });
  }

  save(): Promise<ArrayBuffer | null> {
    return this.editor.save();
  }

  private run(operation: AutomationOperation): AutomationValue {
    return expectValue(this.host.execute({ operations: [operation] }), 0);
  }

  private handle(value: AutomationValue): AutomationHandle {
    if (value.kind !== 'handle') throw new Error('期望 handle 类型的自动化结果');
    return value.handle;
  }

  private handles(value: AutomationValue): readonly AutomationHandle[] {
    if (value.kind !== 'handles') throw new Error('期望 handles 类型的自动化结果');
    return value.handles;
  }

  private text(value: AutomationValue): string {
    if (value.kind !== 'text') throw new Error('期望 text 类型的自动化结果');
    return value.text;
  }

  private spans(value: AutomationValue): readonly AutomationSpan[] {
    if (value.kind !== 'spans') throw new Error('期望 spans 类型的自动化结果');
    return value.spans;
  }
}
