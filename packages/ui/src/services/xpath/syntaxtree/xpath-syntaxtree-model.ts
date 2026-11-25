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
  ArithmeticExpr = 'ArithmeticExpr',
  LogicalExpr = 'LogicalExpr',
  NameTest = 'NameTest',
  ReverseStep = 'ReverseStep',
  ParenthesizedExpr = 'ParenthesizedExpr',
  Expr = 'Expr',
  IfExpr = 'IfExpr',
  CombineExpr = 'CombineExpr',
  AtomicExpr = 'AtomicExpr',
  UnsupportedExpr = 'UnsupportedExpr',
}

/**
 * Arithmetic operators for mathematical expressions.
 * Used in ArithmeticExprNode to represent operations like addition, multiplication, etc.
 */
export enum ArithmeticOperator {
  Plus = 'Plus',
  Minus = 'Minus',
  Multiply = 'Multiply',
  Div = 'Div',
  Idiv = 'Idiv',
  Mod = 'Mod',
}

/**
 * Logical operators for boolean expressions.
 * Used in LogicalExprNode to represent AND/OR operations.
 */
export enum LogicalOperator {
  And = 'And',
  Or = 'Or',
}

/**
 * Operators that combine node sequences (XPath 2.0 §3.3.2).
 * Used in CombineExprNode. `|` and `union` are synonyms in the grammar, so both map to Union.
 */
export enum CombineOperator {
  Union = 'Union',
  Intersect = 'Intersect',
  Except = 'Except',
}

/**
 * Operators whose result is atomic values, never nodes, even when their operand is a path: a sign (`-@a`),
 * `cast as`, `castable as`, `instance of` and the range `to`. `treat as` is not one of them, because it returns
 * its operand unchanged.
 */
export enum AtomicOperator {
  UnaryPlus = 'UnaryPlus',
  UnaryMinus = 'UnaryMinus',
  Cast = 'Cast',
  Castable = 'Castable',
  InstanceOf = 'InstanceOf',
  Range = 'Range',
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
  | ArithmeticExprNode
  | LogicalExprNode
  | CombineExprNode
  | LiteralNode
  | FunctionCallNode
  | VarRefNode
  | ParenthesizedExprNode
  | IfExprNode
  | AtomicExprNode
  | UnsupportedExprNode;

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
  /** One entry per argument, holding the argument's expression as written (operators, parentheses and
   * all), not only the paths in it. Consumers that need only the paths collect them with `XPathUtil.getAllNodesOfType`. */
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
 * - `price * quantity` (arithmetic expression)
 * - `condition1 and condition2` (logical expression)
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
  /** Each operand is the expression as written. A bare literal operand is a {@link LiteralNode}, not a path. */
  left: ExprSingleNode;
  operator: PredicateOperator;
  right?: ExprSingleNode;
}

/**
 * Arithmetic expression for mathematical operations.
 * Represents binary arithmetic operations like addition, subtraction, multiplication, division, etc.
 * Examples:
 * - `price * quantity` (multiplication)
 * - `total + tax` (addition)
 * - `amount - discount` (subtraction)
 * - `price div quantity` (division)
 * - `count mod 10` (modulo)
 * - `a + b + c` (chained operations, represented as nested ArithmeticExprNode)
 */
export interface ArithmeticExprNode extends XPathNode {
  type: XPathNodeType.ArithmeticExpr;
  left: ExprSingleNode;
  operator: ArithmeticOperator;
  right: ExprSingleNode;
}

/**
 * Logical expression for boolean operations.
 * Represents binary logical operations like AND and OR.
 * Examples:
 * - `condition1 and condition2` (logical AND)
 * - `condition1 or condition2` (logical OR)
 * - `(price > 100) and (quantity < 10)` (compound conditions)
 * - `cond1 and cond2 and cond3` (chained operations, represented as nested LogicalExprNode)
 */
export interface LogicalExprNode extends XPathNode {
  type: XPathNodeType.LogicalExpr;
  left: ExprSingleNode;
  operator: LogicalOperator;
  right: ExprSingleNode;
}

/**
 * Expression combining two node sequences with `|`/`union`, `intersect` or `except`.
 * Examples:
 * - `/a | /b` (union — both operands contribute, so both render a mapping line)
 * - `a union b` (same operator, keyword spelling)
 * - `a intersect b`, `a except b`
 * - `a | b | c` (chained operations, represented as nested CombineExprNode)
 *
 * Mixed operators nest by precedence and left-associativity, so `b intersect c except d` is
 * `Except(Intersect(b, c), d)` and `a | b intersect c` is `Union(a, Intersect(b, c))`.
 */
export interface CombineExprNode extends XPathNode {
  type: XPathNodeType.CombineExpr;
  left: ExprSingleNode;
  operator: CombineOperator;
  right: ExprSingleNode;
}

/**
 * An operator whose result is atomic values, never nodes ({@link AtomicOperator}). The operands are kept, so
 * the paths inside `@a cast as xs:string` still count as sources, but the expression as a whole is not a path:
 * an `xsl:copy-of` of it writes text, not the attribute.
 * Examples: `-@a`, `@a cast as xs:string`, `@a castable as xs:string`, `@a instance of attribute()`, `@a to 7`.
 */
export interface AtomicExprNode extends XPathNode {
  type: XPathNodeType.AtomicExpr;
  operator: AtomicOperator;
  /** One operand, or two for {@link AtomicOperator.Range}. */
  operands: ExprSingleNode[];
}

/**
 * An expression the syntax tree doesn't model: `for … return`, `some … satisfies` or `every … satisfies`.
 * Only its range and keyword are kept, so it can't be told apart from other expressions of the same keyword,
 * and no paths are read from it.
 */
export interface UnsupportedExprNode extends XPathNode {
  type: XPathNodeType.UnsupportedExpr;
  keyword: 'for' | 'some' | 'every';
}

/**
 * Checks that a node map has one entry per {@link XPathNodeType} member and that each entry's `type` is that
 * member. A missing member or a mismatched interface fails the constraint at compile time.
 */
export type CompleteXPathNodeMap<T extends { [K in XPathNodeType]: XPathNode & { type: K } }> = T;

/**
 * The node interface of every {@link XPathNodeType} member. A new node type must be added here, which makes the
 * child walk (`XPathUtil.getChildren`) fail to compile until it has a case for it; a type that is also an
 * {@link ExprSingleNode} member needs a result-walk case (`XPathUtil.getResultExpressions`) too.
 */
export type XPathNodeMap = CompleteXPathNodeMap<{
  [XPathNodeType.PathExpr]: PathExprNode;
  [XPathNodeType.StepExpr]: StepExprNode;
  [XPathNodeType.FilterExpr]: FilterExprNode;
  [XPathNodeType.FunctionCall]: FunctionCallNode;
  [XPathNodeType.VarRef]: VarRefNode;
  [XPathNodeType.Literal]: LiteralNode;
  [XPathNodeType.ContextItemExpr]: ContextItemExprNode;
  [XPathNodeType.Predicate]: PredicateNode;
  [XPathNodeType.ComparisonExpr]: ComparisonExprNode;
  [XPathNodeType.ArithmeticExpr]: ArithmeticExprNode;
  [XPathNodeType.LogicalExpr]: LogicalExprNode;
  [XPathNodeType.NameTest]: NameTestNode;
  [XPathNodeType.ReverseStep]: ReverseStepNode;
  [XPathNodeType.ParenthesizedExpr]: ParenthesizedExprNode;
  [XPathNodeType.Expr]: ExprNode;
  [XPathNodeType.IfExpr]: IfExprNode;
  [XPathNodeType.CombineExpr]: CombineExprNode;
  [XPathNodeType.AtomicExpr]: AtomicExprNode;
  [XPathNodeType.UnsupportedExpr]: UnsupportedExprNode;
}>;

/**
 * Any syntax tree node, as a closed union that narrows on `type`. {@link XPathNode} stays the common shape and
 * the type of `parent`.
 */
export type XPathSyntaxNode = XPathNodeMap[XPathNodeType];
