export const CORE_VERSION = '0.0.0';

export * from './model/model';
export * from './model/tokens';
export * from './model/scenario';
export * from './model/validation';
export * from './model/template';
export * from './model/api';

export * from './engine/adapter';
export * from './engine/export';
export { DocxDocumentAdapter } from './engine/DocxDocumentAdapter';
export { BondEditor } from './react/BondEditor';
export type { BondEditorRef, BondEditorProps } from './react/BondEditor';
