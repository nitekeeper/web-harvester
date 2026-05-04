/** Thrown when a circular dependency is detected among plugins. */
export class CircularDependencyError extends Error {
  constructor(cycle: string[]) {
    super(`Circular dependency detected: ${cycle.join(' → ')}`);
    this.name = 'CircularDependencyError';
  }
}

/** A node in the dependency graph — the minimum shape needed for sorting. */
interface DepNode {
  readonly id: string;
  readonly dependencies: readonly string[];
}

/** Internal graph representation: in-degrees per node and adjacency from dep -> dependents. */
interface DepGraph {
  readonly inDegree: Map<string, number>;
  readonly adj: Map<string, string[]>;
}

/** Build the in-degree and adjacency maps for the given nodes. Throws on missing dependency. */
function buildGraph(nodes: readonly DepNode[]): DepGraph {
  const ids = new Set(nodes.map((n) => n.id));
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adj.set(node.id, []);
  }

  for (const node of nodes) {
    for (const dep of node.dependencies) {
      if (!ids.has(dep)) {
        throw new Error(`Plugin "${node.id}" has missing dependency "${dep}"`);
      }
      const dependents = adj.get(dep) ?? [];
      dependents.push(node.id);
      adj.set(dep, dependents);
      inDegree.set(node.id, (inDegree.get(node.id) ?? 0) + 1);
    }
  }

  return { inDegree, adj };
}

/** Run Kahn's algorithm against the prepared graph and return the visit order. */
function kahnSort(graph: DepGraph): string[] {
  const { inDegree, adj } = graph;
  const queue = [...inDegree.entries()].filter(([, v]) => v === 0).map(([k]) => k);
  const result: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift() as string;
    result.push(current);
    for (const dependent of adj.get(current) ?? []) {
      const newDegree = (inDegree.get(dependent) ?? 0) - 1;
      inDegree.set(dependent, newDegree);
      if (newDegree === 0) queue.push(dependent);
    }
  }

  return result;
}

/** Sorts plugin nodes by dependency order using Kahn's algorithm. */
export function topologicalSort(nodes: readonly DepNode[]): string[] {
  if (nodes.length === 0) return [];

  const graph = buildGraph(nodes);
  const result = kahnSort(graph);

  if (result.length < nodes.length) {
    const remaining = nodes.map((n) => n.id).filter((id) => !result.includes(id));
    throw new CircularDependencyError(remaining);
  }

  return result;
}
