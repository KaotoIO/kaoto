import {
  ElementContext,
  GraphElement,
  LayersProvider,
  Visualization,
  VisualizationProvider,
} from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren } from 'react';

interface TopologyElementWrapperProps {
  /** Real topology controller, e.g. `ControllerService.createController()` */
  controller: Visualization;
  /** The element exposed through `ElementContext`, usually `controller.getNodeById(id)` */
  element: GraphElement;
}

/**
 * Renders a topology element component (node, group, edge) the same way the topology surface does,
 * without its layout and pan/zoom handling:
 * - the controller is provided through `VisualizationProvider` (`useVisualizationController`, `useDndDrop`, `useDragNode`...)
 * - the graph layers are mounted inside an `<svg>` so `<Layer id={...}>` portals have a target
 * - the element is provided through `ElementContext` (`useAnchor`, `useDragNode`, `Layer` order keys...)
 */
export const TopologyElementWrapper: FunctionComponent<PropsWithChildren<TopologyElementWrapperProps>> = ({
  controller,
  element,
  children,
}) => (
  <VisualizationProvider controller={controller}>
    <svg>
      <LayersProvider layers={controller.getGraph().getLayers()}>
        <ElementContext.Provider value={element}>{children}</ElementContext.Provider>
      </LayersProvider>
    </svg>
  </VisualizationProvider>
);
