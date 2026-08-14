import { useRef, useState } from 'react';
import { DocxEditor, type DocxEditorRef } from '@docx-editor.dev/react';
import { useDocxEditor } from '@docx-editor.dev/react';

export function Spike() {
  const ref = useRef<DocxEditorRef>(null);
  const [bytes, setBytes] = useState<Uint8Array>();
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 8, display: 'flex', gap: 8 }}>
        <input type="file" accept=".docx"
          onChange={async (e) => { const f = e.target.files?.[0]; if (f) setBytes(new Uint8Array(await f.arrayBuffer())); }} />
        <button onClick={() => void ref.current?.save()}>Save(验证导出)</button>
        <Probe />
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        {bytes && <DocxEditor ref={ref} document={bytes} mode="edit" />}
      </div>
    </div>
  );
}

function Probe() {
  const editor = useDocxEditor();
  return (
    <>
      <button onClick={() => console.log('exec insertText:', editor?.exec({ type: 'insertText', text: '{{c:test}}' } as never))}>A: 光标插入文本</button>
      <button onClick={() => console.log('snapshot:', editor?.snapshot())}>B: 读取快照</button>
    </>
  );
}
