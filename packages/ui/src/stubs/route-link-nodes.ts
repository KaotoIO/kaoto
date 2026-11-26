import { Graph, ModelKind, Node, Rect } from '@patternfly/react-topology';

import { LayoutType } from '../components/Visualization/Canvas/canvas.models';

/** A node of a canvas laid out by hand, to test what is drawn from the bounds of the nodes */
export interface FakeNodeSpec {
  id: string;
  bounds: [x: number, y: number, width: number, height: number];
  children?: FakeNodeSpec[];
  collapsed?: boolean;
  hidden?: boolean;
  /** The agent steps the links that leave this route start from */
  sourceSteps?: string[];
  /** The tags drawn beside the tool these links reach */
  linkLabels?: string[];
}

/**
 * Builds the routes of a canvas, as PatternFly nodes that answer only what the links between routes read:
 * their bounds, parent, children, the links that leave them, and the nodes of the canvas by id.
 * A node with children is an expanded group.
 */
export const buildFakeCanvas = (layout: LayoutType, routes: FakeNodeSpec[]) => {
  const nodes = new Map<string, Node>();
  const controller = { getNodeById: (id: string) => nodes.get(id) };
  const graph = {
    getKind: () => ModelKind.graph,
    getParent: () => undefined,
    isVisible: () => true,
    isCollapsed: () => false,
    getLayout: () => layout,
    getNodes: () => routes.map((route) => nodes.get(route.id)),
  } as unknown as Graph;

  const build = (spec: FakeNodeSpec, parent: Node | Graph): Node => {
    const children: Node[] = [];
    const node = {
      getKind: () => ModelKind.node,
      getId: () => spec.id,
      getBounds: () => new Rect(...spec.bounds),
      getParent: () => parent,
      getChildren: () => children,
      getGraph: () => graph,
      getController: () => controller,
      isGroup: () => spec.children !== undefined,
      isCollapsed: () => spec.collapsed ?? false,
      isVisible: () => !spec.hidden,
      getSourceEdges: () =>
        spec.sourceSteps
          ? [
              {
                getData: () => ({ sourceSteps: spec.sourceSteps }),
                getTarget: () => ({
                  getTargetEdges: () => (spec.linkLabels ?? []).map((label) => ({ getLabel: () => label })),
                }),
              },
            ]
          : [],
    } as unknown as Node;
    nodes.set(spec.id, node);
    children.push(...(spec.children ?? []).map((child) => build(child, node)));
    return node;
  };
  routes.forEach((route) => build(route, graph));

  return { graph, getNode: (id: string) => nodes.get(id)! };
};
