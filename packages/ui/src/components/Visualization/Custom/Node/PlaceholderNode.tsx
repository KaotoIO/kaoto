import './PlaceholderNode.scss';

import { Icon } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
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
import { SettingsContext } from '../../../../providers';
import { CanvasDefaults } from '../../Canvas/canvas.defaults';
import { CanvasNode } from '../../Canvas/canvas.models';
import { NODE_DRAG_TYPE } from '../customComponentUtils';
import { useReplaceStep } from '../hooks/replace-step.hook';
import { TargetAnchor } from '../target-anchor';
import { checkNodeDropCompatibility } from './CustomNodeUtils';

type DefaultNodeProps = Parameters<typeof DefaultNode>[0];
interface PlaceholderNodeInnerProps extends DefaultNodeProps {
  element: GraphElement<ElementModel, CanvasNode['data']>;
}

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
  const boxRef = useRef<Rect>(element.getBounds());
  const labelX = (boxRef.current.width - CanvasDefaults.DEFAULT_LABEL_WIDTH) / 2;

  useAnchor((element: Node) => {
    return new TargetAnchor(element);
  }, AnchorEnd.both);

  if (!vizNode) {
    return null;
  }
  const { onReplaceNode } = useReplaceStep(vizNode);

  const placeholderNodeDropTargetSpec: DropTargetSpec<
    GraphElement,
    unknown,
    { droppable: boolean; hover: boolean; canDrop: boolean },
    GraphElementProps
  > = useMemo(
    () => ({
      accept: [NODE_DRAG_TYPE],
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
      }),
    }),
    [vizNode, entitiesContext, catalogModalContext],
  );

  const [dndDropProps, dndDropRef] = useDndDrop(placeholderNodeDropTargetSpec);

  return (
    <Layer id={DEFAULT_LAYER}>
      <g
        className="placeholder-node"
        data-testid={`placeholder-node__${vizNode.id}`}
        data-nodelabel={label}
        onClick={onReplaceNode}
      >
        <foreignObject
          data-nodelabel={label}
          width={boxRef.current.width}
          height={boxRef.current.height}
          ref={dndDropRef}
        >
          <div
            data-testid={`${vizNode.getId()}|${vizNode.id}`}
            className={clsx('placeholder-node__container', {
              'placeholder-node__container__dropTarget': dndDropProps.canDrop && dndDropProps.hover,
              'placeholder-node__container__possibleDropTargets':
                dndDropProps.canDrop && dndDropProps.droppable && !dndDropProps.hover,
            })}
          >
            <div title={tooltipContent} className="placeholder-node__container__image">
              <Icon size="lg">
                <PlusCircleIcon />
              </Icon>
            </div>
          </div>
        </foreignObject>

        <foreignObject
          x={labelX}
          y={boxRef.current.height - 1}
          width={CanvasDefaults.DEFAULT_LABEL_WIDTH}
          height={CanvasDefaults.DEFAULT_LABEL_HEIGHT}
          className="placeholder-node__label"
        >
          <div className="placeholder-node__label__text">
            <span title={updatedLabel}>{updatedLabel}</span>
          </div>
        </foreignObject>
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
