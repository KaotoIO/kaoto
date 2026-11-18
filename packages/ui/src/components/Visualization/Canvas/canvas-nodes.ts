/** The focusable elements of the canvas nodes: steps, placeholders and groups */
export const CANVAS_NODE_SELECTOR = 'g.custom-node, g.placeholder-node, g.custom-group';

/**
 * Finds the focusable canvas node by its topology id. The id includes the route scope,
 * so equal step paths in different routes resolve to their own node.
 */
export const findCanvasNode = (nodeId: string): SVGGElement | null => {
  const wrapper = `[data-id="${CSS.escape(nodeId)}"]`;
  return document.querySelector<SVGGElement>(
    `${wrapper} > g.custom-node, ${wrapper} > g.placeholder-node, ${wrapper} > g.custom-group`,
  );
};
