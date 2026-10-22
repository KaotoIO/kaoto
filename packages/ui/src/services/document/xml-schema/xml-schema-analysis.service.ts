import { ReportMessage, SchemaAnalysisReport } from '../../../models/datamapper/schema';
import { PathUtil } from '../../path-util';

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

interface DependencyEdge {
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
 * detect circular includes, and compute a valid loading order.
 *
 * @see XmlSchemaDocumentService.createXmlSchemaDocument
 */
export class XmlSchemaAnalysisService {
  /**
   * Analyzes dependency relationships among the provided XML Schema files.
   * Parses `xs:include` and `xs:import` directives, resolves schema locations,
   * detects circular `xs:include` chains, and produces a topologically sorted load order.
   * @param definitionFiles - Map of file paths to XML Schema content strings
   * @returns Analysis report with load order, dependency edges, and any errors
   */
  static analyze(definitionFiles: Record<string, string>): XmlSchemaAnalysisReport {
    const fileInfos = new Map<string, SchemaFileInfo>();
    const edges: DependencyEdge[] = [];
    const errors: ReportMessage[] = [];

    for (const [filePath, content] of Object.entries(definitionFiles)) {
      const { info, parseError } = XmlSchemaAnalysisService.parseSchemaFileInfo(filePath, content);
      fileInfos.set(filePath, info);
      if (parseError) {
        errors.push({ message: parseError, filePath });
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
    warnings.push(...duplicateNsWarnings);

    const loadOrder = XmlSchemaAnalysisService.topologicalSort(Object.keys(definitionFiles), edges);

    return { fileInfos, edges, errors, warnings, loadOrder };
  }

  private static parseSchemaFileInfo(
    filePath: string,
    content: string,
  ): { info: SchemaFileInfo; parseError: string | null } {
    const directives: SchemaDirective[] = [];
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
        };
      }

      targetNamespace = root.getAttribute('targetNamespace') || null;

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
      };
    }

    return { info: { filePath, targetNamespace, directives }, parseError: null };
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
    const includeAdj = new Map<string, string[]>();
    for (const edge of edges) {
      if (edge.directive.type === 'include') {
        const neighbors = includeAdj.get(edge.from) ?? [];
        neighbors.push(edge.to);
        includeAdj.set(edge.from, neighbors);
      }
    }

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
    const importAdj = new Map<string, string[]>();
    for (const edge of edges) {
      if (edge.directive.type === 'import') {
        const neighbors = importAdj.get(edge.from) ?? [];
        neighbors.push(edge.to);
        importAdj.set(edge.from, neighbors);
      }
    }

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
   * Finds the entry points of the schema dependency graph: the files from which every other file
   * is reachable through `xs:include` / `xs:import`, and which nobody else references.
   *
   * Files are grouped into strongly connected components first, so that an import or include cycle
   * yields a single entry point (the member that comes first in `fileInfos` order) instead of none.
   * A single entry point means the whole set is already one reachable graph.
   *
   * @param report - Analysis report produced by {@link XmlSchemaAnalysisService.analyze}
   * @returns Entry point file paths, in `fileInfos` (input) order
   */
  static findEntryPoints(report: Pick<XmlSchemaAnalysisReport, 'fileInfos' | 'edges'>): string[] {
    return XmlSchemaAnalysisService.computeEntryPoints(Array.from(report.fileInfos.keys()), report.edges);
  }

  private static computeEntryPoints(nodes: string[], edges: DependencyEdge[]): string[] {
    const components = XmlSchemaAnalysisService.getStronglyConnectedComponents(nodes, edges);
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

  /** Tarjan's algorithm. Nodes that are not part of any cycle form singleton components. */
  private static getStronglyConnectedComponents(nodes: string[], edges: DependencyEdge[]): string[][] {
    const adj = new Map<string, string[]>(nodes.map((node) => [node, []]));
    for (const edge of edges) {
      if (adj.has(edge.from) && adj.has(edge.to)) {
        adj.get(edge.from)!.push(edge.to);
      }
    }

    const index = new Map<string, number>();
    const lowlink = new Map<string, number>();
    const onStack = new Set<string>();
    const stack: string[] = [];
    const components: string[][] = [];

    const strongConnect = (node: string) => {
      index.set(node, index.size);
      lowlink.set(node, index.get(node)!);
      stack.push(node);
      onStack.add(node);

      for (const next of adj.get(node)!) {
        if (!index.has(next)) {
          strongConnect(next);
          lowlink.set(node, Math.min(lowlink.get(node)!, lowlink.get(next)!));
        } else if (onStack.has(next)) {
          lowlink.set(node, Math.min(lowlink.get(node)!, index.get(next)!));
        }
      }

      if (lowlink.get(node) === index.get(node)) {
        const component: string[] = [];
        let member: string;
        do {
          member = stack.pop()!;
          onStack.delete(member);
          component.push(member);
        } while (member !== node);
        components.push(component);
      }
    };

    for (const node of nodes) {
      if (!index.has(node)) strongConnect(node);
    }
    return components;
  }
}
