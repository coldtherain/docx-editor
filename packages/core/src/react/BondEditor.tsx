import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { CSSProperties, MutableRefObject } from 'react';
import { DocxEditor, useDocxEditor } from '@docx-editor.dev/react';
import type { DocxEditorInstance } from '@docx-editor.dev/core/editor';
import '@docx-editor.dev/core/styles/editor.css';
import type { IDocumentAdapter } from '../engine/adapter';
import { DocxDocumentAdapter } from '../engine/DocxDocumentAdapter';

export interface BondEditorRef {
  save(): Promise<ArrayBuffer | null>;
  focus(): void;
  getAdapter(): IDocumentAdapter | null;
}

export interface BondEditorProps {
  document?: Uint8Array | ArrayBuffer;
  mode?: 'edit' | 'view';
  onSave?: () => void;
  style?: CSSProperties;
}

function InstanceCapture({ instanceRef }: { instanceRef: MutableRefObject<DocxEditorInstance | null> }) {
  const editor = useDocxEditor();
  useEffect(() => {
    instanceRef.current = editor;
  }, [editor, instanceRef]);
  return null;
}

export const BondEditor = forwardRef<BondEditorRef, BondEditorProps>(
  function BondEditor({ document, mode = 'edit', onSave, style }, ref) {
    const instanceRef = useRef<DocxEditorInstance | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        save: () => instanceRef.current?.save() ?? Promise.resolve(null),
        focus: () => {
          instanceRef.current?.focus();
        },
        getAdapter: () =>
          instanceRef.current ? new DocxDocumentAdapter(instanceRef.current) : null,
      }),
      [],
    );

    return (
      <div style={{ height: '100%', minHeight: 0, ...style }}>
        <DocxEditor.Root document={document} mode={mode}>
          <InstanceCapture instanceRef={instanceRef} />
          <DocxEditor.Toolbar onSave={onSave} />
          <DocxEditor.Viewport>
            <DocxEditor.Content />
          </DocxEditor.Viewport>
        </DocxEditor.Root>
      </div>
    );
  },
);
