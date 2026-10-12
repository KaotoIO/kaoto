import { ElementContext, isNode, Node, observer, useVisualizationController } from '@patternfly/react-topology';
import { useContext } from 'react';

import { CanvasToolbarContext } from './CanvasToolbarProvider';
import { StepToolbarOverlay } from './StepToolbarOverlay';
import { useToolbarCrossfade } from './use-toolbar-crossfade';

/** Match LayerContainer's coordinate accumulation, including positioned ancestors. */
export const getToolbarAnchor = (element: Node) => {
  const bounds = element.getBounds();
  let centerX = bounds.x + bounds.width / 2;
  let bottomY = bounds.y;
  let parent = element.getParent();
  while (isNode(parent)) {
    if (!parent.isGroup() || parent.isCollapsed()) {
      const position = parent.getPosition();
      centerX += position.x;
      bottomY += position.y;
    }
    parent = parent.getParent();
  }
  return { centerX, bottomY };
};

/** A single SVG overlay above the graph, with the same pan/zoom transform. */
export const CanvasToolbar = observer(() => {
  const store = useContext(CanvasToolbarContext);
  const controller = useVisualizationController();
  const target = store?.target;
  const anchor = target ? getToolbarAnchor(target.element) : { centerX: 0, bottomY: 0 };
  const { activeRef, outgoingRef } = useToolbarCrossfade(target?.element.getId());
  if (!target || !controller.hasGraph()) return null;
  const graph = controller.getGraph();
  const { x, y } = graph.getBounds();
  return (
    <g data-testid="canvas-toolbar-layer" transform={`translate(${x}, ${y}) scale(${graph.getScale()})`}>
      <g ref={outgoingRef} data-testid="canvas-toolbar-outgoing" aria-hidden="true" />
      <g
        ref={activeRef}
        data-testid="canvas-toolbar-active"
        onMouseEnter={() => {
          store.enterToolbar();
        }}
        onMouseLeave={() => {
          store.leaveToolbar();
        }}
        onFocus={() => {
          store.focusToolbar();
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as globalThis.Node | null)) store.blurToolbar();
        }}
        onClick={(event) => {
          event.stopPropagation();
        }}
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
      >
        <ElementContext.Provider value={target.element}>
          <StepToolbarOverlay
            {...anchor}
            data-testid="step-toolbar"
            vizNode={target.vizNode}
            isCollapsed={target.isCollapsed}
            onCollapseToggle={target.onCollapseToggle}
          />
        </ElementContext.Provider>
      </g>
    </g>
  );
});
