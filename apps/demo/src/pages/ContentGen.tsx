import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Space, message, List, Typography } from 'antd';
import { BondEditor, BondEditorRef, exportDocumentFromBytes, ExportValidationError, Template } from '@bond-doc/core';
import { getTemplate, generate } from '../api/client';
import { useAppStore } from '../store';
import { ValueInput } from './ValueInput';

export function ContentGen() {
  const { id } = useParams();
  const nav = useNavigate();
  const editorRef = useRef<BondEditorRef>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const { scenarioMap, setScenarioMap, values, setValue } = useAppStore();

  useEffect(() => {
    if (!id) return;
    void getTemplate(id).then(async (t) => {
      setTemplate(t);
      const r = await generate(id, { params: { bondCount: 2 } });
      setScenarioMap(r.scenarioMap);
    });
  }, [id]);

  const exportDoc = async () => {
    if (!template) return;
    try {
      const buffer = await exportDocumentFromBytes(template.docx, template.metadata, values, scenarioMap);
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      if (e instanceof ExportValidationError) {
        message.error(e.errors.map((x) => `${x.name}:${x.message}`).join('；'));
      } else {
        message.error(String(e));
      }
    }
  };

  if (!template) return <div style={{ padding: 24 }}>加载中…</div>;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Space style={{ padding: 8 }}>
        <Button type="primary" onClick={exportDoc}>导出 Word</Button>
        <Button onClick={() => nav('/')}>返回</Button>
        {template.metadata.variableParagraphs.map((vp) => (
          <Typography.Text key={vp.id} type="secondary">
            {vp.name}: {scenarioMap[vp.id] ?? '—'}
          </Typography.Text>
        ))}
      </Space>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div style={{ width: 280, borderRight: '1px solid #eee', overflow: 'auto' }}>
          <List
            size="small"
            header={<div>自定义项</div>}
            dataSource={template.metadata.controls}
            renderItem={(c) => (
              <List.Item
                onClick={() => setActive(c.id)}
                style={{ cursor: 'pointer', background: active === c.id ? '#e6f4ff' : undefined }}
              >
                <div>
                  <Typography.Text>{c.name}</Typography.Text>
                  <Typography.Text type="secondary"> ({c.type})</Typography.Text>
                </div>
              </List.Item>
            )}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {template.docx && <BondEditor ref={editorRef} document={template.docx} mode="view" />}
        </div>
        <div style={{ width: 320, borderLeft: '1px solid #eee', overflow: 'auto' }}>
          <ValueInput
            control={template.metadata.controls.find((c) => c.id === active) ?? null}
            value={active ? values[active] : undefined}
            onChange={(v) => active && setValue(active, v)}
          />
        </div>
      </div>
    </div>
  );
}
