import {
  BODY_DOCUMENT_ID,
  CopyOfSelector,
  DocumentNodeData,
  DocumentType,
  FieldItem,
  IDocument,
  IExpressionHolder,
  IField,
  IMappingLink,
  InstructionItem,
  IParentType,
  isExpressionHolder,
  MappingItem,
  MappingLineStyle,
  MappingTree,
  NodePath,
  PrimitiveDocument,
  ValueOfSelector,
  ValueSelector,
  VariableItem,
  variableNodePath,
  VARIABLES_DOCUMENT_ID,
} from '../../models/datamapper';
import { DocumentService } from '../document/document.service';
import { MappingService } from '../mapping/mapping.service';
import { XPathService } from '../xpath/xpath.service';
import { VisualizationService } from './visualization.service';

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
    parentLineStyle?: MappingLineStyle,
  ): IMappingLink[] {
    const answer = [] as IMappingLink[];
    const targetNodePath = MappingLinksService.computeVisualTargetNodePath(item).toString();
    let ownLineStyle =
      item instanceof FieldItem ? MappingLinksService.classifyContainerLineStyle(item) : MappingLineStyle.REGULAR;
    if (ownLineStyle === MappingLineStyle.COMPLETE) {
      if (MappingLinksService.hasExtraSourceChildren(item as FieldItem, sourceParameterMap, sourceBody)) {
        ownLineStyle = MappingLineStyle.PARTIAL;
      }
    }
    const isFieldInsideInstruction = item instanceof FieldItem && item.parent instanceof InstructionItem;
    const lineStyle =
      ownLineStyle === MappingLineStyle.REGULAR && !isFieldInsideInstruction
        ? (parentLineStyle ?? ownLineStyle)
        : ownLineStyle;

    if (item instanceof MappingItem && isExpressionHolder(item)) {
      const links = MappingLinksService.doExtractMappingLinks(
        item,
        targetNodePath,
        sourceParameterMap,
        sourceBody,
        selectedNodePath,
        selectedNodeIsSource,
        lineStyle,
      );
      answer.push(...links);
    }
    if ('children' in item) {
      const effectiveStyle = item instanceof FieldItem ? ownLineStyle : lineStyle;
      const childLineStyle = effectiveStyle === MappingLineStyle.REGULAR ? undefined : effectiveStyle;
      item.children.forEach((child) => {
        const isInlineValueSelector =
          child instanceof ValueSelector && VisualizationService.isInlineValueSelector(child);
        if (
          item instanceof FieldItem &&
          !(item.field.ownerDocument instanceof PrimitiveDocument) &&
          isInlineValueSelector
        ) {
          const links = MappingLinksService.doExtractMappingLinks(
            child,
            targetNodePath,
            sourceParameterMap,
            sourceBody,
            selectedNodePath,
            selectedNodeIsSource,
            lineStyle,
          );
          answer.push(...links);
        } else {
          const links = MappingLinksService.extractMappingLinks(
            child,
            sourceParameterMap,
            sourceBody,
            selectedNodePath,
            selectedNodeIsSource,
            child instanceof ValueOfSelector ? undefined : childLineStyle,
          );
          answer.push(...links);
        }
      });
    }
    return answer;
  }

  private static resolveSourceFields(
    expressionHolder: IExpressionHolder & MappingItem,
    sourceParameterMap: Map<string, IDocument>,
    sourceBody: IDocument,
  ): { field: IField; document: IDocument }[] {
    const namespaces = expressionHolder.mappingTree.namespaceMap;
    const sourceXPath = expressionHolder.expression;
    const validationResult = XPathService.validate(sourceXPath);
    if (!validationResult.getExprNode() || validationResult.dataMapperErrors.length > 0) return [];
    const fieldPaths = XPathService.extractFieldPaths(sourceXPath, expressionHolder.parent.contextPath);
    const results: { field: IField; document: IDocument }[] = [];
    for (const xpath of fieldPaths) {
      const absolutePath = XPathService.toAbsolutePath(xpath);
      if (
        absolutePath.documentReferenceName &&
        MappingService.resolveVariableInScope(absolutePath.documentReferenceName, expressionHolder)
      ) {
        continue;
      }
      const document = DocumentService.resolveSourceDocument(absolutePath, namespaces, sourceBody, sourceParameterMap);
      if (!document) continue;
      const result = DocumentService.getFieldFromPathSegments(namespaces, document, absolutePath.pathSegments);
      if (result && 'parent' in result) {
        results.push({ field: result, document });
      }
    }
    return results;
  }

  private static resolveVariableReferences(expressionHolder: IExpressionHolder & MappingItem): VariableItem[] {
    const sourceXPath = expressionHolder.expression;
    const validationResult = XPathService.validate(sourceXPath);
    if (!validationResult.getExprNode() || validationResult.dataMapperErrors.length > 0) return [];

    const allVarNames = XPathService.extractVariableNames(sourceXPath, expressionHolder.parent.contextPath);

    const resolved: VariableItem[] = [];
    for (const name of allVarNames) {
      const variable = MappingService.resolveVariableInScope(name, expressionHolder);
      if (variable) resolved.push(variable);
    }
    return resolved;
  }

  private static doExtractMappingLinks(
    sourceExpressionItem: IExpressionHolder & MappingItem,
    targetNodePath: string,
    sourceParameterMap: Map<string, IDocument>,
    sourceBody: IDocument,
    selectedNodePath: string | null,
    selectedNodeIsSource: boolean,
    lineStyle: MappingLineStyle = MappingLineStyle.REGULAR,
  ) {
    const targetDocNodeId = DocumentNodeData.formatNodeId(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID);
    const resolvedFields = MappingLinksService.resolveSourceFields(
      sourceExpressionItem,
      sourceParameterMap,
      sourceBody,
    );
    const links = resolvedFields.reduce((acc, { field, document }) => {
      const sourceNodePath = MappingLinksService.computeVisualSourceNodePath(field);
      const sourceNodePathString = sourceNodePath.toString();
      const sourceDocNodeId = DocumentNodeData.getId(document);
      const isSelected = MappingLinksService.isLinkSelected(
        sourceNodePathString,
        targetNodePath,
        selectedNodePath,
        selectedNodeIsSource,
      );
      acc.push({
        sourceNodePath: sourceNodePathString,
        targetNodePath: targetNodePath,
        sourceDocumentId: sourceDocNodeId,
        targetDocumentId: targetDocNodeId,
        isSelected,
        lineStyle,
      });
      return acc;
    }, [] as IMappingLink[]);

    const varRefs = MappingLinksService.resolveVariableReferences(sourceExpressionItem);
    for (const variable of varRefs) {
      const sourceNodePathString = variableNodePath(variable.id);
      const sourceDocNodeId = VARIABLES_DOCUMENT_ID;
      const isSelected = MappingLinksService.isLinkSelected(
        sourceNodePathString,
        targetNodePath,
        selectedNodePath,
        selectedNodeIsSource,
      );
      links.push({
        sourceNodePath: sourceNodePathString,
        targetNodePath: targetNodePath,
        sourceDocumentId: sourceDocNodeId,
        targetDocumentId: targetDocNodeId,
        isSelected,
        lineStyle,
      });
    }

    return links;
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
   * Returns true if `item` or any of its descendants (recursing through
   * {@link InstructionItem} nodes) contains a {@link CopyOfSelector}.
   * Recursion stops at {@link FieldItem} boundaries because a `CopyOfSelector`
   * under a child `FieldItem` belongs to that child target element, not to the
   * parent being classified.
   */
  private static hasCopyOfDescendant(item: MappingItem): boolean {
    for (const child of item.children) {
      if (child instanceof CopyOfSelector) return true;
      if (child instanceof InstructionItem) {
        if (MappingLinksService.hasCopyOfDescendant(child)) return true;
      }
    }
    return false;
  }

  private static classifyContainerLineStyle(item: FieldItem): MappingLineStyle {
    const childFieldItems = item.children.filter((c): c is FieldItem => c instanceof FieldItem);

    if (childFieldItems.length === 0 && MappingLinksService.hasCopyOfDescendant(item)) {
      return MappingLineStyle.COPY_OF;
    }

    if (childFieldItems.length === 0) return MappingLineStyle.REGULAR;
    if (item.parent instanceof InstructionItem) return MappingLineStyle.REGULAR;

    const targetChildren = item.field.fields.filter((f) => !MappingLinksService.isWrapperField(f));
    if (childFieldItems.length < targetChildren.length) return MappingLineStyle.PARTIAL;

    const allContainerChildrenCopyOf = childFieldItems
      .filter((child) => DocumentService.hasChildren(child.field))
      .every((child) => MappingLinksService.hasCopyOfDescendant(child));

    return allContainerChildrenCopyOf ? MappingLineStyle.COMPLETE : MappingLineStyle.PARTIAL;
  }

  private static hasExtraSourceChildren(
    item: FieldItem,
    sourceParameterMap: Map<string, IDocument>,
    sourceBody: IDocument,
  ): boolean {
    const childFieldItems = item.children.filter((c): c is FieldItem => c instanceof FieldItem);
    const sourceParents = new Set<IParentType>();
    const mappedSourceChildren = new Set<string>();

    for (const child of childFieldItems) {
      const vs = child.children.find((c) => c instanceof ValueSelector) as ValueSelector | undefined;
      if (!vs || !isExpressionHolder(vs)) continue;
      const resolved = MappingLinksService.resolveSourceFields(vs, sourceParameterMap, sourceBody);
      for (const { field } of resolved) {
        sourceParents.add(field.parent);
        mappedSourceChildren.add(field.id);
      }
    }

    if (sourceParents.size !== 1) return true;
    const sourceParent = [...sourceParents][0];
    if (!('fields' in sourceParent)) return false;
    const sourceChildren = (sourceParent as IField).fields.filter(
      (f) => !f.isAttribute && !MappingLinksService.isWrapperField(f),
    );
    return sourceChildren.length > mappedSourceChildren.size;
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
    if (!MappingLinksService.isWrapperField(node)) return false;
    if (node.wrapperKind === 'abstract') return node.selectedMemberQName !== undefined;
    return node.selectedMemberIndex !== undefined;
  }

  private static isSelectedWrapperMember(field: IField): boolean {
    return MappingLinksService.isSelectedWrapperField(field.parent);
  }

  /**
   * Collects the IDs of consecutive `wrapperKind` ancestor wrapper
   * fields, ordered from outermost to innermost. Only includes **unselected**
   * wrappers (no member selected) because selected wrappers are
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
      if ((current as IField).maxOccurs !== 1) {
        return [];
      }
      if (!MappingLinksService.isSelectedWrapperField(current)) {
        segments.push(current.id);
      }
      current = current.parent;
    }
    segments.reverse();
    return segments;
  }
}
