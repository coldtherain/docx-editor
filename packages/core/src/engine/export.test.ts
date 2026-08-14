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
