import { Button, Space, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { controlToken, vpStartToken, vpEndToken, ControlType } from '@bond-doc/core';

export interface InsertCallbacks {
  insertText(text: string): void;
  onInsertControl(type: ControlType, id: string): void;
  onInsertVariableParagraph(id: string, scenarios: string[]): void;
}

const TYPE_LABEL: Record<ControlType, string> = { text: '文本', date: '日期', select: '下拉', amount: '金额' };

export function ControlInserter({ insertText, onInsertControl, onInsertVariableParagraph }: InsertCallbacks) {
  const controlItems: MenuProps['items'] = (['text', 'date', 'select', 'amount'] as ControlType[]).map((t) => ({
    key: t,
    label: TYPE_LABEL[t],
  }));

  return (
    <Space>
      <Dropdown
        menu={{
          items: controlItems,
          onClick: ({ key }) => {
            const id = crypto.randomUUID();
            insertText(controlToken(id));
            onInsertControl(key as ControlType, id);
          },
        }}
      >
        <Button>插入控件</Button>
      </Dropdown>
      <Button
        onClick={() => {
          const id = crypto.randomUUID();
          insertText(`\n${vpStartToken(id, 'A')}\nA 内容\n${vpEndToken(id)}\n${vpStartToken(id, 'B')}\nB 内容\n${vpEndToken(id)}`);
          onInsertVariableParagraph(id, ['A', 'B']);
        }}
      >
        插入可变段落
      </Button>
    </Space>
  );
}
