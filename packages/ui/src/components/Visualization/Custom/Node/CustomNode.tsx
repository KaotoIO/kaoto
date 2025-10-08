import './CustomNode.scss';

import {
  Alert,
  Button,
  Icon,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Panel,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import {
  ArrowDownIcon,
  ArrowRightIcon,
  BanIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  ExclamationCircleIcon,
} from '@patternfly/react-icons';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
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
import { FunctionComponent, MouseEventHandler, useCallback, useContext, useMemo, useRef, useState } from 'react';

import { CatalogModalContext } from '../../../../dynamic-catalog/catalog-modal.provider';
import { useProcessorIcon } from '../../../../hooks/processor-icon.hook';
import { useEntityContext } from '../../../../hooks/useEntityContext/useEntityContext';
import { AddStepMode, IVisualizationNode, NodeToolbarTrigger } from '../../../../models';
import { CamelRouteVisualEntityData } from '../../../../models/visualization/flows/support/camel-component-types';
import { SettingsContext } from '../../../../providers';
import { IconResolver } from '../../../IconResolver';
import { IInteractionType, IOnCopyAddon } from '../../../registers/interactions/node-interaction-addon.model';
import { NodeInteractionAddonContext } from '../../../registers/interactions/node-interaction-addon.provider';
import { CanvasDefaults } from '../../Canvas/canvas.defaults';
import { CanvasNode, LayoutType } from '../../Canvas/canvas.models';
import { StepToolbar } from '../../Canvas/StepToolbar/StepToolbar';
import { NodeContextMenuFn } from '../ContextMenu/NodeContextMenu';
import { NODE_DRAG_TYPE } from '../customComponentUtils';
import { AddStepIcon } from '../Edge/AddStepIcon';
import { FloatingCircle } from '../FloatingCircle/FloatingCircle';
import { useShowMessage } from '../hooks/show-message.hook';
import { TargetAnchor } from '../target-anchor';
import { checkNodeDropCompatibility, handleValidNodeDrop } from './CustomNodeUtils';

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
    const nodeInteractionAddonContext = useContext(NodeInteractionAddonContext);
    const label = vizNode?.getNodeLabel(settingsAdapter.getSettings().nodeLabel);
    const processorName = (vizNode?.data as CamelRouteVisualEntityData)?.processorName;
    const { Icon: ProcessorIcon, description: processorDescription } = useProcessorIcon(processorName);
    const isDisabled = !!vizNode?.getNodeDefinition()?.disabled;
    const tooltipContent = vizNode?.getTooltipContent();
    const validationText = vizNode?.getNodeValidationText();
    const doesHaveWarnings = !isDisabled && !!validationText;
    const verified = !isDisabled && (vizNode?.isVerified() || false);
    const hasMessage = !isDisabled && (vizNode?.hasMessage() || false);
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
    const dndSettingsEnabled = settingsAdapter.getSettings().experimentalFeatures.enableDragAndDrop;
    const canDragNode = vizNode?.canDragNode() ?? false;

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
        item: { type: NODE_DRAG_TYPE },
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
          return dndSettingsEnabled && canDragNode;
        },
        end(dropResult, monitor) {
          if (monitor.didDrop() && dropResult) {
            const draggedVizNode = element.getData().vizNode as IVisualizationNode;
            const droppedVizNode = dropResult.getData().vizNode as IVisualizationNode;

            // handle successful drop
            handleValidNodeDrop(
              draggedVizNode,
              droppedVizNode,
              (flowId?: string) => entitiesContext?.camelResource.removeEntity(flowId ? [flowId] : undefined),
              (vn) =>
                nodeInteractionAddonContext.getRegisteredInteractionAddons(
                  IInteractionType.ON_COPY,
                  vn,
                ) as IOnCopyAddon[],
            );

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
      [canDragNode, dndSettingsEnabled, element, entitiesContext, nodeInteractionAddonContext],
    );

    const customNodeDropTargetSpec: DropTargetSpec<
      GraphElement,
      unknown,
      { droppable: boolean; hover: boolean; canDrop: boolean },
      GraphElementProps
    > = useMemo(
      () => ({
        accept: [NODE_DRAG_TYPE],
        canDrop: (item, _monitor, _props) => {
          const targetNode = element;
          const draggedNode = item as Node;

          // Ensure that the node is not dropped onto itself
          if (draggedNode === targetNode || !vizNode?.canDropOnNode()) return false;

          return checkNodeDropCompatibility(
            draggedNode.getData()?.vizNode,
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

    const [isMessageModalOpen, setIsMessageModalOpen] = useState<boolean>(false);
    const [message, setMessage] = useState<Record<string, unknown>>({} as Record<string, unknown>);
    const { onShowMessage } = useShowMessage(vizNode);
    const showMessage: MouseEventHandler<HTMLDivElement> = useCallback(
      async (event) => {
        event.stopPropagation();
        const message = await onShowMessage();
        setMessage(message);
        setIsMessageModalOpen(true);
      },
      [onShowMessage, setMessage, setIsMessageModalOpen],
    );

    const onCloseMessageModal = useCallback(() => {
      setIsMessageModalOpen(false);
    }, []);

    const [isErrorModalOpen, setIsErrorModalOpen] = useState<boolean>(false);
    const showError: MouseEventHandler<HTMLDivElement> = useCallback(
      async (event) => {
        event.stopPropagation();
        setIsErrorModalOpen(true);
      },
      [setIsErrorModalOpen],
    );

    const onCloseErrorModal = useCallback(() => {
      setIsErrorModalOpen(false);
    }, []);

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
          data-verified={verified}
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
              data-testid={`${vizNode.id}`}
              className={clsx('custom-node__container', {
                'custom-node__container__dropTarget': dndDropProps.canDrop && dndDropProps.hover,
                'custom-node__container__possibleDropTargets':
                  dndDropProps.canDrop && dndDropProps.droppable && !dndDropProps.hover,
                'custom-node__container__draggable': dndSettingsEnabled && canDragNode,
                'custom-node__container__nonDraggable': dndSettingsEnabled && !canDragNode,
              })}
            >
              <div title={tooltipContent} className="custom-node__container__image">
                <IconResolver alt={tooltipContent} catalogKind={vizNode.data.catalogKind} name={vizNode.data.name} />

                {doesHaveWarnings && (
                  <FloatingCircle className="step-icon step-icon__processor">
                    <Icon status="danger" size="lg" title={validationText} onClick={showError}>
                      <ExclamationCircleIcon />
                    </Icon>
                  </FloatingCircle>
                )}
                {hasMessage && (
                  <FloatingCircle className="step-icon step-icon__processor">
                    <Icon status="info" size="lg" onClick={showMessage}>
                      <EnvelopeIcon />
                    </Icon>
                  </FloatingCircle>
                )}
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
                'custom-node__label__text__success': verified,
              })}
            >
              {doesHaveWarnings && (
                <Icon status="danger" title={validationText} data-warning={doesHaveWarnings}>
                  <ExclamationCircleIcon />
                </Icon>
              )}
              {verified && (
                <Icon status="success" title="Step verified" data-verified={verified}>
                  <CheckCircleIcon />
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

        <Modal isOpen={isMessageModalOpen} variant={ModalVariant.large} data-testid="message-info-modal">
          <ModalHeader title="Message" titleIconVariant={'info'} />
          <ModalBody>
            <Stack hasGutter>
              <h4>Message Headers</h4>
              {message.headers !== undefined && (
                <StackItem>
                  <Table aria-label="Message Headers" variant="compact" data-testid="message-headers-table">
                    <Thead title="Message headers">
                      <Th>Name</Th>
                      <Th>Value</Th>
                    </Thead>
                    <Tbody>
                      {(message.headers as Record<string, string>[])
                        .filter((header) => header.name.startsWith('citrus_'))
                        .map((header) => (
                          <Tr key={header.name}>
                            <Td>{header.name.toUpperCase()}</Td>
                            <Td>{header.value}</Td>
                          </Tr>
                        ))}
                    </Tbody>
                    <Tbody>
                      {(message.headers as Record<string, string>[])
                        .filter((header) => !header.name.startsWith('citrus_'))
                        .map((header) => (
                          <Tr key={header.name}>
                            <Td>{header.name}</Td>
                            <Td>{header.value}</Td>
                          </Tr>
                        ))}
                    </Tbody>
                  </Table>
                </StackItem>
              )}
              <h4>Message Body</h4>
              <StackItem>
                <Panel>
                  <pre>{message.payload?.toString() || 'Empty Message Body'}</pre>
                </Panel>
              </StackItem>

              {doesHaveWarnings && (
                <StackItem>
                  <Alert variant="danger" title="Validation Error">
                    <p>{validationText}</p>
                  </Alert>
                </StackItem>
              )}
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button
              key="Close"
              data-testid="message-info-modal-btn-close"
              variant="control"
              onClick={onCloseMessageModal}
            >
              Close
            </Button>
          </ModalFooter>
        </Modal>

        <Modal isOpen={isErrorModalOpen} variant={ModalVariant.medium} data-testid="validation-error-modal">
          <ModalHeader title={'FAILURE'} titleIconVariant={'danger'} />
          <ModalBody>
            <Stack hasGutter>
              <StackItem>
                <Alert variant="danger" title={'Validation error'}>
                  <p>{validationText}</p>
                </Alert>
              </StackItem>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button
              key="Close"
              data-testid="validation-error-modal-btn-close"
              variant="control"
              onClick={onCloseErrorModal}
            >
              Close
            </Button>
          </ModalFooter>
        </Modal>
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
