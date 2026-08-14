import { Block } from '../model/model';

export interface IDocumentAdapter {
  getBlocks(): Block[];
  insertTextAtCursor(text: string): void;
  replaceToken(token: string, value: string): void;
  deleteBlockIndices(indices: number[]): void;
  save(): Promise<ArrayBuffer | null>;
  dispose?(): void;
}
