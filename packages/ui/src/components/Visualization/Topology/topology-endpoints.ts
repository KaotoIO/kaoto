import { DynamicCatalogRegistry } from '../../../dynamic-catalog';
import { CatalogKind } from '../../../models/catalog-kind';
import { IVisualizationNode } from '../../../models/visualization/base-visual-entity';
import { CamelUriHelper, ParsedParameters } from '../../../utils/camel-uri-helper';
import { getValue } from '../../../utils/get-value';

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

const recordTopologyStep = async (vizNode: IVisualizationNode, registry: TopologyEndpointRegistry): Promise<void> => {
  const processorName = vizNode.data.processorName;
  const nodeDefinition = vizNode.getNodeDefinition();
  const uriString = CamelUriHelper.getUriString(nodeDefinition);

  if (!uriString) {
    return;
  }

  // Extract component name from URI
  const componentName = CamelUriHelper.getSyntaxWithoutSchema(uriString).schema;

  // Query catalog for component definition
  const componentDef = await DynamicCatalogRegistry.get().getEntity(CatalogKind.Component, componentName);

  // Build full URI using getUriStringFromParameters
  let fullUri: string;
  if (componentDef?.component.syntax) {
    const parameters = getValue(nodeDefinition, 'parameters') as ParsedParameters | undefined;
    fullUri = CamelUriHelper.getUriStringFromParameters(uriString, componentDef.component.syntax, parameters, {
      requiredParameters: componentDef.propertiesSchema.required as string[],
    });
  } else {
    // Fallback: if no component definition, use original URI
    fullUri = uriString;
  }

  const endpoint = normalizeInVmEndpoint(fullUri);
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
 * Async version of walkRouteSteps for handling async callbacks.
 */
const walkRouteStepsAsync = async (
  vizNode: IVisualizationNode,
  visitStep: (step: IVisualizationNode) => Promise<void>,
): Promise<void> => {
  const children = (vizNode.getChildren() ?? []).filter((child) => !child.data.isPlaceholder);
  const hasRealChildren = children.length > 0;

  if (vizNode.data.isGroup && hasRealChildren) {
    for (const child of children) {
      await walkRouteStepsAsync(child, visitStep);
    }
    return;
  }

  await visitStep(vizNode);
};

export const collectTopologyEndpoints = async (vizNodes: IVisualizationNode[]): Promise<TopologyEndpointRegistry> => {
  const registry = createEmptyTopologyEndpointRegistry();

  for (const routeVizNode of vizNodes) {
    await walkRouteStepsAsync(routeVizNode, async (step) => {
      await recordTopologyStep(step, registry);
    });
  }

  return registry;
};
