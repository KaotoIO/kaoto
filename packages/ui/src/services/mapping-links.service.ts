import {
  ExpressionItem,
  FieldItem,
  IDocument,
  IMappingLink,
  LineCoord,
  LineProps,
  MappingItem,
  MappingTree,
  NodeReference,
  PrimitiveDocument,
  ValueSelector,
} from '../models/datamapper';
import { MutableRefObject, RefObject } from 'react';
import { XPathService } from './xpath/xpath.service';
import { DocumentService } from './document.service';

/**
 * A collection of the business logic for rendering mapping link lines.
 */
export class MappingLinksService {
  static extractMappingLinks(
    item: MappingTree | MappingItem,
    sourceParameterMap: Map<string, IDocument>,
    sourceBody: IDocument,
    selectedNodeRef: MutableRefObject<NodeReference> | null = null,
  ): IMappingLink[] {
    const answer = [] as IMappingLink[];
    const targetNodePath = item.nodePath.toString();
    if (item instanceof ExpressionItem) {
      const links = MappingLinksService.doExtractMappingLinks(
        item,
        targetNodePath,
        sourceParameterMap,
        sourceBody,
        selectedNodeRef,
      );
      answer.push(...links);
    }
    if ('children' in item) {
      item.children.forEach((child) => {
        if (
          item instanceof FieldItem &&
          !(item.field.ownerDocument instanceof PrimitiveDocument) &&
          child instanceof ValueSelector
        ) {
          const links = MappingLinksService.doExtractMappingLinks(
            child,
            targetNodePath,
            sourceParameterMap,
            sourceBody,
            selectedNodeRef,
          );
          answer.push(...links);
        } else {
          const links = MappingLinksService.extractMappingLinks(child, sourceParameterMap, sourceBody, selectedNodeRef);
          answer.push(...links);
        }
      });
    }
    return answer;
  }

  private static doExtractMappingLinks(
    sourceExpressionItem: ExpressionItem,
    targetNodePath: string,
    sourceParameterMap: Map<string, IDocument>,
    sourceBody: IDocument,
    selectedNodeRef: MutableRefObject<NodeReference> | null,
  ) {
    const namespaces = sourceExpressionItem.mappingTree.namespaceMap;
    const sourceXPath = sourceExpressionItem.expression;
    const validationResult = XPathService.validate(sourceXPath);
    if (!validationResult.getExprNode() || validationResult.dataMapperErrors.length > 0) return [];
    const fieldPaths = XPathService.extractFieldPaths(sourceXPath, sourceExpressionItem.parent.contextPath);
    return fieldPaths.reduce((acc, xpath) => {
      const absolutePath = XPathService.toAbsolutePath(xpath);
      const document = absolutePath.documentReferenceName
        ? Array.from(sourceParameterMap.values()).find(
            (doc: IDocument) => doc.getReferenceId(namespaces) === absolutePath.documentReferenceName,
          )
        : sourceBody;
      const sourceNodePath =
        document && DocumentService.getFieldFromPathSegments(namespaces, document, absolutePath.pathSegments)?.path;

      if (sourceNodePath) {
        const sourceNodePathString = sourceNodePath.toString();
        const isSelected = MappingLinksService.isLinkSelected(sourceNodePathString, targetNodePath, selectedNodeRef);
        acc.push({ sourceNodePath: sourceNodePathString, targetNodePath: targetNodePath, isSelected });
      }
      return acc;
    }, [] as IMappingLink[]);
  }

  static calculateMappingLinkCoordinates(
    mappingLinks: IMappingLink[],
    svgRef: RefObject<SVGSVGElement>,
    getNodeReference: (path: string) => MutableRefObject<NodeReference> | null,
  ): LineProps[] {
    return mappingLinks
      .reduce((acc, { sourceNodePath, targetNodePath, isSelected }) => {
        const sourceClosestPath = MappingLinksService.getClosestExpandedPath(sourceNodePath, getNodeReference);
        const targetClosestPath = MappingLinksService.getClosestExpandedPath(targetNodePath, getNodeReference);
        if (sourceClosestPath && targetClosestPath) {
          const sourceFieldRef = getNodeReference(sourceClosestPath);
          const targetFieldRef = getNodeReference(targetClosestPath);
          if (sourceFieldRef && !!targetFieldRef) {
            const coord = MappingLinksService.getCoordFromFieldRef(svgRef, sourceFieldRef, targetFieldRef);
            if (coord)
              acc.push({ ...coord, sourceNodePath: sourceNodePath, targetNodePath: targetNodePath, isSelected });
          }
        }
        return acc;
      }, [] as LineProps[])
      .sort((a, b) => {
        // selected lines should be drawn after not-selected ones
        if (a.isSelected && !b.isSelected) return 1;
        if (!a.isSelected && b.isSelected) return -1;
        return 0;
      });
  }

  private static getClosestExpandedPath(
    path: string,
    getNodeReference: (path: string) => MutableRefObject<NodeReference> | null,
  ) {
    let tracedPath: string | null = path;
    while (tracedPath && MappingLinksService.shouldTraceParent(tracedPath, getNodeReference)) {
      const parentPath = MappingLinksService.getParentPath(tracedPath);
      if (parentPath === tracedPath) break;
      tracedPath = parentPath;
    }
    return tracedPath;
  }

  private static shouldTraceParent(
    tracedPath: string,
    getNodeReference: (path: string) => MutableRefObject<NodeReference> | null,
  ): boolean {
    if (getNodeReference(tracedPath)?.current == null) return true;
    if (getNodeReference(tracedPath)?.current.headerRef == null) return true;
    return getNodeReference(tracedPath)?.current.headerRef?.getClientRects().length === 0;
  }

  private static getParentPath(path: string) {
    if (path.endsWith('://')) return path.substring(0, path.indexOf(':'));

    const lastSeparatorIndex = path.lastIndexOf('/');
    const endIndex =
      lastSeparatorIndex !== -1 && path.charAt(lastSeparatorIndex - 1) === '/'
        ? lastSeparatorIndex + 1
        : lastSeparatorIndex;
    return endIndex !== -1 ? path.substring(0, endIndex) : null;
  }

  private static getCoordFromFieldRef(
    svgRef: RefObject<SVGSVGElement>,
    sourceRef: MutableRefObject<NodeReference>,
    targetRef: MutableRefObject<NodeReference>,
  ): LineCoord | undefined {
    const svgRect = svgRef.current?.getBoundingClientRect();
    const sourceRect = sourceRef.current?.headerRef?.getBoundingClientRect();
    const targetRect = targetRef.current?.headerRef?.getBoundingClientRect();
    if (!sourceRect || !targetRect) {
      return;
    }

    return {
      x1: sourceRect.right - (svgRect ? svgRect.left : 0),
      y1: sourceRect.top + (sourceRect.bottom - sourceRect.top) / 2 - (svgRect ? svgRect.top : 0),
      x2: targetRect.left - (svgRect ? svgRect.left : 0),
      y2: targetRect.top + (targetRect.bottom - targetRect.top) / 2 - (svgRect ? svgRect.top : 0),
    };
  }

  private static isLinkSelected(
    sourceNodePath: string,
    targetNodePath: string,
    selectedNodeRef: MutableRefObject<NodeReference> | null,
  ): boolean {
    if (!selectedNodeRef) return false;

    if (selectedNodeRef.current.isSource) {
      return selectedNodeRef.current.path === sourceNodePath;
    } else {
      return selectedNodeRef.current.path === targetNodePath;
    }
  }

  static isInSelectedMapping(mappingLinks: IMappingLink[], ref: MutableRefObject<NodeReference>): boolean {
    return !!mappingLinks
      .filter((link) => link.isSelected)
      .find((link) => MappingLinksService.isLinkSelected(link.sourceNodePath, link.targetNodePath, ref));
  }
}
