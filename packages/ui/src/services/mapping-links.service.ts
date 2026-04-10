import {
  BODY_DOCUMENT_ID,
  DocumentType,
  FieldItem,
  IDocument,
  IExpressionHolder,
  IField,
  IMappingLink,
  isExpressionHolder,
  MappingItem,
  MappingTree,
  NodePath,
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
    const targetNodePath = MappingLinksService.computeVisualTargetNodePath(item).toString();
    if (item instanceof MappingItem && isExpressionHolder(item)) {
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
    sourceExpressionItem: IExpressionHolder & MappingItem,
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
        const sourceDocumentId = document
          ? `doc-${document.documentType}-${document.documentId}`
          : `doc-${DocumentType.SOURCE_BODY}-${BODY_DOCUMENT_ID}`;
        const targetDocumentId = `doc-${DocumentType.TARGET_BODY}-${BODY_DOCUMENT_ID}`;
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
          targetDocumentId,
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

  /**
   * Bridges a mapping tree {@link NodePath} (no choice wrapper segments) to the
   * visual document tree {@link NodePath} (with choice wrapper segments) by inserting
   * intermediate choice wrapper IDs from the {@link IField} parent chain.
   *
   * The mapping tree mirrors the XSLT output structure where `xs:choice` has no counterpart,
   * while the visual tree renders choice wrappers as nodes with their own path segments.
   * This method reconciles the two so that mapping link target paths match the connection
   * port paths registered in the DOM.
   */
  private static computeVisualTargetNodePath(item: MappingTree | MappingItem): NodePath {
    if (item instanceof MappingTree) {
      return item.nodePath;
    }
    const parentPath = MappingLinksService.computeVisualTargetNodePath(item.parent);
    if (item instanceof FieldItem) {
      const choiceSegments = MappingLinksService.getIntermediateChoiceSegments(item.field);
      let path = parentPath;
      for (const segment of choiceSegments) {
        path = NodePath.childOf(path, segment);
      }
      return NodePath.childOf(path, item.id);
    }
    return NodePath.childOf(parentPath, item.id);
  }

  /**
   * Collects the IDs of consecutive `isChoice` ancestor fields, ordered from
   * outermost to innermost. Only includes **unselected** choice wrappers
   * (`selectedMemberIndex` is `undefined`) because selected wrappers are not
   * rendered as visual nodes — the selected member replaces them in the tree.
   * Returns an empty array when the field has no unselected choice wrapper ancestors.
   */
  private static getIntermediateChoiceSegments(field: IField): string[] {
    const segments: string[] = [];
    let current = field.parent;
    while ('isChoice' in current && current.isChoice) {
      if (current.selectedMemberIndex === undefined) {
        segments.push(current.id);
      }
      current = current.parent;
    }
    segments.reverse();
    return segments;
  }
}
