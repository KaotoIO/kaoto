import { getCamelRandomId } from '../../camel-utils/camel-random-id';
import { XPathService } from '../../services/xpath/xpath.service';
import { DocumentDefinitionType, DocumentType, IField } from './document';
import { NodePath } from './nodepath';
import { Types } from './types';
import { PathExpression } from './xpath';

/** Valid parent types for any node in the mapping tree. */
export type MappingParentType = MappingTree | MappingItem;

/**
 * Root of the mapping tree for a single target document.
 * Holds top-level {@link MappingItem} children and shared state such as
 * the namespace map used when evaluating XPath expressions.
 */
export class MappingTree {
  constructor(
    documentType: DocumentType,
    documentId: string,
    public documentDefinitionType: DocumentDefinitionType,
  ) {
    this.nodePath = NodePath.fromDocument(documentType, documentId);
  }
  children: MappingItem[] = [];
  nodePath: NodePath;
  contextPath?: PathExpression;
  namespaceMap: { [prefix: string]: string } = {};
}

/**
 * Abstract base for every node in the mapping tree.
 * Subclasses represent either data mappings ({@link FieldItem}, {@link ValueSelector})
 * or XSLT instruction elements ({@link InstructionItem} subtypes).
 */
export abstract class MappingItem {
  constructor(
    public parent: MappingParentType,
    public name: string,
    public id: string,
  ) {
    this.mappingTree = parent instanceof MappingTree ? parent : parent.mappingTree;
  }
  /** The root {@link MappingTree} this item belongs to. */
  mappingTree: MappingTree;
  children: MappingItem[] = [];
  comment?: string;
  /**
   * {@link NodePath} representing this item's position in the **mapping tree** (XSLT output
   * structure). `xs:choice` is a schema compositor — not an XML element — so choice wrapper
   * segments are never included. Use {@link MappingLinksService.computeVisualTargetNodePath}
   * to obtain the corresponding visual document tree path that includes choice wrapper segments.
   */
  get nodePath(): NodePath {
    return NodePath.childOf(this.parent.nodePath, this.id);
  }
  /** XPath context path inherited from the nearest enclosing {@link ForEachItem}, or undefined at root. */
  get contextPath(): PathExpression | undefined {
    return this.parent.contextPath;
  }
  protected abstract doClone(): MappingItem;
  /** Returns a deep clone of this item, including all children. */
  clone(): MappingItem {
    const cloned = this.doClone();
    cloned.children = this.children.map((c) => {
      const cc = c.clone();
      cc.parent = cloned;
      return cc;
    });
    cloned.comment = this.comment;
    return cloned;
  }
}

/**
 * Maps a target schema field. Corresponds to an output XML element or attribute
 * in the generated XSLT template.
 */
export class FieldItem extends MappingItem {
  constructor(
    public parent: MappingParentType,
    public field: IField,
  ) {
    const name = field.id;
    super(parent, name, getCamelRandomId(name, 4));
  }
  doClone() {
    return new FieldItem(this.parent, this.field);
  }
}

/**
 * Implemented by any mapping item that carries an XPath expression,
 * such as {@link IfItem}, {@link WhenItem}, {@link ForEachItem}, and {@link ValueSelector}.
 */
export interface IExpressionHolder {
  expression: string;
}

/**
 * Runtime type guard for {@link IExpressionHolder}.
 * Use this instead of `instanceof` since interfaces are erased at runtime.
 * The narrowed type includes {@link MappingItem} so callers can access
 * both the expression and mapping tree properties without casting.
 */
export function isExpressionHolder(item: MappingItem): item is IExpressionHolder & MappingItem {
  return 'expression' in item;
}

/**
 * Abstract base for XSLT instruction elements (`xsl:if`, `xsl:choose`, `xsl:for-each`, etc.).
 * Instruction items control the structure and flow of the generated XSLT template
 * and are distinct from {@link FieldItem} (data) and {@link ValueSelector} (value expression).
 */
export abstract class InstructionItem extends MappingItem {
  constructor(
    public parent: MappingParentType,
    public name: string,
  ) {
    super(parent, name, getCamelRandomId(name, 4));
  }
}

/** Represents an `xsl:if` instruction. Renders its children only when {@link expression} evaluates to true. */
export class IfItem extends InstructionItem implements IExpressionHolder {
  constructor(public parent: MappingParentType) {
    super(parent, 'if');
  }
  expression = '';
  doClone() {
    return new IfItem(this.parent);
  }
  clone() {
    const cloned = super.clone() as IfItem;
    cloned.expression = this.expression;
    return cloned;
  }
}

/**
 * Represents an `xsl:choose` instruction.
 * Children are {@link WhenItem} branches and an optional {@link OtherwiseItem} fallback.
 */
export class ChooseItem extends InstructionItem {
  constructor(
    public parent: MappingParentType,
    public field?: IField,
  ) {
    super(parent, 'choose');
  }
  get when() {
    return this.children.filter((c) => c instanceof WhenItem) as WhenItem[];
  }
  get otherwise(): OtherwiseItem | undefined {
    return this.children.find((c): c is OtherwiseItem => c instanceof OtherwiseItem);
  }
  doClone() {
    return new ChooseItem(this.parent, this.field);
  }
}

/** Represents an `xsl:when` branch inside a {@link ChooseItem}. Active when {@link expression} evaluates to true. */
export class WhenItem extends InstructionItem implements IExpressionHolder {
  constructor(public parent: MappingParentType) {
    super(parent, 'when');
  }
  expression = '';
  doClone() {
    return new WhenItem(this.parent);
  }
  clone() {
    const cloned = super.clone() as WhenItem;
    cloned.expression = this.expression;
    return cloned;
  }
}

/** Represents the `xsl:otherwise` fallback branch inside a {@link ChooseItem}. */
export class OtherwiseItem extends InstructionItem {
  constructor(public parent: MappingParentType) {
    super(parent, 'otherwise');
  }
  doClone() {
    return new OtherwiseItem(this.parent);
  }
}

const extractContextPath = (item: ForEachItem | ForEachGroupItem) => {
  const answer = XPathService.extractFieldPaths(item.expression)[0];
  if (answer) {
    const pathExpr = new PathExpression(item.parent.contextPath, answer.isRelative);
    pathExpr.pathSegments = answer.pathSegments;
    pathExpr.documentReferenceName = answer.documentReferenceName;
    return pathExpr;
  }
  return item.parent.contextPath;
};

/**
 * Represents an `xsl:for-each` instruction.
 * {@link expression} selects the node-set to iterate over.
 * Overrides {@link contextPath} so that descendant XPath expressions
 * are evaluated relative to each iteration node.
 */
export class ForEachItem extends InstructionItem implements IExpressionHolder {
  constructor(public parent: MappingParentType) {
    super(parent, 'for-each');
  }

  expression = '';

  get contextPath(): PathExpression | undefined {
    return extractContextPath(this);
  }

  sortItems: SortItem[] = [];

  doClone() {
    const cloned = new ForEachItem(this.parent);
    cloned.sortItems = this.sortItems.map((sort) => {
      return {
        expression: sort.expression,
        order: sort.order,
      } as SortItem;
    });
    return cloned;
  }

  clone() {
    const cloned = super.clone() as ForEachItem;
    cloned.expression = this.expression;
    return cloned;
  }
}

/** Selects which grouping attribute is emitted on `xsl:for-each-group`. */
export enum GroupingStrategy {
  GROUP_BY = 'group-by',
  GROUP_ADJACENT = 'group-adjacent',
  GROUP_STARTING_WITH = 'group-starting-with',
  GROUP_ENDING_WITH = 'group-ending-with',
}

/**
 * Represents an `xsl:for-each-group` instruction.
 * {@link expression} selects the population to group; {@link groupingStrategy}
 * and {@link groupingExpression} control the grouping attribute.
 * Overrides {@link contextPath} so that descendant XPath expressions
 * are evaluated relative to each group.
 */
export class ForEachGroupItem extends InstructionItem implements IExpressionHolder {
  constructor(public parent: MappingParentType) {
    super(parent, 'for-each-group');
  }

  expression = '';
  groupingStrategy: GroupingStrategy = GroupingStrategy.GROUP_BY;
  groupingExpression = '';

  get contextPath(): PathExpression | undefined {
    return extractContextPath(this);
  }

  sortItems: SortItem[] = [];

  doClone() {
    const cloned = new ForEachGroupItem(this.parent);
    cloned.sortItems = this.sortItems.map((sort) => {
      return {
        expression: sort.expression,
        order: sort.order,
      } as SortItem;
    });
    return cloned;
  }

  clone() {
    const cloned = super.clone() as ForEachGroupItem;
    cloned.expression = this.expression;
    cloned.groupingStrategy = this.groupingStrategy;
    cloned.groupingExpression = this.groupingExpression;
    return cloned;
  }
}

/** Sorting criteria for an `xsl:sort` element. Used by `xsl:for-each` and `xsl:for-each-group` instructions. */
export class SortItem {
  expression: string = '';
  order: 'ascending' | 'descending' = 'ascending';
}

/** Distinguishes how a {@link ValueSelector} produces its output in the generated XSLT. */
export enum ValueType {
  /** Emits a text value via `xsl:value-of`. */
  VALUE = 'value',
  /** Emits a structured element container. */
  CONTAINER = 'container',
  /** Emits an XML attribute. */
  ATTRIBUTE = 'attribute',
}

/**
 * Leaf node that supplies the value for a target {@link FieldItem}.
 * Serializes as `xsl:value-of` for scalar values and attributes,
 * or `xsl:copy-of` for container nodes, depending on {@link valueType}.
 */
export class ValueSelector extends MappingItem implements IExpressionHolder {
  constructor(
    public parent: MappingParentType,
    public valueType: ValueType = ValueType.VALUE,
  ) {
    super(parent, 'value', getCamelRandomId('value', 4));
  }
  expression = '';
  isLiteral = false;
  doClone() {
    return new ValueSelector(this.parent, this.valueType);
  }
  clone() {
    const cloned = super.clone() as ValueSelector;
    cloned.expression = this.expression;
    cloned.isLiteral = this.isLiteral;
    return cloned;
  }
}

export class UnknownMappingItem extends MappingItem {
  constructor(
    public parent: MappingParentType,
    public element: Element,
  ) {
    super(parent, 'unknown', getCamelRandomId(element.localName, 4));
  }
  doClone() {
    return new UnknownMappingItem(this.parent, this.element.cloneNode(true) as Element);
  }
}

/**
 * Represents an `xsl:variable` element.
 * {@link name} is the variable name; {@link expression} is the XPath `select` attribute value.
 * Can be a child of FieldItem, ForEachItem, IfItem, WhenItem, or OtherwiseItem.
 */
export class VariableItem extends MappingItem implements IExpressionHolder {
  constructor(
    public parent: MappingParentType,
    public name: string,
  ) {
    super(parent, name, getCamelRandomId(name, 4));
  }
  expression = '';
  doClone() {
    return new VariableItem(this.parent, this.name);
  }
  clone() {
    const cloned = super.clone() as VariableItem;
    cloned.expression = this.expression;
    return cloned;
  }
}

/** Describes an XPath/XSLT function available in the expression editor. */
export interface IFunctionDefinition {
  name: string;
  displayName: string;
  description: string;
  returnType: Types;
  returnCollection?: boolean;
  arguments: IFunctionArgumentDefinition[];
}

/** Describes a single argument of an {@link IFunctionDefinition}. */
export interface IFunctionArgumentDefinition {
  name: string;
  type: Types;
  displayName: string;
  description: string;
  minOccurs: number;
  maxOccurs: number;
}
