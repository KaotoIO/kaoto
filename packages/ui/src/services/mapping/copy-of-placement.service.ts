import { IField, IParentType, PrimitiveDocument } from '../../models/datamapper/document';
import {
  ChooseItem,
  CopyOfSelector,
  FieldItem,
  ForEachGroupItem,
  ForEachItem,
  InstructionItem,
  MappingItem,
  MappingParentType,
  MappingTree,
  OtherwiseItem,
  WhenItem,
} from '../../models/datamapper/mapping';
import { XmlSchemaDocumentUtilService } from '../document/xml-schema/xml-schema-document-util.service';
import {
  ExprNode,
  ExprSingleNode,
  PathExprNode,
  StepExprNode,
  XPathNodeType,
} from '../xpath/syntaxtree/xpath-syntaxtree-model';
import { XPathService } from '../xpath/xpath.service';
import { MappingService } from './mapping.service';

/**
 * How a `xsl:copy-of` is placed among its field's children.
 * - `empty`: the `select` is blank, so the copy-of is a separate node placed first.
 * - `child`: 1-to-1 with one child element of the field, so the copy-of lives inline on that child
 *   and is positioned by the child's `xs:sequence` position.
 * - `other`: anything else (wildcard, `node()`, union, variable, function, attribute step,
 *   unmatched path), a separate node placed last.
 */
export type CopyOfClassification = { kind: 'empty' } | { kind: 'other' } | { kind: 'child'; field: IField };

/** Resolves a namespace prefix to its URI, or returns a falsy value when the prefix is unknown. */
export type NamespaceResolver = (prefix: string) => string | null | undefined;

const EMPTY: CopyOfClassification = { kind: 'empty' };
const OTHER: CopyOfClassification = { kind: 'other' };

/**
 * Single source of truth for where a `xsl:copy-of` goes. The canvas, the serializer and the
 * deserializer all call it, and its result depends only on the expression, the namespaces and the
 * target schema, so the three always agree.
 */
export class CopyOfPlacementService {
  /**
   * Classifies a copy-of `select` expression against the children of `parentField`.
   * @param expression - the `select` expression
   * @param parentField - the field (or document) whose element holds the copy-of's output
   * @param resolveNamespace - resolves the prefixes used in the expression
   * @param owner - the mapping item that directly contains the copy-of, used to resolve `.` through
   * an enclosing `xsl:for-each`
   */
  static classify(
    expression: string,
    parentField: IParentType,
    resolveNamespace: NamespaceResolver,
    owner?: MappingParentType,
  ): CopyOfClassification {
    const trimmed = expression.trim();
    if (!trimmed) return EMPTY;

    const path = CopyOfPlacementService.parseSinglePath(trimmed);
    if (!path) return OTHER;
    const field = CopyOfPlacementService.resolvePathField(path, parentField, resolveNamespace, owner);
    return field ? { kind: 'child', field } : OTHER;
  }

  /**
   * The child fields of `parentField` that a copy-of `select` expression references, in the order they are
   * written. A single path gives the field {@link classify} would inline; a comma list, a union
   * (`a | b`) or parentheses give every path that resolves to a child. Paths that don't resolve (wildcard,
   * `node()`, attribute, variable, function, unknown name) contribute nothing, so such a copy-of is
   * anchored on the fields it does name, and one that names none has no anchor.
   * @param expression - the `select` expression
   * @param parentField - the field (or document) whose element holds the copy-of's output
   * @param resolveNamespace - resolves the prefixes used in the expression
   * @param owner - the mapping item that directly contains the copy-of
   */
  static getReferencedFields(
    expression: string,
    parentField: IParentType,
    resolveNamespace: NamespaceResolver,
    owner?: MappingParentType,
  ): IField[] {
    const trimmed = expression.trim();
    if (!trimmed) return [];
    const parsed = XPathService.parse(trimmed);
    if (parsed.parseErrors.length > 0 || parsed.lexErrors.length > 0) return [];

    const fields: IField[] = [];
    const visit = (node: ExprSingleNode | ExprNode | undefined): void => {
      if (!node) return;
      switch (node.type) {
        case XPathNodeType.Expr:
          node.expressions.forEach(visit);
          break;
        case XPathNodeType.PathExpr: {
          // `(a | b)` is a path of one step whose primary expression is the parenthesized group.
          const primary = node.steps.length === 1 ? node.steps[0].filterExpr?.primary : undefined;
          if (primary?.type === XPathNodeType.ParenthesizedExpr) {
            visit(primary);
            break;
          }
          const field = CopyOfPlacementService.resolvePathField(node, parentField, resolveNamespace, owner);
          if (field && !fields.includes(field)) fields.push(field);
          break;
        }
        case XPathNodeType.CombineExpr:
          visit(node.left);
          visit(node.right);
          break;
        case XPathNodeType.ParenthesizedExpr:
          visit(node.expr);
          break;
        default:
          break;
      }
    };
    visit(parsed.exprNode);
    return fields;
  }

  private static resolvePathField(
    path: PathExprNode,
    parentField: IParentType,
    resolveNamespace: NamespaceResolver,
    owner?: MappingParentType,
  ): IField | undefined {
    if (path.steps.length === 0) return undefined;

    if (CopyOfPlacementService.isContextItem(path)) {
      const result = CopyOfPlacementService.classifyThroughForEach(parentField, resolveNamespace, owner);
      return result.kind === 'child' ? result.field : undefined;
    }

    const step = path.steps[path.steps.length - 1];
    if (!CopyOfPlacementService.isChildNameTest(step)) return undefined;

    const { prefix, localName } = step.nodeTest!;
    let namespaceURI = '';
    if (prefix) {
      const resolved = resolveNamespace(prefix);
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
    const namespaceMap = selector.mappingTree.namespaceMap;
    return CopyOfPlacementService.classify(
      selector.expression,
      contextField,
      (prefix) => namespaceMap[prefix],
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
    const namespaceMap = fieldItem.mappingTree.namespaceMap;
    const result = CopyOfPlacementService.classify(
      selector.expression,
      outerField,
      (prefix) => namespaceMap[prefix],
      fieldItem.parent,
    );
    return result.kind === 'child' && result.field === fieldItem.field;
  }

  /**
   * Every child field a copy-of references, in written order: what it is anchored on when the target's
   * `xs:sequence` places it among its siblings. The serializer sorts by the earliest of them in schema order
   * and the canvas renders the copy-of at the same place, so the two agree.
   */
  static getAnchorFields(selector: CopyOfSelector): IField[] {
    const contextField = CopyOfPlacementService.getContextField(selector.parent);
    if (!contextField) return [];
    const namespaceMap = selector.mappingTree.namespaceMap;
    return CopyOfPlacementService.getReferencedFields(
      selector.expression,
      contextField,
      (prefix) => namespaceMap[prefix],
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
    resolveNamespace: NamespaceResolver,
    owner?: MappingParentType,
  ): CopyOfClassification {
    let current = owner;
    while (current instanceof InstructionItem) {
      if (current instanceof ForEachGroupItem) return OTHER;
      if (current instanceof ForEachItem) {
        const result = CopyOfPlacementService.classify(
          current.expression,
          parentField,
          resolveNamespace,
          current.parent,
        );
        return result.kind === 'child' ? result : OTHER;
      }
      current = current.parent;
    }
    return OTHER;
  }

  static canHostFieldItem(parent: MappingParentType): boolean {
    return (
      parent instanceof FieldItem ||
      (parent instanceof InstructionItem && !(parent instanceof ChooseItem) && !(parent instanceof ForEachGroupItem))
    );
  }
}
