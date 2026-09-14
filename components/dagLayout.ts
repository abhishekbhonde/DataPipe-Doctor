interface LayoutInput {
  id: string;
  dependsOn: string[];
}

const COL_GAP = 220;
const ROW_GAP = 70;

export function computeDagLayout(nodes: LayoutInput[]) {
  const idSet = new Set(nodes.map((n) => n.id));
  const depthCache = new Map<string, number>();
  const byId = new Map(nodes.map((n) => [n.id, n]));

  function depthOf(id: string, visiting = new Set<string>()): number {
    if (depthCache.has(id)) return depthCache.get(id)!;
    if (visiting.has(id)) return 0; // guard against unexpected cycles
    visiting.add(id);
    const node = byId.get(id);
    const parents = (node?.dependsOn ?? []).filter((p) => idSet.has(p));
    const depth = parents.length === 0 ? 0 : 1 + Math.max(...parents.map((p) => depthOf(p, visiting)));
    depthCache.set(id, depth);
    return depth;
  }

  const columns = new Map<number, string[]>();
  for (const n of nodes) {
    const d = depthOf(n.id);
    columns.set(d, [...(columns.get(d) ?? []), n.id]);
  }

  const positions = new Map<string, { x: number; y: number }>();
  for (const [depth, ids] of columns) {
    ids.sort();
    ids.forEach((id, i) => {
      positions.set(id, { x: depth * COL_GAP, y: i * ROW_GAP });
    });
  }
  return positions;
}
