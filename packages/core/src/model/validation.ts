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
