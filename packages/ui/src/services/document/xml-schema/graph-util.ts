/**
 * Tarjan's strongly-connected-components algorithm, generic over the node type so both the per-file dependency
 * graph ({@link XmlSchemaAnalysisService}) and the per-namespace one ({@link XmlSchemaWrapperGeneratorService}) can
 * share it. Nodes are indexed into plain arrays for the bookkeeping rather than keyed by `Map`/`Set` throughout, so
 * it stays fast on graphs with many files.
 *
 * A node that is not part of any cycle forms its own singleton component. Components are returned dependency-first:
 * if A is a successor of B (B depends on A), A's component comes before B's.
 *
 * @param nodes Every node in the graph, once each.
 * @param successors The nodes a given node points to. A successor outside `nodes` is ignored.
 */
export function stronglyConnectedComponents<T>(nodes: T[], successors: (node: T) => Iterable<T>): T[][] {
  const UNVISITED = -1;
  const idOf = new Map<T, number>(nodes.map((node, id) => [node, id]));
  const index: number[] = nodes.map(() => UNVISITED);
  const lowlink: number[] = nodes.map(() => UNVISITED);
  const onStack: boolean[] = nodes.map(() => false);
  const stack: number[] = [];
  const components: T[][] = [];
  let nextIndex = 0;

  const strongConnect = (node: number) => {
    index[node] = nextIndex;
    lowlink[node] = nextIndex;
    nextIndex++;
    stack.push(node);
    onStack[node] = true;

    for (const next of successors(nodes[node])) {
      const nextId = idOf.get(next);
      if (nextId === undefined) continue;
      if (index[nextId] === UNVISITED) {
        strongConnect(nextId);
        lowlink[node] = Math.min(lowlink[node], lowlink[nextId]);
      } else if (onStack[nextId]) {
        lowlink[node] = Math.min(lowlink[node], index[nextId]);
      }
    }

    // The node is the root of a component: everything pushed since it, itself included, belongs to it.
    if (lowlink[node] === index[node]) {
      const members = stack.splice(stack.lastIndexOf(node));
      for (const member of members) {
        onStack[member] = false;
      }
      components.push(members.map((member) => nodes[member]));
    }
  };

  for (let node = 0; node < nodes.length; node++) {
    if (index[node] === UNVISITED) strongConnect(node);
  }
  return components;
}
