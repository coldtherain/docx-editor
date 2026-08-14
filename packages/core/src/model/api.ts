export interface TemplateSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateRequest {
  params: Record<string, unknown>;
}

export interface GenerateResponse {
  scenarioMap: Record<string, string>;
}

export const ENDPOINTS = {
  templates: '/api/templates',
  template: (id: string) => `/api/templates/${id}`,
  generate: (id: string) => `/api/templates/${id}/generate`,
} as const;
