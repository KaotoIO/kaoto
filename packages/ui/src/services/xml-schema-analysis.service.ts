import { SchemaAnalysisReport } from '../models/datamapper/schema';
import { PathUtil } from './path-util';

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
    const errors: string[] = [];

    for (const [filePath, content] of Object.entries(definitionFiles)) {
      const { info, parseError } = XmlSchemaAnalysisService.parseSchemaFileInfo(filePath, content);
      fileInfos.set(filePath, info);
      if (parseError) {
        errors.push(parseError);
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
          errors.push(
            `Missing required schema: "${directive.schemaLocation}" referenced by "${filePath}" via xs:${directive.type}`,
          );
        }
      }
    }

    const circularErrors = XmlSchemaAnalysisService.detectCircularIncludes(fileInfos, edges);
    errors.push(...circularErrors);

    const warnings = XmlSchemaAnalysisService.detectCircularImports(fileInfos, edges);

    const includeNsErrors = XmlSchemaAnalysisService.validateIncludeNamespaces(fileInfos, edges);
    errors.push(...includeNsErrors);

    const importNsErrors = XmlSchemaAnalysisService.validateImportNamespaces(fileInfos, edges);
    errors.push(...importNsErrors);

    const duplicateNsWarnings = XmlSchemaAnalysisService.detectDuplicateTargetNamespaces(fileInfos);
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

  private static detectCircularIncludes(fileInfos: Map<string, SchemaFileInfo>, edges: DependencyEdge[]): string[] {
    const includeAdj = new Map<string, string[]>();
    for (const edge of edges) {
      if (edge.directive.type === 'include') {
        const neighbors = includeAdj.get(edge.from) ?? [];
        neighbors.push(edge.to);
        includeAdj.set(edge.from, neighbors);
      }
    }

    const errors: string[] = [];
    const visited = new Set<string>();
    const inStack = new Set<string>();
    const stack: string[] = [];

    const dfs = (node: string) => {
      visited.add(node);
      inStack.add(node);
      stack.push(node);

      for (const neighbor of includeAdj.get(node) ?? []) {
        if (inStack.has(neighbor)) {
          const cycleStart = stack.indexOf(neighbor);
          const cycle = stack.slice(cycleStart);
          cycle.push(neighbor);
          const circularInclude = cycle.map((p) => `"${p}"`).join(' -> ');
          errors.push(`Circular xs:include detected: ${circularInclude}`);
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

    return errors;
  }

  private static detectCircularImports(fileInfos: Map<string, SchemaFileInfo>, edges: DependencyEdge[]): string[] {
    const importAdj = new Map<string, string[]>();
    for (const edge of edges) {
      if (edge.directive.type === 'import') {
        const neighbors = importAdj.get(edge.from) ?? [];
        neighbors.push(edge.to);
        importAdj.set(edge.from, neighbors);
      }
    }

    const warnings: string[] = [];
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
          warnings.push(`Circular xs:import detected: ${circularImport}`);
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

  private static validateIncludeNamespaces(fileInfos: Map<string, SchemaFileInfo>, edges: DependencyEdge[]): string[] {
    const errors: string[] = [];
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
        errors.push(
          `Namespace mismatch in xs:include: "${edge.from}" (targetNamespace: ${parentNs})` +
            ` includes "${edge.to}" (targetNamespace: ${includedNs}).` +
            ` Included schemas must have the same targetNamespace or no targetNamespace (chameleon include).`,
        );
      }
    }
    return errors;
  }

  private static validateImportNamespaces(fileInfos: Map<string, SchemaFileInfo>, edges: DependencyEdge[]): string[] {
    const errors: string[] = [];
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
      errors.push(
        `Namespace mismatch in xs:import: "${edge.from}" declares namespace ${declaredLabel}` +
          ` but "${edge.to}" has targetNamespace ${actualLabel}`,
      );
    }
    return errors;
  }

  private static detectDuplicateTargetNamespaces(fileInfos: Map<string, SchemaFileInfo>): string[] {
    const nsByNamespace = new Map<string, string[]>();
    for (const [filePath, info] of fileInfos) {
      if (info.targetNamespace === null) {
        continue;
      }
      const files = nsByNamespace.get(info.targetNamespace) ?? [];
      files.push(filePath);
      nsByNamespace.set(info.targetNamespace, files);
    }
    const warnings: string[] = [];
    for (const [ns, files] of nsByNamespace) {
      if (files.length > 1) {
        const fileList = files.map((f) => `"${f}"`).join(', ');
        warnings.push(`Multiple schemas share targetNamespace "${ns}": ${fileList}`);
      }
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
}
