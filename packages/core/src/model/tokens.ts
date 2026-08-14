const CONTROL_RE = /\{\{c:([0-9a-zA-Z-]+)\}\}/g;
const VP_START_RE = /^\s*\{\{vp:([0-9a-zA-Z-]+):([A-Za-z0-9]+)\}\}\s*$/;
const VP_END_RE = /^\s*\{\{\/vp:([0-9a-zA-Z-]+)\}\}\s*$/;

export function controlToken(uuid: string): string {
  return `{{c:${uuid}}}`;
}
export function vpStartToken(uuid: string, scenario: string): string {
  return `{{vp:${uuid}:${scenario}}}`;
}
export function vpEndToken(uuid: string): string {
  return `{{/vp:${uuid}}}`;
}

export function isVpStartBlock(text: string): { uuid: string; scenario: string } | null {
  const m = text.match(VP_START_RE);
  return m ? { uuid: m[1], scenario: m[2] } : null;
}
export function isVpEndBlock(text: string): { uuid: string } | null {
  const m = text.match(VP_END_RE);
  return m ? { uuid: m[1] } : null;
}

export function controlTokensIn(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(CONTROL_RE)) out.push(m[1]);
  return out;
}

export function replaceControlTokens(text: string, valueByUuid: Record<string, string>): string {
  return text.replace(CONTROL_RE, (_all, uuid: string) => valueByUuid[uuid] ?? _all);
}
