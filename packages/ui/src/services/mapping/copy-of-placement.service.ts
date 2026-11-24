import { IField, IParentType, PrimitiveDocument } from '../../models/datamapper/document';
import {
  AttributeOutputBucket,
  ChooseItem,
  CopyOfSelector,
  FieldItem,
  ForEachGroupItem,
  ForEachItem,
  InstructionItem,
  MappingItem,
  MappingItemOrderBucket,
  MappingParentType,
  MappingTree,
  OtherwiseItem,
  UnknownMappingItem,
  ValueOfSelector,
  VariableItem,
  WhenItem,
} from '../../models/datamapper/mapping';
import { XPathOutputKind } from '../../models/datamapper/xpath';
import { XmlSchemaDocumentUtilService } from '../document/xml-schema/xml-schema-document-util.service';
import { PathExprNode, StepExprNode, XPathNodeType } from '../xpath/syntaxtree/xpath-syntaxtree-model';
import { XPathUtil } from '../xpath/syntaxtree/xpath-syntaxtree-util';
import { XPathService } from '../xpath/xpath.service';
import { MappingService } from './mapping.service';

/**
 * How a `xsl:copy-of` is placed among its field's children.
 * - `empty`: the `select` is blank, so the copy-of is a separate node placed first.
 * - `child`: 1-to-1 with one child element of the field, so the copy-of lives inline on that child
 *   and is positioned by the child's `xs:sequence` position.
 * - `other`: anything else (wildcard, `node()`, union, variable, function, attribute step,
 *   unmatched path), a separate node. The serializer places it by what it writes: with the attributes
 *   when it returns attributes ({@link CopyOfPlacementService.getAttributeOutputBucket}), otherwise by its
 *   anchor fields, or last when it has none. The canvas draws it in the same group.
 */
export type CopyOfClassification = { kind: 'empty' } | { kind: 'other' } | { kind: 'child'; field: IField };

const EMPTY: CopyOfClassification = { kind: 'empty' };
const OTHER: CopyOfClassification = { kind: 'other' };

/**
 * Single source of truth for where a `xsl:copy-of` goes, and what any mapping item writes. The canvas, the
 * serializer and the deserializer all place a copy-of through it, and that placement depends only on the
 * expression, the namespaces and the target schema, so the three always agree. What an item writes
 * ({@link CopyOfPlacementService.getOutputKind}, {@link CopyOfPlacementService.getAttributeOutputBucket}) also
 * depends on the item's children and its enclosing loops.
 */
export class CopyOfPlacementService {
  /**
   * Classifies a copy-of `select` expression against the children of `parentField`.
   * @param expression - the `select` expression
   * @param parentField - the field (or document) whose element holds the copy-of's output
   * @param namespaceMap - the namespace URI of each prefix used in the expression
   * @param owner - the mapping item that directly contains the copy-of, used to resolve `.` through
   * an enclosing `xsl:for-each`
   */
  static classify(
    expression: string,
    parentField: IParentType,
    namespaceMap: Record<string, string>,
    owner?: MappingParentType,
  ): CopyOfClassification {
    const trimmed = expression.trim();
    if (!trimmed) return EMPTY;

    const path = CopyOfPlacementService.parseSinglePath(trimmed);
    if (!path) return OTHER;
    const field = CopyOfPlacementService.resolvePathField(path, parentField, namespaceMap, owner);
    return field ? { kind: 'child', field } : OTHER;
  }

  /**
   * The child fields of `parentField` that a copy-of `select` expression returns, in the order they are
   * written. A single path gives the field {@link classify} would inline; any other expression gives every
   * path among its result expressions ({@link XPathUtil.getResultExpressions}) that resolves to a child. So
   * a comma list, a union (`a | b`), parentheses and both branches of `if (c) then a else b` anchor on every
   * field they name, while `a intersect b` and `a except b` anchor on `a` only, because `b` is not in the
   * result. Paths that don't resolve (wildcard, `node()`, attribute, variable, function, unknown name)
   * contribute nothing, so such a copy-of is anchored on the fields it does name, and one that names none has
   * no anchor.
   * @param expression - the `select` expression
   * @param parentField - the field (or document) whose element holds the copy-of's output
   * @param namespaceMap - the namespace URI of each prefix used in the expression
   * @param owner - the mapping item that directly contains the copy-of
   */
  private static getReferencedFields(
    expression: string,
    parentField: IParentType,
    namespaceMap: Record<string, string>,
    owner?: MappingParentType,
  ): IField[] {
    const trimmed = expression.trim();
    if (!trimmed) return [];
    const parsed = XPathService.parse(trimmed);
    if (parsed.parseErrors.length > 0 || parsed.lexErrors.length > 0) return [];

    const fields: IField[] = [];
    for (const result of XPathUtil.getResultExpressions(parsed.exprNode)) {
      if (result.type !== XPathNodeType.PathExpr) continue;
      const field = CopyOfPlacementService.resolvePathField(result, parentField, namespaceMap, owner);
      if (field && !fields.includes(field)) fields.push(field);
    }
    return fields;
  }

  /**
   * Whether `item` writes attributes, children, both, or nothing into the element that receives its output,
   * which decides where it may go among its siblings (XTDE0410: attributes must precede children).
   *
   * A copy-of is judged by its `select` ({@link XPathService.getOutputKind}), with `.` resolved through the
   * nearest enclosing `xsl:for-each`. A field item writes an attribute or an element, a value-of writes text,
   * and a variable writes nothing. An instruction combines what its body writes, and `xsl:choose` combines every
   * branch, since any of them may run. An {@link UnknownMappingItem} (`xsl:element`, `xsl:call-template`, …)
   * counts as writing children: an instruction holding one next to an attribute then writes both, which keeps
   * `xsl:if { xsl:attribute a, xsl:element X }` out of the attributes-only group. The rarer unknown item that
   * writes attributes is misplaced by this, a deliberate trade-off that only imported stylesheets can reach.
   * @param item - the mapping item to classify
   */
  static getOutputKind(item: MappingItem): XPathOutputKind {
    if (item instanceof CopyOfSelector) return CopyOfPlacementService.getCopyOfOutputKind(item);
    if (item instanceof ValueOfSelector) return XPathOutputKind.CHILDREN;
    if (item instanceof FieldItem)
      return item.field.isAttribute ? XPathOutputKind.ATTRIBUTES : XPathOutputKind.CHILDREN;
    if (item instanceof VariableItem) return XPathOutputKind.EMPTY;
    if (item instanceof UnknownMappingItem) return XPathOutputKind.CHILDREN;
    if (item instanceof ChooseItem) {
      const branches = [...item.when, item.otherwise].filter((branch): branch is WhenItem | OtherwiseItem => !!branch);
      return CopyOfPlacementService.combineItemOutputKinds(branches);
    }
    if (item instanceof InstructionItem) return CopyOfPlacementService.combineItemOutputKinds(item.children);
    return XPathOutputKind.CHILDREN;
  }

  /**
   * The attribute bucket of `item`, from its {@link getOutputKind}:
   * - {@link MappingItemOrderBucket.ATTRIBUTE} when it writes only attributes, through `xsl:attribute`
   *   fields or copied from the source;
   * - {@link MappingItemOrderBucket.ATTRIBUTES_AND_CHILDREN} when it can write both;
   * - `undefined` when it writes nothing ({@link XPathOutputKind.EMPTY}) or only children.
   * @param item - the mapping item to classify
   */
  static getAttributeOutputBucket(item: MappingItem): AttributeOutputBucket | undefined {
    const kind = CopyOfPlacementService.getOutputKind(item);
    if (kind === XPathOutputKind.ATTRIBUTES_AND_CHILDREN) return MappingItemOrderBucket.ATTRIBUTES_AND_CHILDREN;
    return kind === XPathOutputKind.ATTRIBUTES ? MappingItemOrderBucket.ATTRIBUTE : undefined;
  }

  private static combineItemOutputKinds(items: MappingItem[]): XPathOutputKind {
    const kinds: XPathOutputKind[] = [];
    for (const item of items) {
      kinds.push(CopyOfPlacementService.getOutputKind(item));
    }
    return XPathService.combineOutputKinds(kinds);
  }

  private static getCopyOfOutputKind(selector: CopyOfSelector): XPathOutputKind {
    if (!selector.expression.trim()) return XPathOutputKind.EMPTY;
    return XPathService.getOutputKind(selector.expression, () =>
      CopyOfPlacementService.getContextItemKind(selector.parent),
    );
  }

  /**
   * The kind of the context item `.` for a copy-of directly inside `owner`: the `select` of the nearest
   * enclosing `xsl:for-each` or `xsl:for-each-group`, judged from the loop's own position. In a
   * `for-each-group`, `.` is the first item of the current group, which comes from the group's `select`.
   * Unlike {@link findEnclosingLoop}, this walks through field items too, because a literal result element
   * doesn't change the context item. `MappingService.wrapWithForEach` and `wrapWithForEachGroup` put the loop
   * around the target field, so `for-each select="@*"` > `Item` > `copy-of select="."` is the shape the UI
   * creates. A copy-of outside any loop counts as children. `current-group()` is a function call, so it
   * counts as children whatever the group's `select` is.
   */
  private static getContextItemKind(owner: MappingParentType): XPathOutputKind {
    let current: MappingParentType = owner;
    while (current instanceof MappingItem) {
      if (current instanceof ForEachItem || current instanceof ForEachGroupItem) {
        const loop = current;
        return XPathService.getOutputKind(loop.expression, () =>
          CopyOfPlacementService.getContextItemKind(loop.parent),
        );
      }
      current = current.parent;
    }
    return XPathOutputKind.CHILDREN;
  }

  private static resolvePathField(
    path: PathExprNode,
    parentField: IParentType,
    namespaceMap: Record<string, string>,
    owner?: MappingParentType,
  ): IField | undefined {
    if (path.steps.length === 0) return undefined;

    if (CopyOfPlacementService.isContextItem(path)) {
      const result = CopyOfPlacementService.classifyThroughForEach(parentField, namespaceMap, owner);
      return result.kind === 'child' ? result.field : undefined;
    }

    // Unlike `.` above, a named path is never the loop's own iteration variable, so it can't be 1-to-1
    // with the loop's repeated field — the output repeats once per iteration regardless of what it
    // names. A `for-each` whose own `select` is schema-guaranteed to return at most one node is a
    // theoretical exception left unhandled: no realistic stylesheet wraps a single copy-of in such a
    // loop instead of `xsl:if`, which already stays transparent.
    if (CopyOfPlacementService.findEnclosingLoop(owner)) return undefined;

    const step = path.steps[path.steps.length - 1];
    if (!CopyOfPlacementService.isChildNameTest(step)) return undefined;

    const { prefix, localName } = step.nodeTest!;
    let namespaceURI = '';
    if (prefix) {
      const resolved = namespaceMap[prefix];
      if (!resolved) return undefined;
      namespaceURI = resolved;
    }

    const field = XmlSchemaDocumentUtilService.getChildField(parentField, localName, namespaceURI);
    return field && !field.isAttribute ? field : undefined;
  }

  /**
   * Whether the item sorts and renders first among its siblings: an empty copy-of, or an
   * instruction that contains nothing but empty copy-ofs. `xsl:when` and `xsl:otherwise` branches never
   * lead: their order inside `xsl:choose` is authored (`otherwise` last), whatever they contain.
   */
  static isLeadingCopyOf(item: MappingItem): boolean {
    if (item instanceof CopyOfSelector) {
      return !item.expression.trim();
    }
    if (item instanceof WhenItem || item instanceof OtherwiseItem) return false;
    if (item instanceof InstructionItem) {
      return item.children.length > 0 && item.children.every((child) => CopyOfPlacementService.isLeadingCopyOf(child));
    }
    return false;
  }

  /**
   * The field (or, directly under the mapping tree, the target document) whose element receives the output
   * of items placed in `owner`, looking through instruction wrappers (loops included). `undefined` when the
   * output lands somewhere with no field, such as directly under `xsl:template` of a primitive document.
   */
  static getContextField(owner: MappingParentType): IParentType | undefined {
    const outputParent = owner instanceof InstructionItem ? MappingService.findOutputParent(owner) : owner;
    if (outputParent instanceof FieldItem) return outputParent.field;
    if (outputParent instanceof MappingTree) {
      const document = outputParent.targetDocument;
      return document instanceof PrimitiveDocument ? undefined : document;
    }
    return undefined;
  }

  /**
   * Classifies a {@link CopyOfSelector} from its own position in the mapping tree: the context field is
   * the one that receives its output (looking through instruction wrappers) and the prefixes come from
   * the mapping tree. Nothing is stored on the selector, so the answer follows every edit of its
   * expression. A copy-of with no enclosing field, such as one directly under `xsl:template`, is `other`.
   */
  static classifyItem(selector: CopyOfSelector): CopyOfClassification {
    const contextField = CopyOfPlacementService.getContextField(selector.parent);
    if (!contextField) return selector.expression.trim() ? OTHER : EMPTY;
    return CopyOfPlacementService.classify(
      selector.expression,
      contextField,
      selector.mappingTree.namespaceMap,
      selector.parent,
    );
  }

  /**
   * Whether a copy-of nested inside `fieldItem` brings that field's own element, i.e. it is 1-to-1 with
   * `fieldItem.field` when judged from the field item's parent. Such a copy-of is the wholesale copy of the
   * container and is dropped once one of the container's children is mapped explicitly.
   */
  static selectsElementOf(selector: CopyOfSelector, fieldItem: FieldItem): boolean {
    if (!selector.expression.trim()) return false;
    const outerField = CopyOfPlacementService.getContextField(fieldItem.parent);
    if (!outerField) return false;
    const result = CopyOfPlacementService.classify(
      selector.expression,
      outerField,
      fieldItem.mappingTree.namespaceMap,
      fieldItem.parent,
    );
    return result.kind === 'child' && result.field === fieldItem.field;
  }

  /**
   * Every child field a copy-of returns, in written order: what it is anchored on when the target's
   * `xs:sequence` places it among its siblings. For a copy-of that writes only children, the serializer sorts
   * by the earliest of them in schema order and the canvas renders the copy-of at the same place, so the two
   * agree. A copy-of that writes attributes is placed by {@link getAttributeOutputBucket} instead, on both sides.
   */
  static getAnchorFields(selector: CopyOfSelector): IField[] {
    const contextField = CopyOfPlacementService.getContextField(selector.parent);
    if (!contextField) return [];
    return CopyOfPlacementService.getReferencedFields(
      selector.expression,
      contextField,
      selector.mappingTree.namespaceMap,
      selector.parent,
    );
  }

  /** The field a copy-of is 1-to-1 with, i.e. the row it is drawn on, or `undefined` when it is standalone. */
  static getInlineField(selector: CopyOfSelector): IField | undefined {
    const result = CopyOfPlacementService.classifyItem(selector);
    return result.kind === 'child' ? result.field : undefined;
  }

  private static parseSinglePath(expression: string): PathExprNode | undefined {
    const parsed = XPathService.parse(expression);
    if (parsed.parseErrors.length > 0 || parsed.lexErrors.length > 0) return undefined;
    const expressions = parsed.exprNode?.expressions;
    if (expressions?.length !== 1 || expressions[0].type !== XPathNodeType.PathExpr) return undefined;
    return expressions[0];
  }

  private static isContextItem(path: PathExprNode): boolean {
    if (path.steps.length !== 1) return false;
    const filterExpr = path.steps[0].filterExpr;
    return (
      filterExpr?.primary.type === XPathNodeType.ContextItemExpr &&
      filterExpr.predicates.length === 0 &&
      path.steps[0].predicates.length === 0
    );
  }

  private static isChildNameTest(step: StepExprNode): boolean {
    if (step.filterExpr || step.reverseStep || step.isAttribute) return false;
    if (step.axis && step.axis !== 'child') return false;
    const localName = step.nodeTest?.localName;
    return !!localName && localName !== '*';
  }

  /** `.` selects the iterated item of the nearest `xsl:for-each`, so classify that loop's `select`. */
  private static classifyThroughForEach(
    parentField: IParentType,
    namespaceMap: Record<string, string>,
    owner?: MappingParentType,
  ): CopyOfClassification {
    const loop = CopyOfPlacementService.findEnclosingLoop(owner);
    if (!(loop instanceof ForEachItem)) return OTHER;
    const result = CopyOfPlacementService.classify(loop.expression, parentField, namespaceMap, loop.parent);
    return result.kind === 'child' ? result : OTHER;
  }

  /**
   * The nearest `xsl:for-each`/`xsl:for-each-group` enclosing `owner`, walking up through other
   * instruction wrappers (`xsl:if`, `xsl:choose`/`when`/`otherwise`) that don't themselves repeat
   * output, or `undefined` when no loop encloses it.
   */
  private static findEnclosingLoop(owner?: MappingParentType): ForEachItem | ForEachGroupItem | undefined {
    let current = owner;
    while (current instanceof InstructionItem) {
      if (current instanceof ForEachGroupItem || current instanceof ForEachItem) return current;
      current = current.parent;
    }
    return undefined;
  }
}
