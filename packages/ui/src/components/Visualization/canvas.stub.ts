import { NodeModel, NodeStatus } from '@patternfly/react-topology';
import { CanvasService } from './canvas.service';

export const NODES: NodeModel[] = [
  {
    id: 'timer',
    type: 'node',
    label: 'timer',
    width: CanvasService.DEFAULT_NODE_DIAMETER,
    height: CanvasService.DEFAULT_NODE_DIAMETER,
    shape: CanvasService.DEFAULT_NODE_SHAPE,
    status: NodeStatus.danger,
    data: {
      isAlternate: false,
    },
  },
  {
    id: 'choice',
    type: 'node',
    label: 'choice',
    width: CanvasService.DEFAULT_NODE_DIAMETER,
    height: CanvasService.DEFAULT_NODE_DIAMETER,
    shape: CanvasService.DEFAULT_NODE_SHAPE,
    status: NodeStatus.success,
    data: {
      isAlternate: false,
    },
  },
  {
    id: 'when',
    type: 'node',
    label: 'when',
    width: CanvasService.DEFAULT_NODE_DIAMETER,
    height: CanvasService.DEFAULT_NODE_DIAMETER,
    shape: CanvasService.DEFAULT_NODE_SHAPE,
    status: NodeStatus.warning,
    data: {
      isAlternate: true,
    },
  },
  {
    id: 'otherwise',
    type: 'node',
    label: 'otherwise',
    width: CanvasService.DEFAULT_NODE_DIAMETER,
    height: CanvasService.DEFAULT_NODE_DIAMETER,
    shape: CanvasService.DEFAULT_NODE_SHAPE,
    status: NodeStatus.info,
    data: {
      isAlternate: false,
    },
  },
  {
    id: 'log',
    type: 'node',
    label: 'log',
    width: CanvasService.DEFAULT_NODE_DIAMETER,
    height: CanvasService.DEFAULT_NODE_DIAMETER,
    shape: CanvasService.DEFAULT_NODE_SHAPE,
    status: NodeStatus.default,
    data: {
      isAlternate: true,
    },
  },
  {
    id: 'group-0',
    children: ['timer', 'group-1', 'log'],
    type: 'group',
    group: true,
    label: 'Group-1',
    style: {
      padding: 40,
    },
  },
  {
    id: 'group-1',
    children: ['choice', 'when', 'otherwise'],
    type: 'group',
    group: true,
    label: 'Group-2',
    style: {
      padding: 40,
    },
  },
];

export const EDGES = [
  {
    id: 'edge-node-4-node-5',
    type: 'edge',
    source: 'timer',
    target: 'choice',
  },
  {
    id: 'edge-node-0-node-4',
    type: 'edge',
    source: 'choice',
    target: 'when',
  },
  {
    id: 'edge-node-0-node-7',
    type: 'edge',
    source: 'choice',
    target: 'otherwise',
  },
  {
    id: 'edge-node-0-node-2',
    type: 'edge',
    source: 'group-1',
    target: 'log',
  },
];
