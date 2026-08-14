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
