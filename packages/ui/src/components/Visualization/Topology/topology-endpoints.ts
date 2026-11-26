import { DynamicCatalogRegistry } from '../../../dynamic-catalog';
import { CatalogKind } from '../../../models/catalog-kind';
import { IVisualizationNode } from '../../../models/visualization/base-visual-entity';
import { CamelUriHelper, ParsedParameters } from '../../../utils/camel-uri-helper';
import { getValue } from '../../../utils/get-value';

export const TOPOLOGY_PRODUCER_KEYS = ['to', 'toD', 'wireTap'];

export const IN_VM_ENDPOINT_PREFIXES = ['direct:', 'seda:'];

/** The component a route starts with to offer itself as a tool to an AI model */
export const AI_TOOL_COMPONENT = 'ai-tool';

/** Components whose `tags` option offers the model every `ai-tool` route that shares one of the tags */
export const AI_TOOL_PRODUCER_COMPONENTS = ['openai', 'langchain4j-agent', 'spring-ai-chat'];

/** Prefix of the registry keys that link an AI step to the `ai-tool` routes of one tag */
export const AI_TOOL_TAG_KEY_PREFIX = 'ai-tool-tag:';

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

/**
 * The id of the edge from an agent route to an `ai-tool` route, apart from the id of an edge between the same routes
 * through an in-vm endpoint, so each keeps its own style and label
 */
export const getAiToolEdgeId = (source: string, target: string): string => `${source} >>> ${target} (ai-tool)`;

/** Returns the tag of an `ai-tool-tag:` registry key, or `undefined` for any other key */
export const getAiToolTagFromKey = (key: string): string | undefined =>
  key.startsWith(AI_TOOL_TAG_KEY_PREFIX) ? key.slice(AI_TOOL_TAG_KEY_PREFIX.length) : undefined;

/**
 * Splits a value on the commas that are outside braces, so a property placeholder such as
 * `{{tools.tags:{{fallback.tags}},billing}}` or an expression such as `${header.tags}` stays in one part.
 */
const splitOutsideBraces = (value: string): string[] => {
  const parts = [''];
  let depth = 0;
  for (const char of value) {
    if (char === '{') {
      depth++;
    } else if (char === '}') {
      depth = Math.max(depth - 1, 0);
    }

    if (char === ',' && depth === 0) {
      parts.push('');
    } else {
      parts[parts.length - 1] += char;
    }
  }

  return parts;
};

/**
 * Splits a comma-separated `tags` option into its tags.
 * A tag given as a property placeholder or an expression cannot be resolved in the editor, so it is left out,
 * together with any comma-separated default value of the placeholder.
 */
export const parseAiToolTags = (tags: unknown): string[] => {
  const value = typeof tags === 'number' || typeof tags === 'boolean' ? String(tags) : tags;
  if (typeof value !== 'string') {
    return [];
  }

  return splitOutsideBraces(value)
    .map((tag) => tag.trim())
    .filter((tag) => tag !== '' && !tag.includes('{') && !tag.includes('}'));
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

/** The `tags` option of a query string, as it is written: a parsed value would turn a tag such as `001` into `1` */
const getRawQueryTags = (queryString: string | undefined): string | undefined =>
  queryString
    ?.split('&')
    .find((option) => option.startsWith('tags='))
    ?.slice('tags='.length);

/** A value Camel takes as it is, without decoding it: `RAW(...)` or `RAW{...}` */
const RAW_VALUE = /^RAW[({](.*)[)}]$/s;

/** Reads the `tags` option from the step parameters, or else from the query string of its URI */
const getTagsOption = (uriString: string, nodeDefinition: unknown): unknown => {
  const parameters = getValue(nodeDefinition, 'parameters') as ParsedParameters | undefined;
  const queryStart = uriString.indexOf('?');
  const queryString = queryStart === -1 ? undefined : uriString.slice(queryStart + 1);
  const tags = parameters?.tags ?? getRawQueryTags(queryString);
  if (typeof tags !== 'string') {
    return tags;
  }

  const rawValue = RAW_VALUE.exec(tags);
  if (rawValue) {
    return rawValue[1];
  }

  /*
   * Camel decodes the options of the endpoint uri as a form does, which the parameters are added to as they are,
   * so `support%2Cbilling` holds two tags and `customer+support` is `customer support`.
   * The query string of a uri is moved to the parameters without decoding it.
   */
  try {
    return decodeURIComponent(tags.replace(/\+/g, ' '));
  } catch {
    return tags;
  }
};

/** A step that offers its route to AI models as a tool, or that gives an AI model the tools of its tags */
export interface AiToolStep {
  role: 'tool' | 'agent';
  tags: string[];
}

/**
 * Tells whether the step is a `from: ai-tool` step, which offers its route as a tool to the AI models that share one
 * of its tags, or an `AI_TOOL_PRODUCER_COMPONENTS` step, which gives its model the tools of its tags.
 */
export const getAiToolStep = (vizNode: IVisualizationNode): AiToolStep | undefined => {
  const uriString = CamelUriHelper.getUriString(vizNode.data.definition);
  if (!uriString) {
    return undefined;
  }

  const processorName = vizNode.data.primaryNodeId?.name as string;
  const [uriWithoutQuery] = uriString.split('?');
  const componentName = CamelUriHelper.getSyntaxWithoutSchema(uriWithoutQuery).schema;
  const tags = () => parseAiToolTags(getTagsOption(uriString, vizNode.data.definition));

  if (processorName === 'from' && componentName === AI_TOOL_COMPONENT) {
    return { role: 'tool', tags: tags() };
  }
  if (isTopologyProducer(processorName) && AI_TOOL_PRODUCER_COMPONENTS.includes(componentName)) {
    return { role: 'agent', tags: tags() };
  }
  return undefined;
};

/**
 * Records the tags of a `from: ai-tool` step as consumed keys of its route, and the tags of an
 * `AI_TOOL_PRODUCER_COMPONENTS` step as produced keys of its route, one `ai-tool-tag:<tag>` key per tag.
 *
 * @returns whether the step uses one of those components, and so cannot link to an in-vm endpoint
 */
const recordAiToolStep = (vizNode: IVisualizationNode, registry: TopologyEndpointRegistry): boolean => {
  const aiToolStep = getAiToolStep(vizNode);
  if (!aiToolStep) {
    return false;
  }

  const entityId = vizNode.getId() ?? vizNode.id;
  aiToolStep.tags.forEach((tag) => {
    const key = `${AI_TOOL_TAG_KEY_PREFIX}${tag}`;
    if (aiToolStep.role === 'tool') {
      appendMapValue(registry.consumersByEndpoint, key, entityId);
    } else {
      appendMapValue(registry.outgoingByEntity, entityId, key);
    }
  });

  return true;
};

const recordTopologyStep = async (vizNode: IVisualizationNode, registry: TopologyEndpointRegistry): Promise<void> => {
  const processorName = vizNode.data.primaryNodeId?.name;
  const nodeDefinition = vizNode.data.definition;
  const uriString = CamelUriHelper.getUriString(nodeDefinition);

  if (!uriString || recordAiToolStep(vizNode, registry)) {
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

/** The steps of a route, the containers excepted unless they are empty, without the placeholders */
export const getRouteSteps = (vizNode: IVisualizationNode): IVisualizationNode[] => {
  const children = (vizNode.getChildren() ?? []).filter((child) => !child.data.isPlaceholder);
  if (vizNode.data.isGroup && children.length > 0) {
    return children.flatMap(getRouteSteps);
  }

  return [vizNode];
};

export const collectTopologyEndpoints = async (vizNodes: IVisualizationNode[]): Promise<TopologyEndpointRegistry> => {
  const registry = createEmptyTopologyEndpointRegistry();

  for (const routeVizNode of vizNodes) {
    for (const step of getRouteSteps(routeVizNode)) {
      await recordTopologyStep(step, registry);
    }
  }

  return registry;
};
