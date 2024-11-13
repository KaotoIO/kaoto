import { Icon } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import type { DefaultNode, ElementModel, GraphElement, Node } from '@patternfly/react-topology';
import {
  AnchorEnd,
  DEFAULT_LAYER,
  Layer,
  Rect,
  isNode,
  observer,
  useAnchor,
  withDndDrop,
} from '@patternfly/react-topology';
import { FunctionComponent, useContext, useRef } from 'react';
import { IVisualizationNode } from '../../../../models';
import { SettingsContext } from '../../../../providers';
import { CanvasDefaults } from '../../Canvas/canvas.defaults';
import { CanvasNode } from '../../Canvas/canvas.models';
import { useReplaceStep } from '../hooks/replace-step.hook';
import { TargetAnchor } from '../target-anchor';
import './PlaceholderNode.scss';
import clsx from 'clsx';
import { placeholderNodeDropTargetSpec } from '../customComponentUtils';

type DefaultNodeProps = Parameters<typeof DefaultNode>[0];
interface PlaceholderNodeInnerProps extends DefaultNodeProps {
  element: GraphElement<ElementModel, CanvasNode['data']>;
}

const PlaceholderNodeInner: FunctionComponent<PlaceholderNodeInnerProps> = observer(
  ({ element, dndDropRef, hover, canDrop }) => {
    if (!isNode(element)) {
      throw new Error('PlaceholderNode must be used only on Node elements');
    }
    const vizNode: IVisualizationNode | undefined = element.getData()?.vizNode;
    const settingsAdapter = useContext(SettingsContext);
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
              className={clsx('placeholder-node__container', {
                'placeholder-node__container__dropTarget': canDrop && hover,
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
  },
);

export const PlaceholderNode = withDndDrop(placeholderNodeDropTargetSpec)(PlaceholderNodeInner);
