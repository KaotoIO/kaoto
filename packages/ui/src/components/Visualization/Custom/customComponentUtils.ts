import { DropTargetSpec, GraphElement, GraphElementProps, Node } from '@patternfly/react-topology';

const NODE_DRAG_TYPE = '#node#';

const placeholderNodeDropTargetSpec: DropTargetSpec<GraphElement, unknown, object, GraphElementProps> = {
  accept: ['#node#'],
  canDrop: (item) => {
    const draggedNode = item as Node;
    // Do not allow group drop yet
    return !draggedNode.getData().vizNode.data.isGroup;
  },
  collect: (monitor) => ({
    droppable: monitor.isDragging(),
    hover: monitor.isOver(),
    canDrop: monitor.canDrop(),
  }),
};

const customNodeDropTargetSpec: DropTargetSpec<GraphElement, unknown, object, GraphElementProps> = {
  accept: ['#node#'],
  canDrop: (item, _monitor, props) => {
    const targetNode = props.element;
    const draggedNode = item as Node;

    // Ensure that the node is not dropped onto itself
    if (draggedNode !== targetNode) {
      return targetNode.getData()?.vizNode?.canDropOnNode();
    }

    return false;
  },
  collect: (monitor) => ({
    droppable: monitor.isDragging(),
    hover: monitor.isOver(),
    canDrop: monitor.canDrop(),
  }),
};

const customGroupExpandedDropTargetSpec: DropTargetSpec<GraphElement, unknown, object, GraphElementProps> = {
  accept: ['#node#'],
  canDrop: () => {
    return false;
  },
  collect: (monitor) => ({
    droppable: monitor.isDragging(),
  }),
};

export { customGroupExpandedDropTargetSpec, customNodeDropTargetSpec, placeholderNodeDropTargetSpec, NODE_DRAG_TYPE };
