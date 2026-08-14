import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Space, message } from 'antd';
import { BondEditor, BondEditorRef, ControlDef, ControlType, Template, VariableParagraphDef } from '@bond-doc/core';
import { getTemplate, updateTemplate } from '../api/client';
import { ControlInserter } from '../editor/ControlInserter';
import { ControlInspector } from '../editor/ControlInspector';

const TYPE_LABEL: Record<ControlType, string> = { text: '文本', date: '日期', select: '下拉', amount: '金额' };

export function TemplateEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const editorRef = useRef<BondEditorRef>(null);
  const [docx, setDocx] = useState<ArrayBuffer>();
  const [template, setTemplate] = useState<Template | null>(null);
  const [selected, setSelected] = useState<ControlDef | null>(null);

  useEffect(() => {
    if (!id) return;
    void getTemplate(id).then((t) => { setTemplate(t); setDocx(t.docx); });
  }, [id]);

  const patchControls = (controls: ControlDef[]) =>
    setTemplate((t) => (t ? { ...t, metadata: { ...t.metadata, controls } } : t));

  const patchVps = (variableParagraphs: VariableParagraphDef[]) =>
    setTemplate((t) => (t ? { ...t, metadata: { ...t.metadata, variableParagraphs } } : t));

  const save = async () => {
    if (!template) return;
    const buf = await editorRef.current?.save();
    if (!buf) { message.error('无文档'); return; }
    await updateTemplate(template.id, { ...template, docx: buf });
    message.success('已保存');
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Space style={{ padding: 8 }}>
        <input
          type="file"
          accept=".docx"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) setDocx(await f.arrayBuffer());
          }}
        />
        <ControlInserter
          insertText={(text) => editorRef.current?.getAdapter()?.insertTextAtCursor(text)}
          onInsertControl={(type, cid) => {
            const c: ControlDef = { id: cid, type, name: TYPE_LABEL[type] };
            patchControls([...(template?.metadata.controls ?? []), c]);
          }}
          onInsertVariableParagraph={(vid, scenarios) => {
            const vp: VariableParagraphDef = { id: vid, name: '可变段落', scenarios };
            patchVps([...(template?.metadata.variableParagraphs ?? []), vp]);
          }}
        />
        <Button type="primary" onClick={save}>保存模板</Button>
        <Button onClick={() => nav('/')}>返回</Button>
      </Space>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {docx && <BondEditor ref={editorRef} document={docx} mode="edit" />}
        </div>
        <div style={{ width: 320, borderLeft: '1px solid #eee', overflow: 'auto' }}>
          <div style={{ padding: 16 }}>
            <div>控件列表</div>
            {(template?.metadata.controls ?? []).map((c) => (
              <a key={c.id} style={{ display: 'block' }} onClick={() => setSelected(c)}>{c.name}</a>
            ))}
          </div>
          <ControlInspector
            control={selected}
            onChange={(c) => patchControls((template?.metadata.controls ?? []).map((x) => (x.id === c.id ? c : x)))}
            onDelete={(cid) => patchControls((template?.metadata.controls ?? []).filter((x) => x.id !== cid))}
          />
        </div>
      </div>
    </div>
  );
}
