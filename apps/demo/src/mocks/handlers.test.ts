import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
import { listTemplates, createTemplate } from '../api/client';

// Node 环境没有全局 location，MSW 的 fetch 拦截器需要它来解析相对 URL（如 /api/templates）。
Object.defineProperty(globalThis, 'location', {
  value: new URL('http://localhost:5173'),
  writable: true,
});

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterAll(() => server.close());

describe('MSW 契约', () => {
  it('创建后能列出', async () => {
    const t = await createTemplate({
      id: '', name: 'x', docx: new ArrayBuffer(0),
      metadata: { controls: [], variableParagraphs: [] },
      createdAt: '', updatedAt: '',
    });
    const list = await listTemplates();
    expect(list.some((s) => s.id === t.id)).toBe(true);
  });
});
