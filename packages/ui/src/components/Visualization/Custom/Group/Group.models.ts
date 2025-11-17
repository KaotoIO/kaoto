import type { DefaultGroup as TopologyDefaultGroup, ElementModel, GraphElement } from '@patternfly/react-topology';

import { CanvasNode } from '../../Canvas';

type DefaultGroupProps = Parameters<typeof TopologyDefaultGroup>[0];
export interface CustomGroupProps extends DefaultGroupProps {
  element: GraphElement<ElementModel, CanvasNode['data']>;
  /** Toggle node collapse / expand */
  onCollapseToggle?: () => void;
}
