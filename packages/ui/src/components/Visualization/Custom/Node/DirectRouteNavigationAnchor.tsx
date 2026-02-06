import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { Button, Icon, List, ListItem, Popover } from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { ElementContext, isNode, SELECTION_EVENT } from '@patternfly/react-topology';
import { FunctionComponent, useContext, useMemo, useState } from 'react';

import { useEntityContext } from '../../../../hooks/useEntityContext/useEntityContext';
import { IVisualizationNode } from '../../../../models';
import { DirectRouteNavigationService } from '../../../../models/camel/direct-route-navigation.service';
import { CamelRouteVisualEntityData } from '../../../../models/visualization/flows/support/camel-component-types';
import { SourceCodeContext } from '../../../../providers/source-code.provider';
import { VisibleFlowsContext } from '../../../../providers/visible-flows.provider';
import { FloatingCircle } from '../FloatingCircle/FloatingCircle';

interface DirectRouteNavigationAnchorProps {
  vizNode?: IVisualizationNode;
}

export const DirectRouteNavigationAnchor: FunctionComponent<DirectRouteNavigationAnchorProps> = ({ vizNode }) => {
  const [isPopoverVisible, setIsPopoverVisible] = useState(false);
  const element = useContext(ElementContext);
  const entitiesContext = useEntityContext();
  const visibleFlowsContext = useContext(VisibleFlowsContext);
  const sourceCode = useContext(SourceCodeContext);

  const directNavigation = useMemo(() => {
    if (!vizNode || !entitiesContext) {
      return {
        directEndpointName: undefined,
        targetProcessorName: undefined as 'from' | 'to' | undefined,
        singleTargetId: undefined,
        targetOptions: [] as string[],
        targetNodeIds: {} as Record<string, string>,
      };
    }
    // Recompute direct navigation targets when source changes without recreating entities context.
    void sourceCode;

    const nodeData = vizNode.data as CamelRouteVisualEntityData;
    const isDirectToNode = nodeData.processorName === 'to' && nodeData.componentName === 'direct';
    const isDirectFromNode =
      nodeData.processorName === ('from' as keyof ProcessorDefinition) && nodeData.componentName === 'direct';
    if (!isDirectToNode && !isDirectFromNode) {
      return {
        directEndpointName: undefined,
        targetProcessorName: undefined as 'from' | 'to' | undefined,
        singleTargetId: undefined,
        targetOptions: [] as string[],
        targetNodeIds: {} as Record<string, string>,
      };
    }

    const navigationService = new DirectRouteNavigationService(entitiesContext.visualEntities);
    const directEndpointName = navigationService.getDirectEndpointNameFromDefinition(vizNode.getNodeDefinition());
    if (!directEndpointName) {
      return {
        directEndpointName: undefined,
        targetProcessorName: undefined as 'from' | 'to' | undefined,
        singleTargetId: undefined,
        targetOptions: [] as string[],
        targetNodeIds: {} as Record<string, string>,
      };
    }

    if (isDirectFromNode) {
      const callerRouteIds = navigationService.findDirectCallerRouteIds(directEndpointName, vizNode.getId());
      const callerNodeIds = callerRouteIds.reduce(
        (acc, routeId) => {
          const targetNodeId = navigationService.findDirectCallerNodeId(routeId, directEndpointName);
          if (targetNodeId) {
            acc[routeId] = targetNodeId;
          }
          return acc;
        },
        {} as Record<string, string>,
      );

      return {
        directEndpointName,
        targetProcessorName: 'to' as const,
        singleTargetId: callerRouteIds.length === 1 ? callerRouteIds[0] : undefined,
        targetOptions: callerRouteIds.length > 1 ? callerRouteIds : [],
        targetNodeIds: callerNodeIds,
      };
    }

    const singleTargetId = navigationService.findDirectConsumerRouteId(directEndpointName);
    const targetNodeIds =
      singleTargetId === undefined
        ? {}
        : (() => {
            const targetNodeId = navigationService.findDirectConsumerNodeId(singleTargetId, directEndpointName);
            return targetNodeId ? { [singleTargetId]: targetNodeId } : {};
          })();

    return {
      directEndpointName,
      targetProcessorName: 'from' as const,
      singleTargetId,
      targetOptions: [],
      targetNodeIds,
    };
  }, [entitiesContext, sourceCode, vizNode]);

  const onNavigateToRouteSelect = (routeId: string) => {
    if (!isNode(element) || !visibleFlowsContext) {
      return;
    }
    if (!directNavigation.directEndpointName || !directNavigation.targetProcessorName) {
      return;
    }

    if (!visibleFlowsContext.visibleFlows[routeId]) {
      visibleFlowsContext.visualFlowsApi.showFlows([routeId]);
    }

    const controller = element.getController();
    const applySelection = (canvasTargetNodeId: string) => {
      const targetNode = controller.getNodeById(canvasTargetNodeId);
      if (!targetNode) {
        return false;
      }

      if (typeof targetNode.raise === 'function') {
        targetNode.raise();
      }
      controller.setState({ selectedIds: [canvasTargetNodeId] });
      controller.fireEvent(SELECTION_EVENT, [canvasTargetNodeId]);
      return true;
    };

    const resolveCanvasTargetNodeId = () => {
      const mappedTargetNodeId = directNavigation.targetNodeIds[routeId];
      if (mappedTargetNodeId) {
        const mappedCanvasNodeId = `${routeId}|${mappedTargetNodeId}`;
        if (controller.getNodeById(mappedCanvasNodeId)) {
          return mappedCanvasNodeId;
        }
      }

      const routeNodePrefix = `${routeId}|`;
      const targetNode = controller.getElements().find((graphElement) => {
        if (!isNode(graphElement) || !graphElement.getId().startsWith(routeNodePrefix)) {
          return false;
        }

        const targetVizNode = graphElement.getData()?.vizNode as IVisualizationNode | undefined;
        if (!targetVizNode) {
          return false;
        }

        const targetNodeData = targetVizNode.data as CamelRouteVisualEntityData;
        return (
          targetNodeData.processorName === directNavigation.targetProcessorName &&
          targetNodeData.componentName === 'direct' &&
          DirectRouteNavigationService.getDirectEndpointNameFromDefinition(targetVizNode.getNodeDefinition()) ===
            directNavigation.directEndpointName
        );
      });

      return targetNode?.getId();
    };

    const selectNode = (attempt = 0) => {
      const canvasTargetNodeId = resolveCanvasTargetNodeId();
      if (!canvasTargetNodeId) {
        if (attempt < 10) {
          requestAnimationFrame(() => selectNode(attempt + 1));
        }
        return;
      }

      if (applySelection(canvasTargetNodeId)) {
        return;
      }

      if (attempt < 10) {
        requestAnimationFrame(() => selectNode(attempt + 1));
      }
    };

    selectNode();
  };

  const singleTargetId = directNavigation.singleTargetId;
  const navigateToRouteTitle = singleTargetId
    ? `Go to route ${singleTargetId}`
    : directNavigation.targetOptions.length > 1
      ? 'Go to caller route'
      : undefined;
  const hasNavigateOptions = directNavigation.targetOptions.length > 1;

  if (!navigateToRouteTitle) {
    return null;
  }

  const navigateButton = (
    <Button
      variant="plain"
      aria-label={navigateToRouteTitle}
      title={navigateToRouteTitle}
      data-testid="goto-route-btn"
      className="custom-node__navigate-btn"
      onClick={(event) => {
        event.stopPropagation();
        if (singleTargetId) {
          onNavigateToRouteSelect(singleTargetId);
        }
      }}
    >
      <Icon status="info" size="lg">
        <ExternalLinkAltIcon />
      </Icon>
    </Button>
  );

  return (
    <FloatingCircle className="step-icon step-icon__navigation">
      {hasNavigateOptions ? (
        <Popover
          triggerAction="click"
          isVisible={isPopoverVisible}
          shouldOpen={() => setIsPopoverVisible(true)}
          shouldClose={() => setIsPopoverVisible(false)}
          showClose={false}
          bodyContent={
            <List isPlain>
              {directNavigation.targetOptions.map((routeId) => (
                <ListItem key={routeId}>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="custom-node__navigate-option"
                    data-testid={`goto-route-option-${routeId}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setIsPopoverVisible(false);
                      onNavigateToRouteSelect(routeId);
                    }}
                  >
                    {routeId}
                  </Button>
                </ListItem>
              ))}
            </List>
          }
        >
          {navigateButton}
        </Popover>
      ) : (
        navigateButton
      )}
    </FloatingCircle>
  );
};
