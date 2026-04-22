import {
  BODY_DOCUMENT_ID,
  DocumentType,
  FieldItem,
  IDocument,
  IExpressionHolder,
  IField,
  IMappingLink,
  IParentType,
  isExpressionHolder,
  MappingItem,
  MappingTree,
  NodePath,
  PrimitiveDocument,
  ValueSelector,
} from '../../models/datamapper';
import { DocumentService } from '../document/document.service';
import { XPathService } from '../xpath/xpath.service';

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
      const sourceResult = document
        ? DocumentService.getFieldFromPathSegments(namespaces, document, absolutePath.pathSegments)
        : undefined;
      const sourceField = sourceResult && 'parent' in sourceResult ? sourceResult : undefined;
      const sourceNodePath = sourceField && MappingLinksService.computeVisualSourceNodePath(sourceField);

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
    return mappingLinks
      .filter((link) => link.isSelected)
      .some((link) => link.sourceNodePath === nodePath || link.targetNodePath === nodePath);
  }

  /**
   * Bridges a mapping tree {@link NodePath} (no choice/abstract wrapper segments) to the
   * visual document tree {@link NodePath} (with wrapper segments) by inserting
   * intermediate wrapper IDs from the {@link IField} parent chain.
   *
   * The mapping tree mirrors the XSLT output structure where `xs:choice` and abstract
   * element wrappers have no counterpart, while the visual tree renders these wrappers
   * as nodes with their own path segments. This method reconciles the two so that
   * mapping link target paths match the connection port paths registered in the DOM.
   */
  private static computeVisualTargetNodePath(item: MappingTree | MappingItem): NodePath {
    if (item instanceof MappingTree) {
      return item.nodePath;
    }
    const parentPath = MappingLinksService.computeVisualTargetNodePath(item.parent);
    if (item instanceof FieldItem) {
      const wrapperSegments = MappingLinksService.getIntermediateWrapperSegments(item.field);
      let path = parentPath;
      for (const segment of wrapperSegments) {
        path = NodePath.childOf(path, segment);
      }
      const nodeId = MappingLinksService.isSelectedWrapperMember(item.field) ? item.field.id : item.id;
      return NodePath.childOf(path, nodeId);
    }
    return NodePath.childOf(parentPath, item.id);
  }

  private static isWrapperField(node: IParentType): node is IField {
    return 'wrapperKind' in node && !!node.wrapperKind;
  }

  private static isSelectedWrapperField(node: IParentType): boolean {
    return (
      MappingLinksService.isWrapperField(node) &&
      'selectedMemberIndex' in node &&
      node.selectedMemberIndex !== undefined
    );
  }

  private static isSelectedWrapperMember(field: IField): boolean {
    return MappingLinksService.isSelectedWrapperField(field.parent);
  }

  /**
   * Collects the IDs of consecutive `wrapperKind` ancestor wrapper
   * fields, ordered from outermost to innermost. Only includes **unselected**
   * wrappers (`selectedMemberIndex` is `undefined`) because selected wrappers are
   * not rendered as visual nodes — the selected member replaces them in the tree.
   * Returns an empty array when the field has no unselected wrapper ancestors.
   */
  private static computeVisualSourceNodePath(field: IField): NodePath {
    const segments: string[] = [];
    let current: IParentType = field;
    while ('parent' in current && current.parent !== current) {
      if (!MappingLinksService.isSelectedWrapperField(current)) {
        segments.unshift(current.id);
      }
      current = current.parent;
    }
    let path = NodePath.fromDocument(field.path.documentType, field.path.documentId);
    for (const seg of segments) {
      path = NodePath.childOf(path, seg);
    }
    return path;
  }

  private static getIntermediateWrapperSegments(field: IField): string[] {
    const segments: string[] = [];
    let current = field.parent;
    while (MappingLinksService.isWrapperField(current)) {
      if (!MappingLinksService.isSelectedWrapperField(current)) {
        segments.push(current.id);
      }
      current = current.parent;
    }
    segments.reverse();
    return segments;
  }
}
