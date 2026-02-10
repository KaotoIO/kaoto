import { PredicateOperator } from '../../../models/datamapper/xpath';

/**
 * Location information for a node in the source XPath expression.
 * Tracks line, column, and character offset for both start and end positions.
 */
export interface SourceRange {
  start: {
    line: number;
    column: number;
    offset: number;
  };
  end: {
    line: number;
    column: number;
    offset: number;
  };
}

/**
 * Types of nodes in the XPath syntax tree.
 * Each type corresponds to a different XPath language construct.
 */
export enum XPathNodeType {
  PathExpr = 'PathExpr',
  StepExpr = 'StepExpr',
  FilterExpr = 'FilterExpr',
  FunctionCall = 'FunctionCall',
  VarRef = 'VarRef',
  Literal = 'Literal',
  ContextItemExpr = 'ContextItemExpr',
  Predicate = 'Predicate',
  ComparisonExpr = 'ComparisonExpr',
  NameTest = 'NameTest',
  ReverseStep = 'ReverseStep',
  ParenthesizedExpr = 'ParenthesizedExpr',
  Expr = 'Expr',
  IfExpr = 'IfExpr',
}

/**
 * Base interface for all XPath syntax tree nodes.
 * Every node has a type, source location, and optional parent reference.
 */
export interface XPathNode {
  type: XPathNodeType;
  range: SourceRange;
  parent?: XPathNode;
}

/**
 * Path expression in XPath.
 * Examples:
 * - `/foo/bar/baz` (absolute path)
 * - `person/name` (relative path)
 * - `$param/field` (path starting from variable)
 * - `@id` (attribute)
 * - `//item` (descendant-or-self)
 */
export interface PathExprNode extends XPathNode {
  type: XPathNodeType.PathExpr;
  isAbsolute: boolean;
  isDoubleSlash: boolean;
  steps: StepExprNode[];
}

/**
 * Individual step in a path expression.
 * Examples:
 * - `person` (element name)
 * - `@id` (attribute with isAttribute=true)
 * - `..` (parent, via reverseStep)
 * - `text()` (node test)
 * - `item[1]` (with predicates)
 */
export interface StepExprNode extends XPathNode {
  type: XPathNodeType.StepExpr;
  axis?: string;
  nodeTest?: NameTestNode | null;
  isAttribute: boolean;
  predicates: PredicateNode[];
  filterExpr?: FilterExprNode;
  reverseStep?: ReverseStepNode;
}

/**
 * Name of an element or attribute, optionally with namespace prefix.
 * Examples:
 * - `person` (simple name)
 * - `ns:person` (with namespace prefix)
 * - `id` (attribute name when used with @)
 */
export interface NameTestNode extends XPathNode {
  type: XPathNodeType.NameTest;
  prefix?: string;
  localName: string;
}

/**
 * Reverse axis step, typically parent navigation.
 * Examples:
 * - `..` (parent node, isParentReference=true)
 * - `ancestor::*` (ancestor axis)
 */
export interface ReverseStepNode extends XPathNode {
  type: XPathNodeType.ReverseStep;
  isParentReference: boolean;
  axis?: string;
  nodeTest?: NameTestNode;
}

/**
 * Expression with filter predicates.
 * Examples:
 * - `item[1]` (position predicate)
 * - `person[@id='123']` (attribute filter)
 * - `$var[position() > 1]` (function in predicate)
 */
export interface FilterExprNode extends XPathNode {
  type: XPathNodeType.FilterExpr;
  primary: PrimaryExprNode;
  predicates: PredicateNode[];
}

/**
 * Union type for primary expressions: literals, variables, functions, context item, or parenthesized expressions.
 */
export type PrimaryExprNode = LiteralNode | VarRefNode | ParenthesizedExprNode | ContextItemExprNode | FunctionCallNode;

/**
 * Union type for single expression nodes that can be returned by ExprSingle.
 * Represents individual XPath expressions including paths, comparisons, literals, function calls, variables, and if-else expressions.
 */
export type ExprSingleNode =
  | PathExprNode
  | ComparisonExprNode
  | LiteralNode
  | FunctionCallNode
  | VarRefNode
  | IfExprNode;

/**
 * Literal value in an XPath expression.
 * Examples:
 * - `"hello"` (string literal)
 * - `'world'` (string literal with single quotes)
 * - `123` (integer literal)
 * - `45.67` (decimal literal)
 * - `1.23e4` (double/scientific notation)
 */
export interface LiteralNode extends XPathNode {
  type: XPathNodeType.Literal;
  value: string | number;
  literalType: 'string' | 'integer' | 'decimal' | 'double';
}

/**
 * Variable reference in an XPath expression.
 * Examples:
 * - `$param` (simple variable)
 * - `$ns:variable` (with namespace prefix)
 * - `$param/field` (used in path expressions)
 */
export interface VarRefNode extends XPathNode {
  type: XPathNodeType.VarRef;
  prefix?: string;
  localName: string;
}

/**
 * Context item expression, representing the current node.
 * Examples:
 * - `.` (current context item)
 * - `./child` (relative path from context)
 */
export interface ContextItemExprNode extends XPathNode {
  type: XPathNodeType.ContextItemExpr;
}

/**
 * Function call expression.
 * Examples:
 * - `upper-case($name)` (single argument)
 * - `concat('Hello', ' ', 'World')` (multiple arguments)
 * - `position()` (no arguments)
 * - `ns:custom-function()` (with namespace prefix)
 */
export interface FunctionCallNode extends XPathNode {
  type: XPathNodeType.FunctionCall;
  prefix?: string;
  localName: string;
  arguments: ExprNode[];
}

/**
 * Parenthesized expression for grouping.
 * Examples:
 * - `(foo + bar)` (arithmetic grouping)
 * - `(condition)` (condition grouping)
 */
export interface ParenthesizedExprNode extends XPathNode {
  type: XPathNodeType.ParenthesizedExpr;
  expr?: ExprNode;
}

export interface IfExprNode extends XPathNode {
  type: XPathNodeType.IfExpr;
  condition: ExprNode;
  thenExpr: ExprSingleNode;
  elseExpr: ExprSingleNode;
}

/**
 * Top-level expression container, can hold one or more sub-expressions.
 * Examples:
 * - `/foo/bar` (single path expression)
 * - `concat(a, b, c)` (function with multiple expr arguments)
 * - `$var > 5` (comparison expression)
 */
export interface ExprNode extends XPathNode {
  type: XPathNodeType.Expr;
  expressions: ExprSingleNode[];
}

/**
 * Predicate for filtering nodes in a path expression.
 * Examples:
 * - `[1]` (position predicate)
 * - `[@id='123']` (attribute comparison)
 * - `[position() > 1]` (function-based filter)
 * - `[price < 100]` (numeric comparison)
 */
export interface PredicateNode extends XPathNode {
  type: XPathNodeType.Predicate;
  expr: ExprNode;
}

/**
 * Comparison expression within predicates.
 * Examples:
 * - `@id = '123'` (equality)
 * - `age > 18` (greater than)
 * - `price <= 100` (less than or equal)
 * - `status != 'inactive'` (not equal)
 */
export interface ComparisonExprNode extends XPathNode {
  type: XPathNodeType.ComparisonExpr;
  left: PathExprNode | LiteralNode | VarRefNode;
  operator: PredicateOperator;
  right?: PathExprNode | LiteralNode | VarRefNode;
}
