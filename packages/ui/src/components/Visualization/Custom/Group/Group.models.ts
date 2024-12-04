import type {
  ElementModel,
  GraphElement,
  DefaultGroup as TopologyDefaultGroup,
  WithDndDropProps,
} from '@patternfly/react-topology';
import { CanvasNode } from '../../Canvas';

type DefaultGroupProps = Parameters<typeof TopologyDefaultGroup>[0];
export interface CustomGroupProps extends DefaultGroupProps, WithDndDropProps {
  element: GraphElement<ElementModel, CanvasNode['data']>;
  /** Toggle node collapse / expand */
  onCollapseToggle?: () => void;
  hover?: boolean;
  droppable?: boolean;
  canDrop?: boolean;
}
