import { Node, DefaultGroup as TopologyDefaultGroup } from '@patternfly/react-topology';
import { CanvasNode } from '../../Canvas';

type DefaultGroupProps = Parameters<typeof TopologyDefaultGroup>[0];
export interface CustomGroupProps extends DefaultGroupProps {
  element: Node<CanvasNode, CanvasNode['data']>;
}

export type PointWithSize = [number, number, number];
