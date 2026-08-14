import { http, HttpResponse } from 'msw';
import { Template, TemplateSummary, templateToJSON, templateFromJSON, ENDPOINTS } from '@bond-doc/core';

const store = new Map<string, Template>();
let seq = 0;

export const handlers = [
  http.get(ENDPOINTS.templates, () => {
    const list: TemplateSummary[] = [...store.values()].map((t) => ({
      id: t.id, name: t.name, createdAt: t.createdAt, updatedAt: t.updatedAt,
    }));
    return HttpResponse.json(list);
  }),
  http.post(ENDPOINTS.templates, async ({ request }) => {
    const t = templateFromJSON(await request.text());
    t.id = String(++seq);
    const now = new Date().toISOString();
    t.createdAt = now; t.updatedAt = now;
    store.set(t.id, t);
    return new HttpResponse(templateToJSON(t), { status: 201 });
  }),
  http.get(ENDPOINTS.template(':id'), ({ params }) => {
    const t = store.get(String(params.id));
    if (!t) return new HttpResponse(null, { status: 404 });
    return new HttpResponse(templateToJSON(t));
  }),
  http.put(ENDPOINTS.template(':id'), async ({ params, request }) => {
    const next = templateFromJSON(await request.text());
    next.id = String(params.id);
    next.updatedAt = new Date().toISOString();
    store.set(next.id, next);
    return new HttpResponse(templateToJSON(next));
  }),
  http.delete(ENDPOINTS.template(':id'), ({ params }) => {
    store.delete(String(params.id));
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(ENDPOINTS.generate(':id'), async ({ request, params }) => {
    const body = (await request.json()) as { params?: Record<string, unknown> };
    const count = typeof body.params?.bondCount === 'number' ? body.params.bondCount : 2;
    const t = store.get(String(params.id));
    const scenarioMap: Record<string, string> = {};
    if (t) {
      t.metadata.variableParagraphs.forEach((vp, idx) => {
        const scenarios = vp.scenarios;
        scenarioMap[vp.id] = count >= 2 && idx === 1 ? 'B' : scenarios[0] ?? 'A';
      });
    }
    return HttpResponse.json({ scenarioMap });
  }),
];
