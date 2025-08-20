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
    if (!validationResult.getCst() || validationResult.dataMapperErrors.length > 0) return [];
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
    canvasRef?: RefObject<HTMLDivElement> | null,
  ): LineProps[] {
    return mappingLinks
      .reduce((acc, { sourceNodePath, targetNodePath, isSelected }) => {
        const sourceClosestPath = MappingLinksService.getClosestExpandedPath(sourceNodePath, getNodeReference);
        const targetClosestPath = MappingLinksService.getClosestExpandedPath(targetNodePath, getNodeReference);
        if (sourceClosestPath && targetClosestPath) {
          const sourceFieldRef = getNodeReference(sourceClosestPath);
          const targetFieldRef = getNodeReference(targetClosestPath);
          if (sourceFieldRef && !!targetFieldRef) {
            const coord = MappingLinksService.getCoordFromFieldRef(svgRef, sourceFieldRef, targetFieldRef, canvasRef);
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
    canvasRef?: RefObject<HTMLDivElement> | null,
  ): LineCoord | undefined {
    const svgRect = svgRef.current?.getBoundingClientRect();
    const sourceRect = sourceRef.current?.headerRef?.getBoundingClientRect();
    const targetRect = targetRef.current?.headerRef?.getBoundingClientRect();
    if (!sourceRect || !targetRect) {
      return;
    }

    const originalX1 = sourceRect.right - (svgRect ? svgRect.left : 0);
    const originalY1 = sourceRect.top + (sourceRect.bottom - sourceRect.top) / 2 - (svgRect ? svgRect.top : 0);
    const originalX2 = targetRect.left - (svgRect ? svgRect.left : 0);
    const originalY2 = targetRect.top + (targetRect.bottom - targetRect.top) / 2 - (svgRect ? svgRect.top : 0);
    let x1 = originalX1;
    let y1 = originalY1;
    let x2 = originalX2;
    let y2 = originalY2;
    let clipDirection: 'up' | 'down' | 'none' = 'none';
    let clippedEnd: 'source' | 'target' | 'both' | undefined = undefined;

    // Check if source or target is outside the visible container bounds
    if (svgRect && canvasRef?.current) {
      const containerHeight = svgRect.height;
      const containerBottom = containerHeight;
      const canvasRect = canvasRef.current.getBoundingClientRect();
      
      // Calculate canvas center point relative to SVG
      const canvasCenterX = canvasRect.left + canvasRect.width / 2 - svgRect.left;
      
      // Check clipping scenarios
      const sourceAbove = originalY1 < 0;
      const sourceBelow = originalY1 > containerBottom;
      const targetAbove = originalY2 < 0;
      const targetBelow = originalY2 > containerBottom;
      
      if ((sourceAbove || sourceBelow) && (targetAbove || targetBelow)) {
        // Case 5: Both source and target are not visible
        x1 = canvasCenterX;
        y1 = 20; // Top center
        x2 = canvasCenterX;
        y2 = containerBottom - 20; // Bottom center
        clipDirection = 'down'; // For rendering purposes (both ends)
        clippedEnd = 'both';
      } else if (sourceAbove) {
        // Case 3: Source above, target visible
        x1 = canvasCenterX;
        y1 = 20;
        clipDirection = 'up';
        clippedEnd = 'source';
      } else if (sourceBelow) {
        // Case 4: Source below, target visible
        x1 = canvasCenterX;
        y1 = containerBottom - 20;
        clipDirection = 'down';
        clippedEnd = 'source';
      } else if (targetAbove) {
        // Case 1: Source visible, target above
        x2 = canvasCenterX;
        y2 = 20;
        clipDirection = 'up';
        clippedEnd = 'target';
      } else if (targetBelow) {
        // Case 2: Source visible, target below
        x2 = canvasCenterX;
        y2 = containerBottom - 20;
        clipDirection = 'down';
        clippedEnd = 'target';
      }
    }

    return {
      x1,
      y1,
      x2,
      y2,
      clipDirection,
      clippedEnd,
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
