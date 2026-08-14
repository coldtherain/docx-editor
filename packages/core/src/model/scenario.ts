import { Block, Blocks } from './model';
import { isVpStartBlock, isVpEndBlock, controlTokensIn, controlToken, replaceControlTokens } from './tokens';

function collectScenarios(blocks: Blocks): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const b of blocks) {
    const start = isVpStartBlock(b.text);
    if (!start) continue;
    let set = map.get(start.uuid);
    if (!set) {
      set = new Set<string>();
      map.set(start.uuid, set);
    }
    set.add(start.scenario);
  }
  return map;
}

export function applyScenario(blocks: Blocks, scenarioMap: Record<string, string>): Blocks {
  const scenariosByUuid = collectScenarios(blocks);
  const out: Blocks = [];
  const seen = new Set<string>();
  let i = 0;
  while (i < blocks.length) {
    const start = isVpStartBlock(blocks[i].text);
    if (!start) {
      out.push(blocks[i]);
      i++;
      continue;
    }
    const { uuid, scenario } = start;
    const chosen = scenarioMap[uuid];
    const valid = scenariosByUuid.get(uuid);
    const validChosen = chosen !== undefined && (valid?.has(chosen) ?? false);
    let j = i + 1;
    const content: Blocks = [];
    while (j < blocks.length) {
      const end = isVpEndBlock(blocks[j].text);
      if (end && end.uuid === uuid) break;
      content.push(blocks[j]);
      j++;
    }
    const keep = validChosen ? scenario === chosen : !seen.has(uuid);
    if (keep) out.push(...content);
    seen.add(uuid);
    i = j + 1;
  }
  return out;
}

export function fillControls(blocks: Blocks, valueByUuid: Record<string, string>): Blocks {
  return blocks.map((b) => ({ text: replaceControlTokens(b.text, valueByUuid) }));
}

export function computeDeletions(blocks: Blocks, scenarioMap: Record<string, string>): number[] {
  const scenariosByUuid = collectScenarios(blocks);
  const del: number[] = [];
  const seen = new Set<string>();
  let i = 0;
  while (i < blocks.length) {
    const start = isVpStartBlock(blocks[i].text);
    if (!start) {
      i++;
      continue;
    }
    const { uuid, scenario } = start;
    const chosen = scenarioMap[uuid];
    const valid = scenariosByUuid.get(uuid);
    const validChosen = chosen !== undefined && (valid?.has(chosen) ?? false);
    const keep = validChosen ? scenario === chosen : !seen.has(uuid);
    del.push(i);
    let j = i + 1;
    while (j < blocks.length) {
      const end = isVpEndBlock(blocks[j].text);
      if (end && end.uuid === uuid) {
        del.push(j);
        break;
      }
      if (!keep) del.push(j);
      j++;
    }
    seen.add(uuid);
    i = j + 1;
  }
  return del;
}

export function computeReplacements(blocks: Blocks, valueByUuid: Record<string, string>): { token: string; value: string }[] {
  const out: { token: string; value: string }[] = [];
  for (const b of blocks) {
    for (const uuid of controlTokensIn(b.text)) {
      if (uuid in valueByUuid) out.push({ token: controlToken(uuid), value: valueByUuid[uuid] });
    }
  }
  return out;
}
