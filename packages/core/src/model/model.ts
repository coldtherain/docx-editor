export type ControlType = 'text' | 'date' | 'select' | 'amount';

export interface ControlDef {
  id: string;
  type: ControlType;
  name: string;
  required?: boolean;
  text?: { placeholder?: string; defaultValue?: string; maxLength?: number };
  date?: { defaultValue?: string; min?: string; max?: string; format?: string };
  select?: { options: { label: string; value: string }[]; defaultValue?: string };
  amount?: { min?: number; max?: number; defaultValue?: number };
}

export interface VariableParagraphDef {
  id: string;
  name: string;
  scenarios: string[];
}

export interface TemplateMetadata {
  controls: ControlDef[];
  variableParagraphs: VariableParagraphDef[];
}

export interface Template {
  id: string;
  name: string;
  docx: ArrayBuffer;
  metadata: TemplateMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface Block {
  text: string;
}

export type Blocks = Block[];
