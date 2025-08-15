import { Icon } from '@patternfly/react-core';
import { ArrowDownIcon, ArrowRightIcon, BanIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import {
  AnchorEnd,
  DEFAULT_LAYER,
  DefaultNode,
  DragObjectWithType,
  DragSourceSpec,
  DragSpecOperationType,
  DropTargetSpec,
  EditableDragOperationType,
  ElementModel,
  GraphElement,
  GraphElementProps,
  isNode,
  Layer,
  Node,
  observer,
  Rect,
  TOP_LAYER,
  useAnchor,
  useCombineRefs,
  useDndDrop,
  useDragNode,
  useHover,
  withContextMenu,
  withSelection,
} from '@patternfly/react-topology';
import clsx from 'clsx';
import { FunctionComponent, useContext, useRef, useMemo } from 'react';
import { useProcessorIcon } from '../../../../hooks/processor-icon.hook';
import { useEntityContext } from '../../../../hooks/useEntityContext/useEntityContext';
import { AddStepMode, IVisualizationNode, NodeToolbarTrigger } from '../../../../models';
import { CamelRouteVisualEntityData } from '../../../../models/visualization/flows/support/camel-component-types';
import { SettingsContext } from '../../../../providers';
import { CatalogModalContext } from '../../../../providers/catalog-modal.provider';
import { CanvasDefaults } from '../../Canvas/canvas.defaults';
import { CanvasNode, LayoutType } from '../../Canvas/canvas.models';
import { StepToolbar } from '../../Canvas/StepToolbar/StepToolbar';
import { NodeContextMenuFn } from '../ContextMenu/NodeContextMenu';
import { AddStepIcon } from '../Edge/AddStepIcon';
import { FloatingCircle } from '../FloatingCircle/FloatingCircle';
import { TargetAnchor } from '../target-anchor';
import './CustomNode.scss';
import { isDefined } from '../../../../utils';

type DefaultNodeProps = Parameters<typeof DefaultNode>[0];

interface CustomNodeProps extends DefaultNodeProps {
  element: GraphElement<ElementModel, CanvasNode['data']>;
  /** Toggle node collapse / expand */
  onCollapseToggle?: () => void;
}

const CustomNodeInner: FunctionComponent<CustomNodeProps> = observer(
  ({ element, onContextMenu, onCollapseToggle, selected, onSelect }) => {
    if (!isNode(element)) {
      throw new Error('CustomNodeInner must be used only on Node elements');
    }

    const vizNode: IVisualizationNode | undefined = element.getData()?.vizNode;
    const lastUpdate = vizNode?.lastUpdate;
    const entitiesContext = useEntityContext();
    const catalogModalContext = useContext(CatalogModalContext);
    const settingsAdapter = useContext(SettingsContext);
    const label = vizNode?.getNodeLabel(settingsAdapter.getSettings().nodeLabel);
    const processorName = (vizNode?.data as CamelRouteVisualEntityData)?.processorName;
    const { Icon: ProcessorIcon, description: processorDescription } = useProcessorIcon(processorName);
    const isDisabled = !!vizNode?.getComponentSchema()?.definition?.disabled;
    const tooltipContent = vizNode?.getTooltipContent();
    const validationText = vizNode?.getNodeValidationText();
    const doesHaveWarnings = !isDisabled && !!validationText;
    const [isGHover, gHoverRef] = useHover<SVGGElement>(CanvasDefaults.HOVER_DELAY_IN, CanvasDefaults.HOVER_DELAY_OUT);
    const [isToolbarHover, toolbarHoverRef] = useHover<SVGForeignObjectElement>(
      CanvasDefaults.HOVER_DELAY_IN,
      CanvasDefaults.HOVER_DELAY_OUT,
    );
    const childCount = element.getAllNodeChildren().length;
    const boxRef = useRef<Rect | null>(null);
    const shouldShowToolbar =
      settingsAdapter.getSettings().nodeToolbarTrigger === NodeToolbarTrigger.onHover
        ? isGHover || isToolbarHover || selected
        : selected;
    const shouldShowAddStep =
      shouldShowToolbar && vizNode?.getNodeInteraction().canHaveNextStep && vizNode.getNextNode() === undefined;
    const isHorizontal = element.getGraph().getLayout() === LayoutType.DagreHorizontal;

    useAnchor((element: Node) => {
      return new TargetAnchor(element);
    }, AnchorEnd.both);

    const nodeDragSourceSpec: DragSourceSpec<
      DragObjectWithType,
      DragSpecOperationType<EditableDragOperationType>,
      GraphElement,
      object,
      GraphElementProps
    > = useMemo(
      () => ({
        item: { type: '#node#' },
        begin: () => {
          // Hide all edges when dragging starts
          element
            .getGraph()
            .getEdges()
            .forEach((edge) => {
              edge.setVisible(false);
            });
        },
        canDrag: () => {
          if (settingsAdapter.getSettings().experimentalFeatures.enableDragAndDrop) {
            return element.getData()?.vizNode?.canDragNode();
          } else {
            return false;
          }
        },
        end(dropResult, monitor) {
          if (monitor.didDrop() && dropResult) {
            const draggedVizNode = element.getData().vizNode as IVisualizationNode;
            const droppedVizNode = dropResult.getData()?.vizNode as IVisualizationNode;
            const draggedNodeContent = draggedVizNode.getCopiedContent();
            if (!isDefined(draggedVizNode) || !isDefined(droppedVizNode) || !isDefined(draggedNodeContent)) return;

            if (getDragAndDropDirection(draggedVizNode, droppedVizNode) === 'forward') {
              droppedVizNode.pasteBaseEntityStep(draggedNodeContent, AddStepMode.AppendStep);
              draggedVizNode.removeChild();
            } else {
              draggedVizNode.removeChild();
              droppedVizNode.pasteBaseEntityStep(draggedNodeContent, AddStepMode.PrependStep);
            }

            // Set an empty model to clear the graph
            element.getController().fromModel({
              nodes: [],
              edges: [],
            });
            requestAnimationFrame(() => {
              entitiesContext.updateEntitiesFromCamelResource();
            });
          } else {
            // Show all edges after dropping
            element
              .getGraph()
              .getEdges()
              .forEach((edge) => {
                edge.setVisible(true);
              });
            element.getGraph().layout();
          }
        },
      }),
      [element, entitiesContext, settingsAdapter],
    );

    const customNodeDropTargetSpec: DropTargetSpec<
      GraphElement,
      unknown,
      { droppable: boolean; hover: boolean; canDrop: boolean },
      GraphElementProps
    > = useMemo(
      () => ({
        accept: ['#node#'],
        canDrop: (item, _monitor, _props) => {
          const targetNode = element;
          const draggedNode = item as Node;

          // Ensure that the node is not dropped onto itself
          if (draggedNode === targetNode) return false;

          const draggedVizNode = draggedNode.getData()?.vizNode;
          if (!isDefined(draggedVizNode) || !isDefined(vizNode)) return false;

          const actionDirection = getDragAndDropDirection(draggedVizNode, vizNode);
          const droppedVizNodeContent = draggedVizNode.getCopiedContent();
          const targetVizNodeContent = vizNode.getCopiedContent();
          if (!isDefined(droppedVizNodeContent) || !isDefined(targetVizNodeContent)) return false;

          // Validation for step array nodes
          if (
            actionDirection === 'forward'
              ? vizNode.getNodeInteraction().canHaveNextStep
              : vizNode.getNodeInteraction().canHavePreviousStep
          ) {
            const filter = entitiesContext.camelResource.getCompatibleComponents(
              actionDirection === 'forward' ? AddStepMode.AppendStep : AddStepMode.PrependStep,
              vizNode.data,
              vizNode.getComponentSchema()?.definition,
            );
            return catalogModalContext?.checkCompatibility(droppedVizNodeContent.name, filter) ?? false;
          }

          // validation for special children nodes in case of Route Entity
          const draggedVizNodeParent = draggedVizNode.getParentNode();
          const targetVizNodeParent = vizNode.getParentNode();
          if (
            draggedVizNodeParent &&
            targetVizNodeParent &&
            draggedVizNodeParent.getNodeInteraction().canHaveSpecialChildren &&
            targetVizNodeParent.getNodeInteraction().canHaveSpecialChildren
          ) {
            if (droppedVizNodeContent.name !== targetVizNodeContent.name) return false;
            const filter = entitiesContext.camelResource.getCompatibleComponents(
              AddStepMode.InsertSpecialChildStep,
              targetVizNodeParent.data,
              targetVizNodeParent.getComponentSchema()?.definition,
            );
            return catalogModalContext?.checkCompatibility(draggedVizNode.getCopiedContent().name, filter) ?? false;
          }

          return false;
        },
        collect: (monitor) => ({
          droppable: monitor.isDragging(),
          hover: monitor.isOver(),
          canDrop: monitor.canDrop(),
        }),
      }),
      [element, vizNode, entitiesContext, catalogModalContext],
    );

    const [_, dragNodeRef] = useDragNode(nodeDragSourceSpec);
    const [dndDropProps, dndDropRef] = useDndDrop(customNodeDropTargetSpec);
    const gCombinedRef = useCombineRefs<SVGGElement>(gHoverRef, dragNodeRef);

    if (!dndDropProps.droppable || !boxRef.current) {
      boxRef.current = element.getBounds();
    }
    const labelX = (boxRef.current.width - CanvasDefaults.DEFAULT_LABEL_WIDTH) / 2;
    const toolbarWidth = CanvasDefaults.STEP_TOOLBAR_WIDTH;
    const toolbarX = (boxRef.current.width - toolbarWidth) / 2;
    const toolbarY = CanvasDefaults.STEP_TOOLBAR_HEIGHT * -1;

    if (!vizNode) {
      return null;
    }

    return (
      <Layer id={DEFAULT_LAYER} data-lastupdate={lastUpdate}>
        <g
          ref={gCombinedRef}
          className="custom-node"
          data-testid={`custom-node__${vizNode.id}`}
          data-nodelabel={label}
          data-selected={selected}
          data-disabled={isDisabled}
          data-toolbar-open={shouldShowToolbar}
          data-warning={doesHaveWarnings}
          onClick={onSelect}
          onContextMenu={onContextMenu}
        >
          <foreignObject
            data-nodelabel={label}
            width={boxRef.current.width}
            height={boxRef.current.height}
            ref={dndDropRef}
          >
            <div
              className={clsx('custom-node__container', {
                'custom-node__container__dropTarget': dndDropProps.canDrop && dndDropProps.hover,
                'custom-node__container__possibleDropTarget':
                  dndDropProps.canDrop && dndDropProps.droppable && !dndDropProps.hover,
              })}
            >
              <div title={tooltipContent} className="custom-node__container__image">
                <img alt={tooltipContent} src={vizNode.data.icon} />

                {childCount > 0 && (
                  <FloatingCircle className="step-icon step-icon__processor">
                    <span title={`${childCount}`}>{childCount}</span>
                  </FloatingCircle>
                )}
                {ProcessorIcon && (
                  <FloatingCircle className="step-icon step-icon__processor">
                    <Icon status="info" size="lg">
                      <ProcessorIcon title={processorDescription} />
                    </Icon>
                  </FloatingCircle>
                )}
                {isDisabled && (
                  <FloatingCircle className="step-icon step-icon__disabled">
                    <Icon status="danger" size="lg">
                      <BanIcon />
                    </Icon>
                  </FloatingCircle>
                )}
              </div>
            </div>
          </foreignObject>

          <foreignObject
            x={labelX}
            y={boxRef.current.height - 1}
            width={CanvasDefaults.DEFAULT_LABEL_WIDTH}
            height={CanvasDefaults.DEFAULT_LABEL_HEIGHT}
            className="custom-node__label"
          >
            <div
              className={clsx('custom-node__label__text', {
                'custom-node__label__text__error': doesHaveWarnings,
              })}
            >
              {doesHaveWarnings && (
                <Icon status="danger" title={validationText} data-warning={doesHaveWarnings}>
                  <ExclamationCircleIcon />
                </Icon>
              )}
              <span title={label}>{label}</span>
            </div>
          </foreignObject>

          {!dndDropProps.droppable && shouldShowToolbar && (
            <Layer id={TOP_LAYER}>
              <foreignObject
                ref={toolbarHoverRef}
                className="custom-node__toolbar"
                x={toolbarX}
                y={toolbarY}
                width={toolbarWidth}
                height={CanvasDefaults.STEP_TOOLBAR_HEIGHT}
              >
                <StepToolbar
                  data-testid="step-toolbar"
                  vizNode={vizNode}
                  isCollapsed={element.isCollapsed()}
                  onCollapseToggle={onCollapseToggle}
                />
              </foreignObject>
            </Layer>
          )}

          {!dndDropProps.droppable && shouldShowAddStep && (
            <foreignObject
              x={boxRef.current.width - 8}
              y={(boxRef.current.height - CanvasDefaults.ADD_STEP_ICON_SIZE) / 2}
              width={CanvasDefaults.ADD_STEP_ICON_SIZE}
              height={CanvasDefaults.ADD_STEP_ICON_SIZE}
            >
              <AddStepIcon
                vizNode={vizNode}
                mode={AddStepMode.AppendStep}
                title="Add step"
                data-testid="quick-append-step"
              >
                <Icon size="lg">{isHorizontal ? <ArrowRightIcon /> : <ArrowDownIcon />}</Icon>
              </AddStepIcon>
            </foreignObject>
          )}
        </g>
      </Layer>
    );
  },
);

const CustomNode: FunctionComponent<CustomNodeProps> = ({ element, ...rest }: CustomNodeProps) => {
  if (!isNode(element)) {
    throw new Error('CustomNode must be used only on Node elements');
  }
  return <CustomNodeInner element={element} {...rest} />;
};

export const CustomNodeObserver = observer(CustomNode);

export const CustomNodeWithSelection = withSelection()(withContextMenu(NodeContextMenuFn)(CustomNode));

export const getDragAndDropDirection = (
  draggedVizNode: IVisualizationNode,
  droppedVizNode: IVisualizationNode,
): 'forward' | 'backward' => {
  const isSameBaseEntity = draggedVizNode?.getId() === droppedVizNode?.getId();
  if (!isSameBaseEntity) return 'forward';

  const draggedNodeArray = draggedVizNode.data.path ?? ''.split('.');
  const droppedNodeArray = droppedVizNode.data.path ?? ''.split('.');
  for (let i = 0; i < Math.min(draggedNodeArray.length, droppedNodeArray.length); i++) {
    if (draggedNodeArray[i] !== droppedNodeArray[i]) {
      if (Number.isInteger(Number(draggedNodeArray[i])) && Number.isInteger(Number(droppedNodeArray[i]))) {
        return draggedNodeArray[i] < droppedNodeArray[i] ? 'forward' : 'backward';
      }
    }
  }

  return 'forward';
};
