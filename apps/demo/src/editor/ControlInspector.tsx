import { Form, Input, Select, InputNumber, Switch, Button, Space } from 'antd';
import type { ControlDef } from '@bond-doc/core';

function optionsToLabels(options?: { label: string; value: string }[]): string[] {
  return (options ?? []).map((o) => o.label);
}

function labelsToOptions(labels: string[]): { label: string; value: string }[] {
  return labels.filter((l) => l.trim() !== '').map((label) => ({ label, value: label }));
}

export function ControlInspector({ control, onChange, onDelete }: {
  control: ControlDef | null;
  onChange: (c: ControlDef) => void;
  onDelete: (id: string) => void;
}) {
  if (!control) return <div style={{ padding: 16 }}>未选中控件</div>;

  const initialValues: Record<string, unknown> = {
    ...control,
    ...(control.type === 'select' ? { optionLabels: optionsToLabels(control.select?.options) } : {}),
  };

  return (
    <div style={{ padding: 16 }}>
      <Form
        key={control.id}
        layout="vertical"
        initialValues={initialValues}
        onValuesChange={(_, all) => {
          const { optionLabels, ...rest } = all as { optionLabels?: string[] } & Partial<ControlDef>;
          const next: ControlDef = { ...control, ...rest };
          if (control.type === 'select') {
            next.select = { ...(control.select ?? {}), options: labelsToOptions(optionLabels ?? []) };
          }
          onChange(next);
        }}
      >
        <Form.Item label="名称" name="name"><Input /></Form.Item>
        <Form.Item label="必填" name="required" valuePropName="checked"><Switch /></Form.Item>
        {control.type === 'text' && (
          <>
            <Form.Item label="默认值" name={['text', 'defaultValue']}><Input /></Form.Item>
            <Form.Item label="最大长度" name={['text', 'maxLength']}><InputNumber /></Form.Item>
          </>
        )}
        {control.type === 'date' && (
          <>
            <Form.Item label="最小日期" name={['date', 'min']}><Input /></Form.Item>
            <Form.Item label="最大日期" name={['date', 'max']}><Input /></Form.Item>
          </>
        )}
        {control.type === 'select' && (
          <Form.Item label="选项" name="optionLabels">
            <Select mode="tags" tokenSeparators={[',']} open={false} placeholder="输入后回车添加选项" />
          </Form.Item>
        )}
        {control.type === 'amount' && (
          <>
            <Form.Item label="最小值" name={['amount', 'min']}><InputNumber /></Form.Item>
            <Form.Item label="最大值" name={['amount', 'max']}><InputNumber /></Form.Item>
          </>
        )}
      </Form>
      <Space>
        <Button danger onClick={() => onDelete(control.id)}>删除控件</Button>
      </Space>
    </div>
  );
}
