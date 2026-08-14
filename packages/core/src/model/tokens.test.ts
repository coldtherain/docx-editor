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
