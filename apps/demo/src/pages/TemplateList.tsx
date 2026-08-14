import { useEffect, useState } from 'react';
import { Button, Table, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { listTemplates, createTemplate, deleteTemplate } from '../api/client';
import { TemplateSummary } from '@bond-doc/core';

export function TemplateList() {
  const [rows, setRows] = useState<TemplateSummary[]>([]);
  const nav = useNavigate();

  const refresh = () => listTemplates().then(setRows);

  useEffect(() => { void refresh(); }, []);

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          onClick={async () => {
            const t = await createTemplate({
              id: '', name: '新模板',
              docx: new ArrayBuffer(0),
              metadata: { controls: [], variableParagraphs: [] },
              createdAt: '', updatedAt: '',
            });
            nav(`/templates/${t.id}/edit`);
          }}
        >
          新建模板
        </Button>
      </Space>
      <Table
        rowKey="id"
        dataSource={rows}
        columns={[
          { title: '名称', dataIndex: 'name' },
          { title: '更新时间', dataIndex: 'updatedAt' },
          {
            title: '操作',
            render: (_, r) => (
              <Space>
                <a onClick={() => nav(`/templates/${r.id}/edit`)}>编辑</a>
                <a onClick={() => nav(`/templates/${r.id}/generate`)}>内容生成</a>
                <a onClick={async () => { await deleteTemplate(r.id); void refresh(); }}>删除</a>
              </Space>
            ),
          },
        ]}
      />
    </div>
  );
}
