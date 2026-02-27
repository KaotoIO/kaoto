import {
  BODY_DOCUMENT_ID,
  ExpressionItem,
  FieldItem,
  IDocument,
  IMappingLink,
  MappingItem,
  MappingTree,
  PrimitiveDocument,
  ValueSelector,
} from '../models/datamapper';
import { DocumentService } from './document.service';
import { XPathService } from './xpath/xpath.service';

/**
 * A collection of the business logic for rendering mapping link lines.
 */
export class MappingLinksService {
  static extractMappingLinks(
    item: MappingTree | MappingItem,
    sourceParameterMap: Map<string, IDocument>,
    sourceBody: IDocument,
    selectedNodePath: string | null = null,
    selectedNodeIsSource: boolean = false,
  ): IMappingLink[] {
    const answer = [] as IMappingLink[];
    const targetNodePath = item.nodePath.toString();
    if (item instanceof ExpressionItem) {
      const links = MappingLinksService.doExtractMappingLinks(
        item,
        targetNodePath,
        sourceParameterMap,
        sourceBody,
        selectedNodePath,
        selectedNodeIsSource,
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
            selectedNodePath,
            selectedNodeIsSource,
          );
          answer.push(...links);
        } else {
          const links = MappingLinksService.extractMappingLinks(
            child,
            sourceParameterMap,
            sourceBody,
            selectedNodePath,
            selectedNodeIsSource,
          );
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
    selectedNodePath: string | null,
    selectedNodeIsSource: boolean,
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
        const sourceDocumentId = document?.documentId ?? BODY_DOCUMENT_ID;
        const isSelected = MappingLinksService.isLinkSelected(
          sourceNodePathString,
          targetNodePath,
          selectedNodePath,
          selectedNodeIsSource,
        );
        acc.push({
          sourceNodePath: sourceNodePathString,
          targetNodePath: targetNodePath,
          sourceDocumentId,
          targetDocumentId: BODY_DOCUMENT_ID,
          isSelected,
        });
      }
      return acc;
    }, [] as IMappingLink[]);
  }

  private static isLinkSelected(
    sourceNodePath: string,
    targetNodePath: string,
    selectedNodePath: string | null,
    selectedNodeIsSource: boolean,
  ): boolean {
    if (!selectedNodePath) return false;

    if (selectedNodeIsSource) {
      return selectedNodePath === sourceNodePath;
    } else {
      return selectedNodePath === targetNodePath;
    }
  }

  static isNodeInSelectedMapping(mappingLinks: IMappingLink[], nodePath: string): boolean {
    return !!mappingLinks
      .filter((link) => link.isSelected)
      .some((link) => link.sourceNodePath === nodePath || link.targetNodePath === nodePath);
  }
}
