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
    expect(del).toEqual([1, 2, 3, 4, 6]);
  });

  it('computeDeletions 未给场景时删除非首变体', () => {
    expect(computeDeletions(blocks, {})).toEqual([1, 3, 4, 5, 6]);
  });

  it('computeReplacements 返回标记->值映射', () => {
    expect(computeReplacements(blocks, { amt: '99' })).toEqual([{ token: '{{c:amt}}', value: '99' }]);
  });
});
