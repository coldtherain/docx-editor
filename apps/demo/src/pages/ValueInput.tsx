import { Input, Select, DatePicker, InputNumber } from 'antd';
import dayjs from 'dayjs';
import { ControlDef } from '@bond-doc/core';

export function ValueInput({ control, value, onChange }: {
  control: ControlDef | null;
  value?: string;
  onChange: (v: string) => void;
}) {
  if (!control) return <div style={{ padding: 16 }}>未选中控件</div>;

  return (
    <div style={{ padding: 16 }}>
      <h4>{control.name}</h4>
      {control.type === 'text' && (
        <Input value={value ?? ''} maxLength={control.text?.maxLength} onChange={(e) => onChange(e.target.value)} />
      )}
      {control.type === 'date' && (
        <DatePicker
          style={{ width: '100%' }}
          value={value ? dayjs(value) : null}
          onChange={(d) => onChange(d ? d.format('YYYY-MM-DD') : '')}
        />
      )}
      {control.type === 'select' && (
        <Select
          style={{ width: '100%' }}
          value={value ?? undefined}
          options={control.select?.options}
          onChange={(v) => onChange(String(v ?? ''))}
        />
      )}
      {control.type === 'amount' && (
        <InputNumber
          style={{ width: '100%' }}
          value={value !== undefined && value !== '' ? Number(value) : undefined}
          onChange={(v) => onChange(v === null || v === undefined ? '' : String(v))}
        />
      )}
    </div>
  );
}
