import {
  BODY_DOCUMENT_ID,
  CopyOfSelector,
  DocumentNodeData,
  DocumentType,
  FieldItem,
  getSectionAnchor,
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
  TargetRenderIndex,
  ValueOfSelector,
  ValueSelector,
  VariableItem,
  variableNodePath,
  VARIABLES_DOCUMENT_ID,
  VARIABLES_SECTION_ANCHOR,
} from '../../models/datamapper';
import { DocumentService } from '../document/document.service';
import { MappingService } from '../mapping/mapping.service';
import { XPathService } from '../xpath/xpath.service';
import { TargetRenderService } from './target-render.service';
import { VisualizationUtilService } from './visualization-util.service';

/** What computing mapping lines needs besides the item itself. */
interface IMappingLinkContext {
  sourceParameterMap: Map<string, IDocument>;
  sourceBody: IDocument;
  renderIndex: TargetRenderIndex;
  selectedNodePath: string | null;
  selectedNodeIsSource: boolean;
}

/**
 * A collection of the business logic for rendering mapping link lines.
 */
export class MappingLinksService {
  /**
   * Computes the mapping lines for `item` and its descendants. Sources are resolved from the live
   * mapping tree, so lines follow the expression the user is typing. Each line's target end comes
   * from `renderIndex`, the snapshot the target tree was built from, so it doesn't move while the user
   * types; this service makes no rendering decisions of its own.
   * @param item - the mapping tree, or an item in it, to compute lines for
   * @param sourceParameterMap - the source parameter documents
   * @param sourceBody - the source body document
   * @param renderIndex - the render index of the snapshot the target tree was built from
   * @param selectedNodePath - the selected node's path, to mark the lines it belongs to
   * @param selectedNodeIsSource - whether the selected node is on the source side
   */
  static extractMappingLinks(
    item: MappingTree | MappingItem,
    sourceParameterMap: Map<string, IDocument>,
    sourceBody: IDocument,
    renderIndex: TargetRenderIndex,
    selectedNodePath: string | null = null,
    selectedNodeIsSource: boolean = false,
  ): IMappingLink[] {
    return MappingLinksService.collectMappingLinks(item, {
      sourceParameterMap,
      sourceBody,
      renderIndex,
      selectedNodePath,
      selectedNodeIsSource,
    });
  }

  private static collectMappingLinks(
    item: MappingTree | MappingItem,
    context: IMappingLinkContext,
    parentLineStyle?: MappingLineStyle,
  ): IMappingLink[] {
    const answer = [] as IMappingLink[];
    const { renderIndex } = context;
    const targetNodePath = TargetRenderService.getTargetPath(item, renderIndex);
    const ownLineStyle = MappingLinksService.getOwnLineStyle(item, context);
    const lineStyle = MappingLinksService.resolveLineStyle(item, ownLineStyle, renderIndex, parentLineStyle);

    if (!renderIndex.isAbsorbed(item) && item instanceof MappingItem && isExpressionHolder(item)) {
      answer.push(...MappingLinksService.doExtractMappingLinks(item, targetNodePath, context, lineStyle));
    }
    if ('children' in item) {
      const effectiveStyle = item instanceof FieldItem ? ownLineStyle : lineStyle;
      const childLineStyle = effectiveStyle === MappingLineStyle.REGULAR ? undefined : effectiveStyle;
      answer.push(...MappingLinksService.collectChildLinks(item, targetNodePath, context, lineStyle, childLineStyle));
    }
    return answer;
  }

  private static getOwnLineStyle(item: MappingTree | MappingItem, context: IMappingLinkContext): MappingLineStyle {
    if (!(item instanceof FieldItem)) return MappingLineStyle.REGULAR;
    const lineStyle = MappingLinksService.classifyContainerLineStyle(item, context.renderIndex);
    return lineStyle === MappingLineStyle.COMPLETE && MappingLinksService.hasExtraSourceChildren(item, context)
      ? MappingLineStyle.PARTIAL
      : lineStyle;
  }

  private static resolveLineStyle(
    item: MappingTree | MappingItem,
    ownLineStyle: MappingLineStyle,
    renderIndex: TargetRenderIndex,
    parentLineStyle?: MappingLineStyle,
  ): MappingLineStyle {
    if (ownLineStyle !== MappingLineStyle.REGULAR) return ownLineStyle;
    const isFieldInsideInstruction =
      item instanceof FieldItem && TargetRenderService.isRenderedInstruction(item.parent, renderIndex);
    return isFieldInsideInstruction ? ownLineStyle : (parentLineStyle ?? ownLineStyle);
  }

  private static collectChildLinks(
    item: MappingTree | MappingItem,
    targetNodePath: string,
    context: IMappingLinkContext,
    lineStyle: MappingLineStyle,
    childLineStyle: MappingLineStyle | undefined,
  ): IMappingLink[] {
    const answer = [] as IMappingLink[];
    for (const child of item.children) {
      if (child instanceof ValueSelector && MappingLinksService.isDrawnOnParentRow(item, child)) {
        answer.push(...MappingLinksService.doExtractMappingLinks(child, targetNodePath, context, lineStyle));
      } else {
        const inheritedLineStyle = child instanceof ValueOfSelector ? undefined : childLineStyle;
        answer.push(...MappingLinksService.collectMappingLinks(child, context, inheritedLineStyle));
      }
    }
    return answer;
  }

  private static isDrawnOnParentRow(item: MappingTree | MappingItem, child: ValueSelector): boolean {
    if (!VisualizationUtilService.isInlineValueSelector(child)) return false;
    return (
      item instanceof MappingTree ||
      (item instanceof FieldItem && !(item.field.ownerDocument instanceof PrimitiveDocument))
    );
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
    context: IMappingLinkContext,
    lineStyle: MappingLineStyle = MappingLineStyle.REGULAR,
  ) {
    const { sourceParameterMap, sourceBody, selectedNodePath, selectedNodeIsSource } = context;
    const targetDocumentNodeId = DocumentNodeData.formatNodeId(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID);
    const resolvedFields = MappingService.resolveSourceFields(sourceExpressionItem, sourceParameterMap, sourceBody);
    const links = resolvedFields.reduce((acc, { field, document }) => {
      const sourceNodePath = MappingLinksService.computeVisualSourceNodePath(field);
      const sourceNodePathString = sourceNodePath.toString();
      const sourceDocumentNodeId = DocumentNodeData.getId(document);
      const isSelected = MappingLinksService.isLinkSelected(
        sourceNodePathString,
        targetNodePath,
        selectedNodePath,
        selectedNodeIsSource,
      );
      acc.push({
        sourceNodePath: sourceNodePathString,
        targetNodePath: targetNodePath,
        sourceDocumentNodeId,
        targetDocumentNodeId,
        isSelected,
        lineStyle,
        sourceSectionAnchor: getSectionAnchor(document.documentType),
      });
      return acc;
    }, [] as IMappingLink[]);

    const varRefs = MappingLinksService.resolveVariableReferences(sourceExpressionItem);
    for (const variable of varRefs) {
      const sourceNodePathString = variableNodePath(variable.id);
      const sourceDocumentNodeId = VARIABLES_DOCUMENT_ID;
      const isSelected = MappingLinksService.isLinkSelected(
        sourceNodePathString,
        targetNodePath,
        selectedNodePath,
        selectedNodeIsSource,
      );
      links.push({
        sourceNodePath: sourceNodePathString,
        targetNodePath: targetNodePath,
        sourceDocumentNodeId,
        targetDocumentNodeId,
        isSelected,
        lineStyle,
        sourceSectionAnchor: VARIABLES_SECTION_ANCHOR,
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

  private static classifyContainerLineStyle(item: FieldItem, renderIndex: TargetRenderIndex): MappingLineStyle {
    const childFieldItems = TargetRenderService.getRenderedChildFields(item, renderIndex);

    if (childFieldItems.length === 0 && MappingLinksService.hasCopyOfDescendant(item)) {
      return MappingLineStyle.COPY_OF;
    }

    if (childFieldItems.length === 0) return MappingLineStyle.REGULAR;
    if (TargetRenderService.isRenderedInstruction(item.parent, renderIndex)) return MappingLineStyle.REGULAR;

    const targetChildren = item.field.fields.filter((f) => !VisualizationUtilService.isWrapperField(f));
    if (childFieldItems.length < targetChildren.length) return MappingLineStyle.PARTIAL;

    const allContainerChildrenCopyOf = childFieldItems
      .filter((child) => DocumentService.hasChildren(child.field))
      .every((child) => MappingLinksService.hasCopyOfDescendant(child));

    return allContainerChildrenCopyOf ? MappingLineStyle.COMPLETE : MappingLineStyle.PARTIAL;
  }

  private static hasExtraSourceChildren(item: FieldItem, context: IMappingLinkContext): boolean {
    const childFieldItems = TargetRenderService.getRenderedChildFields(item, context.renderIndex);
    const sourceParents = new Set<IParentType>();
    const mappedSourceChildren = new Set<string>();

    for (const child of childFieldItems) {
      const vs = child.children.find((c) => c instanceof ValueSelector) as ValueSelector | undefined;
      if (!vs || !isExpressionHolder(vs)) continue;
      const resolved = MappingService.resolveSourceFields(vs, context.sourceParameterMap, context.sourceBody);
      for (const { field } of resolved) {
        sourceParents.add(field.parent);
        mappedSourceChildren.add(field.id);
      }
    }

    if (sourceParents.size !== 1) return true;
    const sourceParent = [...sourceParents][0];
    if (!('fields' in sourceParent)) return false;
    const sourceChildren = (sourceParent as IField).fields.filter(
      (f) => !f.isAttribute && !VisualizationUtilService.isWrapperField(f),
    );
    return sourceChildren.length > mappedSourceChildren.size;
  }

  private static computeVisualSourceNodePath(field: IField): NodePath {
    if (field instanceof PrimitiveDocument) return field.path;
    const segments: string[] = [];
    let current: IParentType = field;
    while ('parent' in current && current.parent !== current) {
      if (!VisualizationUtilService.isSelectedWrapperField(current)) {
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
}
