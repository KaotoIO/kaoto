import { JSONSchema7, JSONSchema7Definition } from 'json-schema';

import { SchemaAnalysisReport } from '../models/datamapper/schema';
import { JsonSchemaMetadata } from './json-schema-document.model';
import { JsonSchemaDocumentUtilService } from './json-schema-document-util.service';
import { PathUtil } from './path-util';

/**
 * Represents a directed edge in the JSON Schema dependency graph.
 * Captures a `$ref` relationship from one schema to another.
 */
interface JsonSchemaDependencyEdge {
  /** Identifier of the schema containing the `$ref` */
  from: string;
  /** Identifier of the schema being referenced */
  to: string;
  /** The raw `$ref` string as it appears in the schema */
  ref: string;
  /** The JSON Pointer fragment after `#` (empty string if none) */
  localPart: string;
}

/**
 * A node in the JSON Schema dependency graph, representing a single schema file.
 * Tracks both outgoing (`$ref` this schema makes) and incoming (other schemas referencing this one) edges.
 */
interface JsonSchemaDependencyNode {
  /** Schema identifier (typically `$id` or file path) */
  identifier: string;
  /** File path of the schema */
  filePath: string;
  /** Edges for `$ref` values pointing from this schema to others */
  outbound: JsonSchemaDependencyEdge[];
  /** Edges for `$ref` values in other schemas pointing to this one */
  inbound: JsonSchemaDependencyEdge[];
}

/**
 * Describes a circular dependency cycle found among JSON Schema files.
 */
interface CircularChain {
  /** Ordered list of schema identifiers forming the cycle, with the first identifier repeated at the end */
  chain: string[];
}

/**
 * Three-color marking for DFS (Depth First Search) based cycle detection.
 * @see JsonSchemaAnalysisService.detectCircularDependencies
 */
enum DfsMarker {
  /** Not yet visited */
  White,
  /** Currently on the DFS stack (descendants not fully processed) */
  Gray,
  /** Fully processed (all descendants visited) */
  Black,
}

/**
 * JSON-specific analysis report extending the common {@link SchemaAnalysisReport}.
 * Includes the full dependency graph, detected cycles, and categorized reference edges.
 */
export interface JsonSchemaAnalysisReport extends SchemaAnalysisReport {
  /** Dependency graph nodes keyed by schema identifier */
  nodes: Map<string, JsonSchemaDependencyNode>;
  /** All cross-schema dependency edges (excludes self-references) */
  edges: JsonSchemaDependencyEdge[];
  /** Circular dependency cycles detected via DFS */
  circularDependencies: CircularChain[];
  /** `$ref` values that could not be resolved to any known schema */
  missingReferences: JsonSchemaDependencyEdge[];
}

/**
 * Analyzes JSON Schema files to determine inter-file `$ref` dependencies,
 * detect circular references, and compute a valid loading order.
 *
 * @see JsonSchemaDocumentService.createJsonSchemaDocument
 */
export class JsonSchemaAnalysisService {
  /**
   * Analyzes dependency relationships among the provided JSON Schema metadata.
   * Builds a dependency graph from `$ref` values, detects circular dependencies,
   * identifies missing references, and produces a topologically sorted load order.
   * @param schemas - Parsed schema metadata objects to analyze
   * @param definitionFiles - Optional raw definition files for fallback resolution
   * @returns Analysis report with dependency graph, load order, and any errors/warnings
   */
  static analyze(schemas: JsonSchemaMetadata[], definitionFiles?: Record<string, string>): JsonSchemaAnalysisReport {
    const { nodes, edges, missingReferences } = JsonSchemaAnalysisService.buildDependencyGraph(
      schemas,
      definitionFiles,
    );
    const circularDependencies = JsonSchemaAnalysisService.detectCircularDependencies(nodes);
    const loadOrder = JsonSchemaAnalysisService.computeLoadingOrder(nodes, circularDependencies);

    const warnings: string[] = [];
    for (const cycle of circularDependencies) {
      warnings.push(`Circular dependency detected: ${cycle.chain.join(' → ')}`);
    }

    const errors: string[] = [];
    for (const missing of missingReferences) {
      errors.push(`Missing schema reference: '${missing.ref}' referenced from '${missing.from}' could not be resolved`);
    }

    return {
      nodes,
      edges,
      loadOrder,
      circularDependencies,
      missingReferences,
      warnings,
      errors,
    };
  }

  /**
   * Convenience method that parses raw JSON Schema file contents and then analyzes their dependencies.
   * @param definitionFiles - Map of file paths to JSON Schema content strings
   * @returns Analysis report with dependency graph, load order, and any errors/warnings
   */
  static analyzeFromDefinitionFiles(definitionFiles: Record<string, string>): JsonSchemaAnalysisReport {
    const schemas: JsonSchemaMetadata[] = [];
    for (const [filePath, content] of Object.entries(definitionFiles)) {
      schemas.push(JsonSchemaDocumentUtilService.parseJsonSchema(content, filePath));
    }
    return JsonSchemaAnalysisService.analyze(schemas, definitionFiles);
  }

  /**
   * Recursively extracts all `$ref` strings from a JSON Schema object.
   * Traverses properties, items, definitions, composition keywords, and conditionals.
   * @param schema - The JSON Schema to extract `$ref` values from
   * @returns Array of raw `$ref` strings found in the schema
   */
  static extractRefs(schema: JSONSchema7): string[] {
    const result: string[] = [];
    const visited = new Set<object>();
    JsonSchemaAnalysisService.collectRefs(schema, visited, result);
    return result;
  }

  private static collectRefs(
    node: JSONSchema7 | JSONSchema7Definition | undefined,
    visited: Set<object>,
    result: string[],
  ): void {
    if (node === undefined || node === null || typeof node === 'boolean') {
      return;
    }

    if (visited.has(node)) {
      return;
    }
    visited.add(node);

    if (node.$ref) {
      result.push(node.$ref);
    }

    JsonSchemaAnalysisService.collectRefsFromProperties(node, visited, result);
    JsonSchemaAnalysisService.collectRefsFromItems(node, visited, result);
    JsonSchemaAnalysisService.collectRefsFromCompositions(node, visited, result);
    JsonSchemaAnalysisService.collectRefsFromSubSchemas(node, visited, result);
    JsonSchemaAnalysisService.collectRefsFromGuarded(node, visited, result);
  }

  private static collectRefsFromProperties(node: JSONSchema7, visited: Set<object>, result: string[]): void {
    const maps = [
      node.properties,
      node.definitions,
      node.$defs as Record<string, JSONSchema7Definition>,
      node.patternProperties,
    ];
    for (const map of maps) {
      if (map) {
        for (const value of Object.values(map)) {
          JsonSchemaAnalysisService.collectRefs(value, visited, result);
        }
      }
    }
  }

  private static collectRefsFromItems(node: JSONSchema7, visited: Set<object>, result: string[]): void {
    if (!node.items) {
      return;
    }
    if (Array.isArray(node.items)) {
      for (const item of node.items) {
        JsonSchemaAnalysisService.collectRefs(item, visited, result);
      }
    } else {
      JsonSchemaAnalysisService.collectRefs(node.items, visited, result);
    }
  }

  private static collectRefsFromCompositions(node: JSONSchema7, visited: Set<object>, result: string[]): void {
    const arrays = [node.allOf, node.anyOf, node.oneOf];
    for (const arr of arrays) {
      if (arr) {
        for (const sub of arr) {
          JsonSchemaAnalysisService.collectRefs(sub, visited, result);
        }
      }
    }
  }

  private static collectRefsFromSubSchemas(node: JSONSchema7, visited: Set<object>, result: string[]): void {
    const subSchemas = [node.not, node.if, node.then, node.else, node.contains];
    for (const sub of subSchemas) {
      if (sub) {
        JsonSchemaAnalysisService.collectRefs(sub, visited, result);
      }
    }
  }

  private static collectRefsFromGuarded(node: JSONSchema7, visited: Set<object>, result: string[]): void {
    if (node.additionalProperties && typeof node.additionalProperties !== 'boolean') {
      JsonSchemaAnalysisService.collectRefs(node.additionalProperties, visited, result);
    }
    if (node.additionalItems && typeof node.additionalItems !== 'boolean') {
      JsonSchemaAnalysisService.collectRefs(node.additionalItems, visited, result);
    }
  }

  private static buildDependencyGraph(
    schemas: JsonSchemaMetadata[],
    definitionFiles?: Record<string, string>,
  ): {
    nodes: Map<string, JsonSchemaDependencyNode>;
    edges: JsonSchemaDependencyEdge[];
    missingReferences: JsonSchemaDependencyEdge[];
  } {
    const nodes = new Map<string, JsonSchemaDependencyNode>();
    const edges: JsonSchemaDependencyEdge[] = [];
    const missingReferences: JsonSchemaDependencyEdge[] = [];

    const schemasByIdentifier = new Map<string, JsonSchemaMetadata>();
    const schemasByFilePath = new Map<string, JsonSchemaMetadata>();

    for (const schema of schemas) {
      schemasByIdentifier.set(schema.identifier, schema);
      schemasByFilePath.set(schema.filePath, schema);

      nodes.set(schema.identifier, {
        identifier: schema.identifier,
        filePath: schema.filePath,
        outbound: [],
        inbound: [],
      });
    }

    for (const schema of schemas) {
      const refs = JsonSchemaAnalysisService.extractRefs(schema);

      for (const ref of refs) {
        const [schemaPart, fragment] = ref.split('#');
        const localPart = fragment || '';

        if (!schemaPart || schemaPart === '') {
          continue;
        }

        const targetId = JsonSchemaAnalysisService.resolveRefTarget(
          schemaPart,
          schema,
          schemasByIdentifier,
          schemasByFilePath,
          definitionFiles,
        );

        if (targetId === null) {
          missingReferences.push({ from: schema.identifier, to: schemaPart, ref, localPart });
          continue;
        }

        if (targetId === schema.identifier) {
          continue;
        }

        JsonSchemaAnalysisService.registerEdge({ from: schema.identifier, to: targetId, ref, localPart }, nodes, edges);
      }
    }

    return { nodes, edges, missingReferences };
  }

  private static registerEdge(
    edge: JsonSchemaDependencyEdge,
    nodes: Map<string, JsonSchemaDependencyNode>,
    edges: JsonSchemaDependencyEdge[],
  ): void {
    edges.push(edge);
    const sourceNode = nodes.get(edge.from);
    if (sourceNode) {
      sourceNode.outbound.push(edge);
    }
    const targetNode = nodes.get(edge.to);
    if (targetNode) {
      targetNode.inbound.push(edge);
    }
  }

  private static resolveRefTarget(
    schemaPart: string,
    sourceSchema: JsonSchemaMetadata,
    schemasByIdentifier: Map<string, JsonSchemaMetadata>,
    schemasByFilePath: Map<string, JsonSchemaMetadata>,
    definitionFiles?: Record<string, string>,
  ): string | null {
    const direct = JsonSchemaAnalysisService.lookupSchemaIdentifier(schemaPart, schemasByIdentifier, schemasByFilePath);
    if (direct) return direct;

    const resolvedPath = JsonSchemaAnalysisService.resolvePath(schemaPart, sourceSchema.filePath);
    if (resolvedPath !== schemaPart) {
      const resolved = JsonSchemaAnalysisService.lookupSchemaIdentifier(
        resolvedPath,
        schemasByIdentifier,
        schemasByFilePath,
      );
      if (resolved) return resolved;
    }

    const normalizedPath = PathUtil.normalizePath(schemaPart);
    if (normalizedPath !== schemaPart) {
      const normalized = JsonSchemaAnalysisService.lookupSchemaIdentifier(
        normalizedPath,
        schemasByIdentifier,
        schemasByFilePath,
      );
      if (normalized) return normalized;
    }

    const filename = PathUtil.extractFilename(schemaPart);
    const byFilename = JsonSchemaAnalysisService.lookupByFilename(filename, schemasByFilePath);
    if (byFilename) return byFilename;

    return JsonSchemaAnalysisService.lookupInDefinitionFiles(
      schemaPart,
      resolvedPath,
      normalizedPath,
      filename,
      definitionFiles,
    );
  }

  private static lookupSchemaIdentifier(
    candidate: string,
    schemasByIdentifier: Map<string, JsonSchemaMetadata>,
    schemasByFilePath: Map<string, JsonSchemaMetadata>,
  ): string | null {
    if (schemasByIdentifier.has(candidate)) {
      return schemasByIdentifier.get(candidate)!.identifier;
    }
    if (schemasByFilePath.has(candidate)) {
      return schemasByFilePath.get(candidate)!.identifier;
    }
    return null;
  }

  private static lookupByFilename(filename: string, schemasByFilePath: Map<string, JsonSchemaMetadata>): string | null {
    for (const schema of schemasByFilePath.values()) {
      if (PathUtil.extractFilename(schema.filePath) === filename) {
        return schema.identifier;
      }
    }
    return null;
  }

  private static lookupInDefinitionFiles(
    schemaPart: string,
    resolvedPath: string,
    normalizedPath: string,
    filename: string,
    definitionFiles?: Record<string, string>,
  ): string | null {
    if (!definitionFiles) return null;

    if (definitionFiles[schemaPart] !== undefined) return schemaPart;
    if (resolvedPath !== schemaPart && definitionFiles[resolvedPath] !== undefined) return resolvedPath;
    if (normalizedPath !== schemaPart && definitionFiles[normalizedPath] !== undefined) return normalizedPath;

    for (const path of Object.keys(definitionFiles)) {
      if (PathUtil.extractFilename(path) === filename) {
        return path;
      }
    }
    return null;
  }

  private static detectCircularDependencies(nodes: Map<string, JsonSchemaDependencyNode>): CircularChain[] {
    const color = new Map<string, DfsMarker>();
    for (const id of nodes.keys()) {
      color.set(id, DfsMarker.White);
    }

    const cycles: CircularChain[] = [];
    const path: string[] = [];

    for (const id of nodes.keys()) {
      if (color.get(id) === DfsMarker.White) {
        JsonSchemaAnalysisService.dfsVisit(id, nodes, color, path, cycles);
      }
    }

    return cycles;
  }

  private static dfsVisit(
    nodeId: string,
    nodes: Map<string, JsonSchemaDependencyNode>,
    color: Map<string, DfsMarker>,
    path: string[],
    cycles: CircularChain[],
  ): void {
    color.set(nodeId, DfsMarker.Gray);
    path.push(nodeId);

    const node = nodes.get(nodeId);
    if (node) {
      const visitedNeighbors = new Set<string>();
      for (const edge of node.outbound) {
        if (visitedNeighbors.has(edge.to)) {
          continue;
        }
        visitedNeighbors.add(edge.to);

        const neighborColor = color.get(edge.to);
        if (neighborColor === DfsMarker.Gray) {
          const cycleStart = path.indexOf(edge.to);
          const chain = [...path.slice(cycleStart), edge.to];
          cycles.push({ chain });
        } else if (neighborColor === DfsMarker.White) {
          JsonSchemaAnalysisService.dfsVisit(edge.to, nodes, color, path, cycles);
        }
      }
    }

    path.pop();
    color.set(nodeId, DfsMarker.Black);
  }

  private static computeLoadingOrder(
    nodes: Map<string, JsonSchemaDependencyNode>,
    circularDependencies: CircularChain[],
  ): string[] {
    if (nodes.size === 0) {
      return [];
    }

    const dependencyCount = JsonSchemaAnalysisService.initializeDependencyCounts(nodes);
    const queue = JsonSchemaAnalysisService.collectInitialQueue(dependencyCount);
    const result: string[] = [];
    const processed = new Set<string>();

    while (result.length < nodes.size) {
      if (queue.length === 0) {
        JsonSchemaAnalysisService.breakDeadlock(queue, processed, circularDependencies, nodes);
      }

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (!processed.has(current)) {
          JsonSchemaAnalysisService.processQueuedNode(current, nodes, processed, dependencyCount, queue, result);
        }
      }
    }

    return result;
  }

  private static initializeDependencyCounts(nodes: Map<string, JsonSchemaDependencyNode>): Map<string, number> {
    const dependencyCount = new Map<string, number>();
    for (const node of nodes.values()) {
      const countedTargets = new Set<string>();
      for (const edge of node.outbound) {
        if (!countedTargets.has(edge.to) && nodes.has(edge.to)) {
          countedTargets.add(edge.to);
        }
      }
      dependencyCount.set(node.identifier, countedTargets.size);
    }
    return dependencyCount;
  }

  private static collectInitialQueue(dependencyCount: Map<string, number>): string[] {
    const queue: string[] = [];
    for (const [id, count] of dependencyCount.entries()) {
      if (count === 0) {
        queue.push(id);
      }
    }
    return queue;
  }

  private static breakDeadlock(
    queue: string[],
    processed: Set<string>,
    circularDependencies: CircularChain[],
    nodes: Map<string, JsonSchemaDependencyNode>,
  ): void {
    for (const cycle of circularDependencies) {
      for (const nodeId of cycle.chain) {
        if (!processed.has(nodeId)) {
          queue.push(nodeId);
          return;
        }
      }
    }

    for (const id of nodes.keys()) {
      if (!processed.has(id)) {
        queue.push(id);
        return;
      }
    }
  }

  private static processQueuedNode(
    current: string,
    nodes: Map<string, JsonSchemaDependencyNode>,
    processed: Set<string>,
    dependencyCount: Map<string, number>,
    queue: string[],
    result: string[],
  ): void {
    processed.add(current);
    result.push(current);

    const node = nodes.get(current);
    if (!node) return;

    const decrementedSources = new Set<string>();
    for (const edge of node.inbound) {
      if (!decrementedSources.has(edge.from) && !processed.has(edge.from) && nodes.has(edge.from)) {
        decrementedSources.add(edge.from);
        const newCount = (dependencyCount.get(edge.from) || 1) - 1;
        dependencyCount.set(edge.from, newCount);
        if (newCount === 0) {
          queue.push(edge.from);
        }
      }
    }
  }

  private static resolvePath(schemaLocation: string, baseUri: string): string {
    if (PathUtil.isAbsolutePath(schemaLocation)) {
      return schemaLocation;
    }

    const baseDir = PathUtil.extractDirectory(baseUri);
    if (!baseDir) {
      return schemaLocation;
    }

    const combined = `${baseDir}/${schemaLocation}`;
    return PathUtil.normalizePath(combined);
  }
}
