import { IDocumentAdapter } from './adapter';
import { TemplateMetadata } from '../model/model';
import { computeDeletions, computeReplacements } from '../model/scenario';
import { validateValues, ValidationError } from '../model/validation';

export class ExportValidationError extends Error {
  constructor(public readonly errors: ValidationError[]) {
    super('校验未通过');
  }
}

export async function exportDocument(
  adapter: IDocumentAdapter,
  metadata: TemplateMetadata,
  values: Record<string, string>,
  scenarioMap: Record<string, string>,
): Promise<ArrayBuffer> {
  const errs = validateValues(metadata.controls, values);
  if (errs.length) throw new ExportValidationError(errs);

  const blocks = adapter.getBlocks();
  const deletions = computeDeletions(blocks, scenarioMap);
  const replacements = computeReplacements(blocks, values);

  if (deletions.length) adapter.deleteBlockIndices(deletions);
  for (const r of replacements) adapter.replaceToken(r.token, r.value);

  const buffer = await adapter.save();
  if (!buffer) throw new Error('导出失败：无文档');
  return buffer;
}
