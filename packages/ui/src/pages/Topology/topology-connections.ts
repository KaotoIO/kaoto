import { EdgeStyle } from '@patternfly/react-topology';

import { CanvasDefaults } from '../../components/Visualization/Canvas/canvas.defaults';
import { CanvasEdge, CanvasNode } from '../../components/Visualization/Canvas/canvas.models';
import { BaseVisualEntity } from '../../models/visualization/base-visual-entity';

export const EXTERNAL_ENDPOINT_NODE_TYPE = 'external-endpoint';
export const EXTERNAL_ENDPOINT_ID_PREFIX = 'external::';

export const DYNAMIC_ENDPOINT_NODE_TYPE = 'dynamic-endpoint';
export const DYNAMIC_ENDPOINT_ID_PREFIX = 'dynamic::';

const IN_VM_ENDPOINT_PREFIXES = ['direct:', 'seda:', 'vm:', 'direct-vm:'];

const PRODUCER_KEYS = ['to', 'toD', 'wireTap', 'enrich', 'pollEnrich'] as const;

const EXPRESSION_PATTERN = /\$\{[^}]+\}/;

const isDynamicUri = (uri: string): boolean => EXPRESSION_PATTERN.test(uri);

const normalizeEndpoint = (uri: string | undefined): string | undefined => {
  if (!uri) {
    return undefined;
  }
  const stripped = uri.split('?')[0];
  return IN_VM_ENDPOINT_PREFIXES.some((p) => stripped.startsWith(p)) ? stripped : undefined;
};

const getUri = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object') {
    const obj = value as { uri?: unknown; parameters?: { name?: unknown } };
    const rawUri = obj.uri;
    if (typeof rawUri === 'string') {
      // Camel allows `uri: direct` + `parameters.name: foo` as an equivalent of `uri: direct:foo`.
      // Compose the canonical form here so endpoint matching works for both spellings.
      if (!rawUri.includes(':')) {
        const name = obj.parameters?.name;
        if (typeof name === 'string') {
          return `${rawUri}:${name}`;
        }
      }
      return rawUri;
    }
  }
  return undefined;
};

interface RouteEndpoints {
  from?: string;
  outgoing: string[];
  /** URIs that contain a Camel expression like `${header.foo}` and can't be resolved at design time. */
  dynamic: string[];
}

const extractRouteEndpoints = (json: unknown): RouteEndpoints => {
  if (!json || typeof json !== 'object' || !('route' in json)) {
    return { outgoing: [], dynamic: [] };
  }
  const route = (json as { route?: { from?: unknown } }).route;
  const from = normalizeEndpoint(getUri(route?.from));
  const outgoing: string[] = [];
  const dynamic: string[] = [];

  const walk = (obj: unknown): void => {
    if (!obj || typeof obj !== 'object') {
      return;
    }
    if (Array.isArray(obj)) {
      obj.forEach(walk);
      return;
    }
    const record = obj as Record<string, unknown>;
    for (const key of PRODUCER_KEYS) {
      if (key in record) {
        const rawUri = getUri(record[key]);
        if (rawUri && isDynamicUri(rawUri)) {
          dynamic.push(rawUri);
        } else {
          const endpoint = normalizeEndpoint(rawUri);
          if (endpoint) {
            outgoing.push(endpoint);
          }
        }
      }
    }
    Object.values(record).forEach(walk);
  };

  walk(route);

  return { from, outgoing, dynamic };
};

export interface RouteConnectionExtras {
  edges: CanvasEdge[];
  externalNodes: CanvasNode[];
  dynamicNodes: CanvasNode[];
}

const buildSyntheticNode = (id: string, label: string, type: string, iconUrl: string | undefined): CanvasNode => {
  const node: CanvasNode = {
    id,
    type,
    label,
    width: CanvasDefaults.DEFAULT_NODE_WIDTH,
    height: CanvasDefaults.DEFAULT_NODE_HEIGHT,
  };
  if (iconUrl) {
    // CanvasNode['data'] is typed for vizNode-backed nodes; widen here so the renderer
    // can pull the icon URL out of the synthetic node's data.
    (node as { data?: Record<string, unknown> }).data = { iconUrl };
  }
  return node;
};

export const buildRouteConnectionExtras = (
  visualEntities: BaseVisualEntity[],
  entityToTopLevelId: Map<string, string>,
  endpointIconUrl?: string,
): RouteConnectionExtras => {
  const consumersByEndpoint = new Map<string, string[]>();
  const outgoingByEntity = new Map<string, string[]>();
  const dynamicByEntity = new Map<string, string[]>();

  visualEntities.forEach((entity) => {
    const { from, outgoing, dynamic } = extractRouteEndpoints(entity.toJSON());
    if (from) {
      const consumers = consumersByEndpoint.get(from) ?? [];
      consumers.push(entity.id);
      consumersByEndpoint.set(from, consumers);
    }
    if (outgoing.length > 0) {
      outgoingByEntity.set(entity.id, outgoing);
    }
    if (dynamic.length > 0) {
      dynamicByEntity.set(entity.id, dynamic);
    }
  });

  const edges: CanvasEdge[] = [];
  const seenEdges = new Set<string>();
  const externalNodes: CanvasNode[] = [];
  const seenExternals = new Set<string>();
  const dynamicNodes: CanvasNode[] = [];
  const seenDynamics = new Set<string>();

  const addEdge = (edge: CanvasEdge): void => {
    if (seenEdges.has(edge.id)) {
      return;
    }
    seenEdges.add(edge.id);
    edges.push(edge);
  };

  /** Add a synthetic node + dashed edge from the given producer (deduped by node id). */
  const addSyntheticEndpoint = (
    producerTop: string,
    label: string,
    idPrefix: string,
    nodeType: string,
    targetNodes: CanvasNode[],
    seenNodes: Set<string>,
  ): void => {
    const nodeId = `${idPrefix}${label}`;
    if (!seenNodes.has(nodeId)) {
      seenNodes.add(nodeId);
      targetNodes.push(buildSyntheticNode(nodeId, label, nodeType, endpointIconUrl));
    }
    addEdge({
      id: `${producerTop} >>> ${nodeId}`,
      type: 'edge',
      source: producerTop,
      target: nodeId,
      edgeStyle: EdgeStyle.dashed,
      label,
    });
  };

  outgoingByEntity.forEach((endpoints, producerId) => {
    const producerTop = entityToTopLevelId.get(producerId);
    if (!producerTop) {
      return;
    }
    endpoints.forEach((endpoint) => {
      const consumerIds = consumersByEndpoint.get(endpoint);

      // The endpoint is consumed somewhere in this file (possibly only by the producer itself).
      // Don't treat it as external; emit edges to any non-self consumer.
      if (consumerIds && consumerIds.length > 0) {
        consumerIds.forEach((consumerId) => {
          if (consumerId === producerId) {
            return;
          }
          const consumerTop = entityToTopLevelId.get(consumerId);
          if (!consumerTop) {
            return;
          }
          addEdge({
            id: `${producerTop} >>> ${consumerTop} :: ${endpoint}`,
            type: 'edge',
            source: producerTop,
            target: consumerTop,
            edgeStyle: EdgeStyle.solid,
            label: endpoint,
          });
        });
        return;
      }

      // No consumer in this file → render a synthetic external endpoint node.
      addSyntheticEndpoint(
        producerTop,
        endpoint,
        EXTERNAL_ENDPOINT_ID_PREFIX,
        EXTERNAL_ENDPOINT_NODE_TYPE,
        externalNodes,
        seenExternals,
      );
    });
  });

  dynamicByEntity.forEach((uris, producerId) => {
    const producerTop = entityToTopLevelId.get(producerId);
    if (!producerTop) {
      return;
    }
    uris.forEach((uri) => {
      addSyntheticEndpoint(
        producerTop,
        uri,
        DYNAMIC_ENDPOINT_ID_PREFIX,
        DYNAMIC_ENDPOINT_NODE_TYPE,
        dynamicNodes,
        seenDynamics,
      );
    });
  });

  return { edges, externalNodes, dynamicNodes };
};
