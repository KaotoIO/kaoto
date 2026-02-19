import './PlaceholderNode.scss';

import { Icon } from '@patternfly/react-core';
import { CodeBranchIcon, PlusCircleIcon } from '@patternfly/react-icons';
import type {
  DefaultNode,
  DropTargetSpec,
  ElementModel,
  GraphElement,
  GraphElementProps,
  Node,
} from '@patternfly/react-topology';
import {
  AnchorEnd,
  DEFAULT_LAYER,
  isNode,
  Layer,
  observer,
  Rect,
  useAnchor,
  useDndDrop,
} from '@patternfly/react-topology';
import clsx from 'clsx';
import { FunctionComponent, useContext, useMemo, useRef } from 'react';

import { CatalogModalContext } from '../../../../dynamic-catalog/catalog-modal.provider';
import { useEntityContext } from '../../../../hooks/useEntityContext/useEntityContext';
import { AddStepMode, IVisualizationNode } from '../../../../models';
import { SettingsContext } from '../../../../providers/settings.provider';
import { CanvasDefaults } from '../../Canvas/canvas.defaults';
import { CanvasNode } from '../../Canvas/canvas.models';
import { GROUP_DRAG_TYPE, NODE_DRAG_TYPE } from '../customComponentUtils';
import { useInsertStep } from '../hooks/insert-step.hook';
import { useReplaceStep } from '../hooks/replace-step.hook';
import { TargetAnchor } from '../target-anchor';
import { checkNodeDropCompatibility } from './CustomNodeUtils';

type DefaultNodeProps = Parameters<typeof DefaultNode>[0];
interface PlaceholderNodeInnerProps extends DefaultNodeProps {
  element: GraphElement<ElementModel, CanvasNode['data']>;
}

interface PlaceholderNodeLabelProps {
  label: string;
  x: number;
  y: number;
  transform?: string;
}

const PlaceholderNodeLabel: FunctionComponent<PlaceholderNodeLabelProps> = ({ label, x, y, transform }) => {
  return (
    <foreignObject
      x={x}
      y={y}
      transform={transform}
      width={CanvasDefaults.DEFAULT_LABEL_WIDTH}
      height={CanvasDefaults.DEFAULT_LABEL_HEIGHT}
      className="placeholder-node__label"
    >
      <div className="placeholder-node__label__text">
        <span title={label}>{label}</span>
      </div>
    </foreignObject>
  );
};

interface PlaceholderNodeContainerProps {
  vizNode: IVisualizationNode;
  tooltipContent: string;
  canDrop: boolean;
  hover: boolean;
  droppable: boolean;
  isDraggingWithinGroup: boolean;
  isSpecialChildPlaceholder: boolean;
}

const PlaceholderNodeContainer: FunctionComponent<PlaceholderNodeContainerProps> = ({
  vizNode,
  tooltipContent,
  canDrop,
  hover,
  droppable,
  isDraggingWithinGroup,
  isSpecialChildPlaceholder,
}) => {
  return (
    <div
      data-testid={`${vizNode.getId()}|${vizNode.id}`}
      className={clsx('placeholder-node__container', {
        'placeholder-node__container__draggedNode': isDraggingWithinGroup,
      })}
    >
      <div
        title={tooltipContent}
        className={clsx('placeholder-node__container__image', {
          'placeholder-node__container__image__dropTarget': droppable && canDrop && hover,
          'placeholder-node__container__image__possibleDropTargets': canDrop && droppable && !hover,
        })}
      >
        <Icon size="lg">{isSpecialChildPlaceholder ? <CodeBranchIcon /> : <PlusCircleIcon />}</Icon>
      </div>
    </div>
  );
};

const PlaceholderNodeInner: FunctionComponent<PlaceholderNodeInnerProps> = observer(({ element }) => {
  if (!isNode(element)) {
    throw new Error('PlaceholderNodeInner must be used only on Node elements');
  }
  const vizNode: IVisualizationNode | undefined = element.getData()?.vizNode;
  const settingsAdapter = useContext(SettingsContext);
  const entitiesContext = useEntityContext();
  const catalogModalContext = useContext(CatalogModalContext);
  const label = vizNode?.getNodeLabel(settingsAdapter.getSettings().nodeLabel);
  const updatedLabel = label === 'placeholder' ? 'Add step' : label;
  const tooltipContent = 'Click to add a step';
  const boxRef = useRef<Rect | null>(null);
  const boxXRef = useRef<number | null>(null);
  const boxYRef = useRef<number | null>(null);

  useAnchor((element: Node) => {
    return new TargetAnchor(element);
  }, AnchorEnd.both);

  if (!vizNode) {
    return null;
  }
  const { onReplaceNode } = useReplaceStep(vizNode);
  const { onInsertStep } = useInsertStep(vizNode, AddStepMode.InsertSpecialChildStep);

  const placeholderNodeDropTargetSpec: DropTargetSpec<
    GraphElement,
    unknown,
    {
      droppable: boolean;
      hover: boolean;
      canDrop: boolean;
      dragItemType: string | undefined;
      dragItem: GraphElement | undefined;
    },
    GraphElementProps
  > = useMemo(
    () => ({
      accept: [NODE_DRAG_TYPE, GROUP_DRAG_TYPE],
      canDrop: (item, _monitor, _props) => {
        return checkNodeDropCompatibility(
          (item as Node).getData()?.vizNode,
          vizNode,
          (mode: AddStepMode, filterNode: IVisualizationNode, compatibilityCheckNodeName: string) => {
            const filter = entitiesContext.camelResource.getCompatibleComponents(
              mode,
              filterNode.data,
              filterNode.getNodeDefinition(),
            );
            return catalogModalContext?.checkCompatibility(compatibilityCheckNodeName, filter) ?? false;
          },
        );
      },
      collect: (monitor) => ({
        droppable: monitor.isDragging(),
        hover: monitor.isOver(),
        canDrop: monitor.canDrop(),
        dragItemType: monitor.getItemType(),
        dragItem: monitor.getItem(),
      }),
    }),
    [vizNode, entitiesContext, catalogModalContext],
  );

  const [dndDropProps, dndDropRef] = useDndDrop(placeholderNodeDropTargetSpec);
  const isSpecialChildPlaceholder = vizNode.data.name === 'placeholder-special-child';
  const isDraggingGroupType = dndDropProps.dragItemType === GROUP_DRAG_TYPE;
  const isDraggingNodeType = dndDropProps.dragItemType === NODE_DRAG_TYPE;
  const draggedGroupVizNode = dndDropProps.dragItem?.getData().vizNode;
  const isDraggingWithinGroup =
    isDraggingGroupType &&
    draggedGroupVizNode?.getId() === element.getData().vizNode.getId() &&
    element.getData().vizNode.data.path.slice(0, draggedGroupVizNode?.data.path.length) ===
      draggedGroupVizNode?.data.path;

  const box = element.getBounds();
  if (!dndDropProps.droppable || !boxRef.current || !boxXRef.current || !boxYRef.current) {
    boxRef.current = box;
    boxXRef.current = box.x;
    boxYRef.current = box.y;
  }

  const labelX = (box.width - CanvasDefaults.DEFAULT_LABEL_WIDTH) / 2;
  const labelY = boxRef.current.height - 1;
  const labelTransform =
    dndDropProps.droppable && isDraggingWithinGroup
      ? `translate(${boxXRef.current - box.x}, ${boxYRef.current - box.y})`
      : undefined;

  const containerProps = {
    vizNode,
    tooltipContent,
    canDrop: dndDropProps.canDrop,
    hover: dndDropProps.hover,
    droppable: dndDropProps.droppable,
    isDraggingWithinGroup,
    isSpecialChildPlaceholder,
  };

  return (
    <Layer id={DEFAULT_LAYER}>
      <g
        className="placeholder-node"
        data-testid={`placeholder-node__${vizNode.id}`}
        data-nodelabel={label}
        onClick={isSpecialChildPlaceholder ? onInsertStep : onReplaceNode}
      >
        {/** The original placeholder node */}
        {(!dndDropProps.droppable || isDraggingNodeType || (isDraggingGroupType && !isDraggingWithinGroup)) && (
          <foreignObject
            ref={dndDropRef}
            data-nodelabel={label}
            width={boxRef.current.width}
            height={boxRef.current.height}
          >
            <PlaceholderNodeContainer {...containerProps} />
          </foreignObject>
        )}

        {/** The dummy placeholder node that appears when dragging the group/node */}
        {dndDropProps.droppable && isDraggingGroupType && isDraggingWithinGroup && (
          <foreignObject
            data-nodelabel={label}
            width={boxRef.current.width}
            height={boxRef.current.height}
            transform={`translate(${boxXRef.current - box.x}, ${boxYRef.current - box.y})`}
          >
            <PlaceholderNodeContainer {...containerProps} />
          </foreignObject>
        )}

        {/** Label rendering - regular label when nothing is dragging */}
        {updatedLabel && !dndDropProps.droppable && <PlaceholderNodeLabel label={updatedLabel} x={labelX} y={labelY} />}

        {/** Label which appears when dragging the group/node, but for the dummy node */}
        {updatedLabel && dndDropProps.droppable && isDraggingWithinGroup && (
          <PlaceholderNodeLabel label={updatedLabel} x={labelX} y={labelY} transform={labelTransform} />
        )}

        {/** This label, appears for the node which are not dragging within the container */}
        {updatedLabel && (isDraggingNodeType || (isDraggingGroupType && !isDraggingWithinGroup)) && (
          <PlaceholderNodeLabel label={updatedLabel} x={labelX} y={labelY} />
        )}
      </g>
    </Layer>
  );
});

export const PlaceholderNode: FunctionComponent<PlaceholderNodeInnerProps> = ({
  element,
  ...rest
}: PlaceholderNodeInnerProps) => {
  if (!isNode(element)) {
    throw new Error('PlaceholderNode must be used only on Node elements');
  }
  return <PlaceholderNodeInner element={element} {...rest} />;
};

export const PlaceholderNodeObserver = observer(PlaceholderNode);
