import { IVisualizationNode } from '../../../models/visualization/base-visual-entity';
import { CamelUriHelper } from '../../../utils/camel-uri-helper';

export const TOPOLOGY_PRODUCER_KEYS = ['to', 'toD', 'wireTap'];

export const IN_VM_ENDPOINT_PREFIXES = ['direct:', 'seda:'];

export interface TopologyEndpointRegistry {
  consumersByEndpoint: Map<string, string[]>;
  outgoingByEntity: Map<string, string[]>;
}

export const createEmptyTopologyEndpointRegistry = (): TopologyEndpointRegistry => ({
  consumersByEndpoint: new Map(),
  outgoingByEntity: new Map(),
});

export const normalizeInVmEndpoint = (uri: string | undefined): string | undefined => {
  if (!uri) {
    return undefined;
  }
  const stripped = uri.split('?')[0];
  return IN_VM_ENDPOINT_PREFIXES.some((prefix) => stripped.startsWith(prefix)) ? stripped : undefined;
};

const isTopologyProducer = (processorName: string): processorName is (typeof TOPOLOGY_PRODUCER_KEYS)[number] =>
  TOPOLOGY_PRODUCER_KEYS.includes(processorName as (typeof TOPOLOGY_PRODUCER_KEYS)[number]);

const appendMapValue = (map: Map<string, string[]>, key: string, value: string): void => {
  const existing = map.get(key) ?? [];
  if (existing.includes(value)) {
    return;
  }
  map.set(key, [...existing, value]);
};

const recordTopologyStep = (vizNode: IVisualizationNode, registry: TopologyEndpointRegistry): void => {
  const processorName = vizNode.data.processorName;
  const endpoint = normalizeInVmEndpoint(CamelUriHelper.getEndpoint(vizNode.getNodeDefinition()));
  if (!endpoint) {
    return;
  }

  const entityId = vizNode.getId() ?? vizNode.id;

  if (processorName === 'from') {
    appendMapValue(registry.consumersByEndpoint, endpoint, entityId);
  }
  if (isTopologyProducer(processorName as string)) {
    appendMapValue(registry.outgoingByEntity, entityId, endpoint);
  }
};

/**
 * Walk inner route steps (skipping placeholders) and collect in-VM endpoint producers/consumers.
 * Route root groups are not visited as steps — only their descendant processors are.
 */
export const walkRouteSteps = (vizNode: IVisualizationNode, visitStep: (step: IVisualizationNode) => void): void => {
  const children = (vizNode.getChildren() ?? []).filter((child) => !child.data.isPlaceholder);
  const hasRealChildren = children.length > 0;

  if (vizNode.data.isGroup && hasRealChildren) {
    children.forEach((child) => {
      walkRouteSteps(child, visitStep);
    });
    return;
  }

  visitStep(vizNode);
};

export const collectTopologyEndpoints = (vizNodes: IVisualizationNode[]): TopologyEndpointRegistry => {
  const registry = createEmptyTopologyEndpointRegistry();

  vizNodes.forEach((routeVizNode) => {
    walkRouteSteps(routeVizNode, (step) => {
      recordTopologyStep(step, registry);
    });
  });

  return registry;
};
