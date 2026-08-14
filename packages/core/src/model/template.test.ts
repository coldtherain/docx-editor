import { describe, it, expect } from 'vitest';
import { templateToJSON, templateFromJSON, validateTemplateMetadata } from './template';
import { Template, Blocks } from './model';

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
    const blocksBad: Blocks = [{ text: 'x {{c:a}} {{c:missing}}' }];
    expect(validateTemplateMetadata(metadata, blocksOk)).toEqual([]);
    expect(validateTemplateMetadata(metadata, blocksBad).length).toBe(1);
  });
});
