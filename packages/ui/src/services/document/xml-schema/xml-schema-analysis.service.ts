import { ReportMessage, SchemaAnalysisReport } from '../../../models/datamapper/schema';
import { NS_XML_SCHEMA } from '../../../models/datamapper/standard-namespaces';
import { XmlSchemaParticle } from '../../../xml-schema-ts/particle/XmlSchemaParticle';
import { PathUtil } from '../../path-util';
import { stronglyConnectedComponents } from './graph-util';

interface SchemaDirective {
  type: 'include' | 'import';
  schemaLocation: string;
  namespace: string | null;
}

interface SchemaFileInfo {
  filePath: string;
  targetNamespace: string | null;
  directives: SchemaDirective[];
}

interface MalformedOccurrence {
  component: string;
  attribute: 'minOccurs' | 'maxOccurs';
  value: string;
}

const OCCURRENCE_PARTICLES = new Set(['element', 'all', 'any', 'choice', 'sequence']);

const UNREAD_SUBTREES = new Set(['annotation', 'override', 'alternative']);

export interface DependencyEdge {
  from: string;
  to: string;
  directive: SchemaDirective;
}

/**
 * XML-specific analysis report extending the common {@link SchemaAnalysisReport}.
 * Includes parsed schema file metadata and dependency edges for internal use.
 */
export interface XmlSchemaAnalysisReport extends SchemaAnalysisReport {
  fileInfos: Map<string, SchemaFileInfo>;
  edges: DependencyEdge[];
}

/**
 * Analyzes XML Schema (XSD) files to determine inter-file dependencies,
 * detect circular includes, and compute a valid loading order. It also reports malformed `minOccurs` /
 * `maxOccurs` values as warnings, because each file is parsed here exactly once.
 *
 * @see XmlSchemaDocumentService.createXmlSchemaDocument
 */
export class XmlSchemaAnalysisService {
  /**
   * Analyzes dependency relationships among the provided XML Schema files.
   * Parses `xs:include` and `xs:import` directives, resolves schema locations,
   * detects circular `xs:include` chains, and produces a topologically sorted load order. A `minOccurs` or
   * `maxOccurs` value that {@link XmlSchemaParticle.parseMinOccurs} / {@link XmlSchemaParticle.parseMaxOccurs}
   * rejects, on a component the schema parser reads it from, is reported as one warning; the parser then
   * uses the default `1`.
   * @param definitionFiles - Map of file paths to XML Schema content strings
   * @returns Analysis report with load order, dependency edges, and any errors and warnings
   */
  static analyze(definitionFiles: Record<string, string>): XmlSchemaAnalysisReport {
    const fileInfos = new Map<string, SchemaFileInfo>();
    const edges: DependencyEdge[] = [];
    const errors: ReportMessage[] = [];
    const malformedOccurrenceWarnings: ReportMessage[] = [];

    for (const [filePath, content] of Object.entries(definitionFiles)) {
      const { info, parseError, malformedOccurrences } = XmlSchemaAnalysisService.parseSchemaFileInfo(
        filePath,
        content,
      );
      fileInfos.set(filePath, info);
      if (parseError) {
        errors.push({ message: parseError, filePath });
      }
      for (const { component, attribute, value } of malformedOccurrences) {
        malformedOccurrenceWarnings.push({
          message: `Invalid ${attribute} value "${value}" on ${component}; the default 1 is used.`,
          filePath,
        });
      }
    }

    for (const [filePath, info] of fileInfos) {
      for (const directive of info.directives) {
        const resolvedPath = XmlSchemaAnalysisService.resolveSchemaLocation(
          directive.schemaLocation,
          filePath,
          definitionFiles,
        );
        if (resolvedPath) {
          edges.push({ from: filePath, to: resolvedPath, directive });
        } else {
          errors.push({
            message: `Missing required schema: "${directive.schemaLocation}" referenced by "${filePath}" via xs:${directive.type}`,
            filePath,
          });
        }
      }
    }

    const circularIncludeWarnings = XmlSchemaAnalysisService.detectCircularIncludes(fileInfos, edges);

    const warnings = XmlSchemaAnalysisService.detectCircularImports(fileInfos, edges);
    warnings.push(...circularIncludeWarnings);

    const includeNsErrors = XmlSchemaAnalysisService.validateIncludeNamespaces(fileInfos, edges);
    errors.push(...includeNsErrors);

    const importNsErrors = XmlSchemaAnalysisService.validateImportNamespaces(fileInfos, edges);
    errors.push(...importNsErrors);

    const duplicateNsWarnings = XmlSchemaAnalysisService.detectDuplicateTargetNamespaces(fileInfos, edges);
    warnings.push(...duplicateNsWarnings, ...malformedOccurrenceWarnings);

    const loadOrder = XmlSchemaAnalysisService.topologicalSort(Object.keys(definitionFiles), edges);

    return { fileInfos, edges, errors, warnings, loadOrder };
  }

  /**
   * Builds the forward `from -> to` adjacency of the dependency edges, optionally limited to one directive type.
   */
  private static buildSuccessors(edges: DependencyEdge[], type?: SchemaDirective['type']): Map<string, string[]> {
    const successors = new Map<string, string[]>();
    for (const edge of edges) {
      if (type && edge.directive.type !== type) continue;
      const list = successors.get(edge.from) ?? [];
      list.push(edge.to);
      successors.set(edge.from, list);
    }
    return successors;
  }

  private static parseSchemaFileInfo(
    filePath: string,
    content: string,
  ): { info: SchemaFileInfo; parseError: string | null; malformedOccurrences: MalformedOccurrence[] } {
    const directives: SchemaDirective[] = [];
    const malformedOccurrences: MalformedOccurrence[] = [];
    let targetNamespace: string | null = null;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/xml');
      const root = doc.documentElement;

      if (root.nodeName === 'parsererror' || root.getElementsByTagName('parsererror').length > 0) {
        const message = root.textContent?.trim() || 'Unknown XML parse error';
        return {
          info: { filePath, targetNamespace, directives },
          parseError: `XML parse error in "${filePath}": ${message}`,
          malformedOccurrences,
        };
      }

      targetNamespace = root.getAttribute('targetNamespace') || null;
      XmlSchemaAnalysisService.collectMalformedOccurrences(root, malformedOccurrences);

      for (const child of Array.from(root.children)) {
        const localName = child.localName;
        if (localName === 'include') {
          const schemaLocation = child.getAttribute('schemaLocation');
          if (schemaLocation) {
            directives.push({ type: 'include', schemaLocation, namespace: null });
          }
        } else if (localName === 'import') {
          const schemaLocation = child.getAttribute('schemaLocation');
          if (schemaLocation) {
            const ns = child.getAttribute('namespace') || null;
            directives.push({ type: 'import', schemaLocation, namespace: ns });
          }
        }
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return {
        info: { filePath, targetNamespace, directives },
        parseError: `XML parse error in "${filePath}": ${message}`,
        malformedOccurrences,
      };
    }

    return { info: { filePath, targetNamespace, directives }, parseError: null, malformedOccurrences };
  }

  private static collectMalformedOccurrences(parent: Element, found: MalformedOccurrence[]): void {
    for (const child of Array.from(parent.children)) {
      if (child.namespaceURI !== NS_XML_SCHEMA || UNREAD_SUBTREES.has(child.localName)) continue;
      if (parent.localName === 'all' && child.localName !== 'element') continue;
      if (parent.localName === 'redefine' && child.localName === 'element') continue;
      if (XmlSchemaAnalysisService.isOccurrenceParticle(child)) {
        XmlSchemaAnalysisService.checkOccurrence(child, 'minOccurs', found);
        XmlSchemaAnalysisService.checkOccurrence(child, 'maxOccurs', found);
      }
      XmlSchemaAnalysisService.collectMalformedOccurrences(child, found);
    }
  }

  private static isOccurrenceParticle(el: Element): boolean {
    if (el.localName === 'group') {
      return el.hasAttribute('ref');
    }
    return OCCURRENCE_PARTICLES.has(el.localName);
  }

  private static checkOccurrence(
    el: Element,
    attribute: MalformedOccurrence['attribute'],
    found: MalformedOccurrence[],
  ): void {
    const attr = el.getAttributeNode(attribute);
    if (!attr) return;
    const parsed =
      attribute === 'maxOccurs'
        ? XmlSchemaParticle.parseMaxOccurs(attr.value)
        : XmlSchemaParticle.parseMinOccurs(attr.value);
    if (parsed === null) {
      found.push({ component: XmlSchemaAnalysisService.describeComponent(el), attribute, value: attr.value });
    }
  }

  private static describeComponent(el: Element): string {
    const name = el.getAttribute('name');
    if (name) {
      return `xs:${el.localName} name="${name}"`;
    }
    const ref = el.getAttribute('ref');
    if (ref) {
      return `xs:${el.localName} ref="${ref}"`;
    }
    return `xs:${el.localName}`;
  }

  private static resolveSchemaLocation(
    schemaLocation: string,
    sourceFilePath: string,
    definitionFiles: Record<string, string>,
  ): string | null {
    if (schemaLocation in definitionFiles) {
      return schemaLocation;
    }

    const baseDir = PathUtil.extractDirectory(sourceFilePath);
    if (baseDir) {
      const resolvedPath = PathUtil.normalizePath(`${baseDir}/${schemaLocation}`);
      if (resolvedPath in definitionFiles) {
        return resolvedPath;
      }
    }

    const normalizedPath = PathUtil.normalizePath(schemaLocation);
    if (normalizedPath !== schemaLocation && normalizedPath in definitionFiles) {
      return normalizedPath;
    }

    const filename = PathUtil.extractFilename(schemaLocation);
    const matches: string[] = [];
    for (const path of Object.keys(definitionFiles)) {
      if (PathUtil.extractFilename(path) === filename) {
        matches.push(path);
      }
    }
    if (matches.length === 1) {
      return matches[0];
    }

    return null;
  }

  private static formatIncludeCycleFrom(start: string, cycleBody: string[]): string {
    const startIndex = cycleBody.indexOf(start);
    const rotated = [...cycleBody.slice(startIndex), ...cycleBody.slice(0, startIndex), start];
    return rotated.join('->');
  }

  private static getIncludeCycleKey(cycleBody: string[]): string {
    if (cycleBody.length === 0) {
      return '';
    }

    const rotations = cycleBody.map((_node, index) => {
      const rotated = [...cycleBody.slice(index), ...cycleBody.slice(0, index)];
      return rotated.join('->');
    });

    return rotations.slice().sort((a, b) => a.localeCompare(b))[0];
  }

  private static detectCircularIncludes(
    fileInfos: Map<string, SchemaFileInfo>,
    edges: DependencyEdge[],
  ): ReportMessage[] {
    const includeAdj = XmlSchemaAnalysisService.buildSuccessors(edges, 'include');

    const warnings: ReportMessage[] = [];
    const reportedCycles = new Set<string>();
    const visited = new Set<string>();
    const inStack = new Set<string>();
    const stack: string[] = [];

    const reportCycle = (cycleBody: string[]) => {
      const cycleKey = XmlSchemaAnalysisService.getIncludeCycleKey(cycleBody);
      if (!cycleKey || reportedCycles.has(cycleKey)) {
        return;
      }

      reportedCycles.add(cycleKey);
      for (const filePath of cycleBody) {
        warnings.push({
          filePath,
          message: `Circular xs:include detected: ${XmlSchemaAnalysisService.formatIncludeCycleFrom(filePath, cycleBody)}`,
        });
      }
    };

    const dfs = (node: string) => {
      visited.add(node);
      inStack.add(node);
      stack.push(node);

      for (const neighbor of includeAdj.get(node) ?? []) {
        if (inStack.has(neighbor)) {
          const cycleStart = stack.indexOf(neighbor);
          const cycleBody = stack.slice(cycleStart);
          reportCycle(cycleBody);
        } else if (!visited.has(neighbor)) {
          dfs(neighbor);
        }
      }

      stack.pop();
      inStack.delete(node);
    };

    for (const filePath of fileInfos.keys()) {
      if (!visited.has(filePath)) {
        dfs(filePath);
      }
    }

    return warnings;
  }

  private static detectCircularImports(
    fileInfos: Map<string, SchemaFileInfo>,
    edges: DependencyEdge[],
  ): ReportMessage[] {
    const importAdj = XmlSchemaAnalysisService.buildSuccessors(edges, 'import');

    const warnings: ReportMessage[] = [];
    const visited = new Set<string>();
    const inStack = new Set<string>();
    const stack: string[] = [];

    const dfs = (node: string) => {
      visited.add(node);
      inStack.add(node);
      stack.push(node);

      for (const neighbor of importAdj.get(node) ?? []) {
        if (inStack.has(neighbor)) {
          const cycleStart = stack.indexOf(neighbor);
          const cycle = stack.slice(cycleStart);
          cycle.push(neighbor);
          const circularImport = cycle.map((p) => `"${p}"`).join(' -> ');
          warnings.push({ message: `Circular xs:import detected: ${circularImport}` });
        } else if (!visited.has(neighbor)) {
          dfs(neighbor);
        }
      }

      stack.pop();
      inStack.delete(node);
    };

    for (const filePath of fileInfos.keys()) {
      if (!visited.has(filePath)) {
        dfs(filePath);
      }
    }

    return warnings;
  }

  private static validateIncludeNamespaces(
    fileInfos: Map<string, SchemaFileInfo>,
    edges: DependencyEdge[],
  ): ReportMessage[] {
    const errors: ReportMessage[] = [];
    for (const edge of edges) {
      if (edge.directive.type !== 'include') {
        continue;
      }
      const parentInfo = fileInfos.get(edge.from);
      const includedInfo = fileInfos.get(edge.to);
      if (!parentInfo || !includedInfo) {
        continue;
      }
      if (includedInfo.targetNamespace === null) {
        continue;
      }
      if (includedInfo.targetNamespace !== parentInfo.targetNamespace) {
        const parentNs = parentInfo.targetNamespace ?? '(no targetNamespace)';
        const includedNs = includedInfo.targetNamespace;
        errors.push({
          message:
            `Namespace mismatch in xs:include: "${edge.from}" (targetNamespace: ${parentNs})` +
            ` includes "${edge.to}" (targetNamespace: ${includedNs}).` +
            ` Included schemas must have the same targetNamespace or no targetNamespace (chameleon include).`,
          filePath: edge.from,
        });
      }
    }
    return errors;
  }

  private static validateImportNamespaces(
    fileInfos: Map<string, SchemaFileInfo>,
    edges: DependencyEdge[],
  ): ReportMessage[] {
    const errors: ReportMessage[] = [];
    for (const edge of edges) {
      if (edge.directive.type !== 'import') {
        continue;
      }
      const importedInfo = fileInfos.get(edge.to);
      if (!importedInfo) {
        continue;
      }
      const declaredNs = edge.directive.namespace;
      const actualNs = importedInfo.targetNamespace;
      if (declaredNs === actualNs) {
        continue;
      }
      const declaredLabel = declaredNs ?? '(no namespace)';
      const actualLabel = actualNs ?? '(no targetNamespace)';
      errors.push({
        message:
          `Namespace mismatch in xs:import: "${edge.from}" declares namespace ${declaredLabel}` +
          ` but "${edge.to}" has targetNamespace ${actualLabel}`,
        filePath: edge.from,
      });
    }
    return errors;
  }

  private static detectDuplicateTargetNamespaces(
    fileInfos: Map<string, SchemaFileInfo>,
    edges: DependencyEdge[],
  ): ReportMessage[] {
    const includeTargets = new Set(edges.filter((e) => e.directive.type === 'include').map((e) => e.to));
    const includeEdges = edges.filter((e) => e.directive.type === 'include');

    const nsByNamespace = new Map<string, string[]>();
    for (const [filePath, info] of fileInfos) {
      if (info.targetNamespace === null) {
        continue;
      }
      if (includeTargets.has(filePath)) {
        continue;
      }
      const files = nsByNamespace.get(info.targetNamespace) ?? [];
      files.push(filePath);
      nsByNamespace.set(info.targetNamespace, files);
    }

    const warnings: ReportMessage[] = [];
    const reportDuplicate = (ns: string, files: string[]) => {
      for (const file of files) {
        const fileList = files
          .filter((f) => f !== file)
          .map((f) => `"${f}"`)
          .join(', ');
        warnings.push({
          message: `Multiple schemas share targetNamespace "${ns}": ${fileList}`,
          filePath: file,
        });
      }
    };

    for (const [ns, files] of nsByNamespace) {
      if (files.length <= 1) continue;

      const allFilesWithNs = new Set<string>();
      for (const [fp, info] of fileInfos) {
        if (info.targetNamespace === ns) allFilesWithNs.add(fp);
      }
      const connectedViaIncludes = includeEdges.some((e) => allFilesWithNs.has(e.from) && allFilesWithNs.has(e.to));
      if (connectedViaIncludes) continue;

      reportDuplicate(ns, files);
    }
    return warnings;
  }

  private static buildAdjacency(
    filePaths: string[],
    edges: DependencyEdge[],
  ): { inDegree: Map<string, number>; adj: Map<string, string[]> } {
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();

    for (const path of filePaths) {
      inDegree.set(path, 0);
      adj.set(path, []);
    }

    for (const edge of edges) {
      if (inDegree.has(edge.from) && inDegree.has(edge.to)) {
        adj.get(edge.to)!.push(edge.from);
        inDegree.set(edge.from, (inDegree.get(edge.from) ?? 0) + 1);
      }
    }

    return { inDegree, adj };
  }

  private static topologicalSort(filePaths: string[], edges: DependencyEdge[]): string[] {
    const { inDegree, adj } = XmlSchemaAnalysisService.buildAdjacency(filePaths, edges);

    const queue = Array.from(inDegree.entries())
      .filter(([_path, degree]) => degree === 0)
      .map(([path]) => path);

    const result: string[] = [];
    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);
      for (const neighbor of adj.get(node) ?? []) {
        const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    filePaths.filter((path) => !result.includes(path)).forEach((path) => result.push(path));

    return result;
  }

  /**
   * Finds the unreferenced schemas of the schema dependency graph: the files that no other file
   * references through `xs:include` / `xs:import`. Every other file is reachable from them.
   *
   * Files are grouped into strongly connected components first, so that an import or include cycle
   * yields a single unreferenced schema (the member that comes first in `fileInfos` order) instead of none.
   * A single unreferenced schema means the whole set is already one reachable graph.
   *
   * @param report - Analysis report produced by {@link XmlSchemaAnalysisService.analyze}
   * @returns Unreferenced schema file paths, in `fileInfos` (input) order
   */
  static findUnreferencedSchemas(report: Pick<XmlSchemaAnalysisReport, 'fileInfos' | 'edges'>): string[];
  /**
   * Finds unreferenced schemas given an explicit list of file paths and dependency edges.
   *
   * @param nodes - Schema file paths, in input order
   * @param edges - Include/import dependency edges
   * @returns Unreferenced schema file paths, in input order
   */
  static findUnreferencedSchemas(nodes: string[], edges: DependencyEdge[]): string[];
  static findUnreferencedSchemas(
    reportOrNodes: Pick<XmlSchemaAnalysisReport, 'fileInfos' | 'edges'> | string[],
    edges?: DependencyEdge[],
  ): string[] {
    if (Array.isArray(reportOrNodes)) {
      return XmlSchemaAnalysisService.computeUnreferencedSchemas(reportOrNodes, edges ?? []);
    }
    return XmlSchemaAnalysisService.computeUnreferencedSchemas(
      Array.from(reportOrNodes.fileInfos.keys()),
      reportOrNodes.edges,
    );
  }

  private static computeUnreferencedSchemas(nodes: string[], edges: DependencyEdge[]): string[] {
    const successorsOf = XmlSchemaAnalysisService.buildSuccessors(edges);
    const components = stronglyConnectedComponents(nodes, (node) => successorsOf.get(node) ?? []);
    const componentOf = new Map<string, number>();
    components.forEach((component, index) => {
      for (const node of component) componentOf.set(node, index);
    });

    const hasIncoming = new Set<number>();
    for (const edge of edges) {
      const from = componentOf.get(edge.from);
      const to = componentOf.get(edge.to);
      if (from !== undefined && to !== undefined && from !== to) {
        hasIncoming.add(to);
      }
    }

    const order = new Map(nodes.map((node, index) => [node, index]));
    const byInputOrder = (a: string, b: string) => (order.get(a) ?? 0) - (order.get(b) ?? 0);

    return components
      .filter((_component, index) => !hasIncoming.has(index))
      .map((component) => [...component].sort(byInputOrder)[0])
      .sort(byInputOrder);
  }
}
