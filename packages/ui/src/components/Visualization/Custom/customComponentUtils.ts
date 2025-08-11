import { DropTargetSpec, GraphElement, GraphElementProps } from '@patternfly/react-topology';

const NODE_DRAG_TYPE = '#node#';

const customGroupExpandedDropTargetSpec: DropTargetSpec<GraphElement, unknown, object, GraphElementProps> = {
  accept: ['#node#'],
  canDrop: () => {
    return false;
  },
  collect: (monitor) => ({
    droppable: monitor.isDragging(),
  }),
};

export { customGroupExpandedDropTargetSpec, NODE_DRAG_TYPE };
