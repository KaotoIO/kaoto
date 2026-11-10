import { IField, IParentType } from '../../models/datamapper/document';
import {
  ChooseItem,
  CopyOfSelector,
  CopyOfType,
  FieldItem,
  ForEachGroupItem,
  ForEachItem,
  InstructionItem,
  MappingItem,
  MappingParentType,
  OtherwiseItem,
  WhenItem,
} from '../../models/datamapper/mapping';
import { XmlSchemaDocumentUtilService } from '../document/xml-schema/xml-schema-document-util.service';
import { PathExprNode, StepExprNode, XPathNodeType } from '../xpath/syntaxtree/xpath-syntaxtree-model';
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
    if (!path || path.steps.length === 0) return OTHER;

    if (CopyOfPlacementService.isContextItem(path)) {
      return CopyOfPlacementService.classifyThroughForEach(parentField, resolveNamespace, owner);
    }

    const step = path.steps[path.steps.length - 1];
    if (!CopyOfPlacementService.isChildNameTest(step)) return OTHER;

    const { prefix, localName } = step.nodeTest!;
    let namespaceURI = '';
    if (prefix) {
      const resolved = resolveNamespace(prefix);
      if (!resolved) return OTHER;
      namespaceURI = resolved;
    }

    const field = XmlSchemaDocumentUtilService.getChildField(parentField, localName, namespaceURI);
    if (!field || field.isAttribute) return OTHER;
    return { kind: 'child', field };
  }

  /**
   * Whether the item sorts and renders first among its siblings: an empty copy-of, or an
   * instruction that contains nothing but empty copy-ofs. `xsl:when` and `xsl:otherwise` branches never
   * lead: their order inside `xsl:choose` is authored (`otherwise` last), whatever they contain.
   */
  static isLeadingCopyOf(item: MappingItem): boolean {
    if (item instanceof CopyOfSelector) {
      return item.valueType === CopyOfType.CONTAINER_NODE && !item.expression.trim();
    }
    if (item instanceof WhenItem || item instanceof OtherwiseItem) return false;
    if (item instanceof InstructionItem) {
      return item.children.length > 0 && item.children.every((child) => CopyOfPlacementService.isLeadingCopyOf(child));
    }
    return false;
  }

  /**
   * The field whose element receives the output of items placed in `owner`, looking through
   * instruction wrappers (loops included). `undefined` when the output lands somewhere with no
   * field, such as directly under `xsl:template`.
   */
  static getContextField(owner: MappingParentType): IField | undefined {
    const outputParent = owner instanceof InstructionItem ? MappingService.findOutputParent(owner) : owner;
    return outputParent instanceof FieldItem ? outputParent.field : undefined;
  }

  /**
   * Whether an inline (`CONTAINER`) copy-of really selects the field of the {@link FieldItem} that
   * carries it. When that can't be checked because no enclosing field is known, the copy-of is
   * trusted.
   */
  static selectsOwnField(selector: CopyOfSelector, fieldItem: FieldItem, resolveNamespace: NamespaceResolver): boolean {
    if (selector.valueType !== CopyOfType.CONTAINER) return false;
    const contextField = CopyOfPlacementService.getContextField(fieldItem.parent);
    if (!contextField) return true;
    const result = CopyOfPlacementService.classify(
      selector.expression,
      contextField,
      resolveNamespace,
      fieldItem.parent,
    );
    return result.kind === 'child' && result.field === fieldItem.field;
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
