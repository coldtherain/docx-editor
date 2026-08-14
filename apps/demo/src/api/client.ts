import { Template, TemplateSummary, GenerateRequest, GenerateResponse, ENDPOINTS, templateToJSON, templateFromJSON } from '@bond-doc/core';

const j = (r: Response) => { if (!r.ok) throw new Error(`${r.status}`); return r; };

export async function listTemplates(): Promise<TemplateSummary[]> {
  return (await j(await fetch(ENDPOINTS.templates))).json();
}
export async function createTemplate(t: Template): Promise<Template> {
  const res = await j(await fetch(ENDPOINTS.templates, { method: 'POST', body: templateToJSON(t) }));
  return templateFromJSON(await res.text());
}
export async function getTemplate(id: string): Promise<Template> {
  const res = await j(await fetch(ENDPOINTS.template(id)));
  return templateFromJSON(await res.text());
}
export async function updateTemplate(id: string, t: Template): Promise<Template> {
  const res = await j(await fetch(ENDPOINTS.template(id), { method: 'PUT', body: templateToJSON(t) }));
  return templateFromJSON(await res.text());
}
export async function deleteTemplate(id: string): Promise<void> {
  await j(await fetch(ENDPOINTS.template(id), { method: 'DELETE' }));
}
export async function generate(id: string, params: GenerateRequest): Promise<GenerateResponse> {
  return (await j(await fetch(ENDPOINTS.generate(id), { method: 'POST', body: JSON.stringify(params) }))).json();
}
