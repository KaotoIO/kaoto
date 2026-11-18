import {
  ArithmeticExprNode,
  AtomicExprNode,
  CombineExprNode,
  CombineOperator,
  ComparisonExprNode,
  ExprNode,
  ExprSingleNode,
  FilterExprNode,
  FunctionCallNode,
  IfExprNode,
  LogicalExprNode,
  ParenthesizedExprNode,
  PathExprNode,
  PredicateNode,
  ReverseStepNode,
  SourceRange,
  StepExprNode,
  XPathNode,
  XPathNodeType,
} from './xpath-syntaxtree-model';

/**
 * Utility functions for working with XPath syntax tree nodes.
 */
export class XPathUtil {
  /**
   * Creates a SourceRange object representing a location in XPath source.
   * @param startLine Starting line number
   * @param startColumn Starting column number
   * @param startOffset Starting character offset
   * @param endLine Ending line number (defaults to startLine)
   * @param endColumn Ending column number (defaults to startColumn)
   * @param endOffset Ending character offset (defaults to startOffset)
   */
  static createRange(
    startLine: number,
    startColumn: number,
    startOffset: number,
    endLine?: number,
    endColumn?: number,
    endOffset?: number,
  ): SourceRange {
    return {
      start: { line: startLine, column: startColumn, offset: startOffset },
      end: {
        line: endLine ?? startLine,
        column: endColumn ?? startColumn,
        offset: endOffset ?? startOffset,
      },
    };
  }

  private static traversePathExpr(node: PathExprNode, callback: (node: XPathNode) => void): void {
    for (const step of node.steps) {
      this.traverseNode(step, callback);
    }
  }

  private static traverseStepExpr(node: StepExprNode, callback: (node: XPathNode) => void): void {
    if (node.nodeTest) this.traverseNode(node.nodeTest, callback);
    for (const predicate of node.predicates) {
      this.traverseNode(predicate, callback);
    }
    if (node.filterExpr) this.traverseNode(node.filterExpr, callback);
    if (node.reverseStep) this.traverseNode(node.reverseStep, callback);
  }

  private static traverseFilterExpr(node: FilterExprNode, callback: (node: XPathNode) => void): void {
    this.traverseNode(node.primary, callback);
    for (const predicate of node.predicates) {
      this.traverseNode(predicate, callback);
    }
  }

  private static traverseFunctionCall(node: FunctionCallNode, callback: (node: XPathNode) => void): void {
    for (const arg of node.arguments) {
      this.traverseNode(arg, callback);
    }
  }

  private static traversePredicate(node: PredicateNode, callback: (node: XPathNode) => void): void {
    this.traverseNode(node.expr, callback);
  }

  private static traverseComparisonExpr(node: ComparisonExprNode, callback: (node: XPathNode) => void): void {
    this.traverseNode(node.left, callback);
    if (node.right) this.traverseNode(node.right, callback);
  }

  private static traverseExpr(node: ExprNode, callback: (node: XPathNode) => void): void {
    for (const expr of node.expressions) {
      this.traverseNode(expr, callback);
    }
  }

  private static traverseParenthesizedExpr(node: ParenthesizedExprNode, callback: (node: XPathNode) => void): void {
    if (node.expr) this.traverseNode(node.expr, callback);
  }

  private static traverseReverseStep(node: ReverseStepNode, callback: (node: XPathNode) => void): void {
    if (node.nodeTest) this.traverseNode(node.nodeTest, callback);
  }

  private static traverseIfExpr(node: IfExprNode, callback: (node: XPathNode) => void): void {
    if (node.condition) this.traverseNode(node.condition, callback);
    if (node.thenExpr) this.traverseNode(node.thenExpr, callback);
    if (node.elseExpr) this.traverseNode(node.elseExpr, callback);
  }

  private static traverseArithmeticExpr(node: ArithmeticExprNode, callback: (node: XPathNode) => void): void {
    this.traverseNode(node.left, callback);
    this.traverseNode(node.right, callback);
  }

  private static traverseLogicalExpr(node: LogicalExprNode, callback: (node: XPathNode) => void): void {
    this.traverseNode(node.left, callback);
    this.traverseNode(node.right, callback);
  }

  private static traverseCombineExpr(node: CombineExprNode, callback: (node: XPathNode) => void): void {
    this.traverseNode(node.left, callback);
    this.traverseNode(node.right, callback);
  }

  private static traverseAtomicExpr(node: AtomicExprNode, callback: (node: XPathNode) => void): void {
    for (const operand of node.operands) {
      this.traverseNode(operand, callback);
    }
  }

  private static traverseNode(node: XPathNode, callback: (node: XPathNode) => void): void {
    callback(node);

    switch (node.type) {
      case XPathNodeType.PathExpr:
        this.traversePathExpr(node as PathExprNode, callback);
        break;
      case XPathNodeType.StepExpr:
        this.traverseStepExpr(node as StepExprNode, callback);
        break;
      case XPathNodeType.FilterExpr:
        this.traverseFilterExpr(node as FilterExprNode, callback);
        break;
      case XPathNodeType.FunctionCall:
        this.traverseFunctionCall(node as FunctionCallNode, callback);
        break;
      case XPathNodeType.Predicate:
        this.traversePredicate(node as PredicateNode, callback);
        break;
      case XPathNodeType.ComparisonExpr:
        this.traverseComparisonExpr(node as ComparisonExprNode, callback);
        break;
      case XPathNodeType.Expr:
        this.traverseExpr(node as ExprNode, callback);
        break;
      case XPathNodeType.ParenthesizedExpr:
        this.traverseParenthesizedExpr(node as ParenthesizedExprNode, callback);
        break;
      case XPathNodeType.IfExpr:
        this.traverseIfExpr(node as IfExprNode, callback);
        break;
      case XPathNodeType.ArithmeticExpr:
        this.traverseArithmeticExpr(node as ArithmeticExprNode, callback);
        break;
      case XPathNodeType.LogicalExpr:
        this.traverseLogicalExpr(node as LogicalExprNode, callback);
        break;
      case XPathNodeType.CombineExpr:
        this.traverseCombineExpr(node as CombineExprNode, callback);
        break;
      case XPathNodeType.ReverseStep:
        this.traverseReverseStep(node as ReverseStepNode, callback);
        break;
      case XPathNodeType.AtomicExpr:
        this.traverseAtomicExpr(node as AtomicExprNode, callback);
        break;
    }
  }

  /**
   * Finds the deepest node in the syntax tree that contains the given character offset.
   * Useful for implementing features like hover information or autocomplete in editors.
   * @param root Root node of the syntax tree
   * @param offset Character offset in the source XPath expression
   * @returns The deepest node containing the offset, or undefined if offset is out of range
   */
  static findNodeAtPosition(root: XPathNode, offset: number): XPathNode | undefined {
    if (offset < root.range.start.offset || offset > root.range.end.offset) {
      return undefined;
    }

    let deepestNode: XPathNode = root;

    this.traverseNode(root, (node) => {
      if (offset >= node.range.start.offset && offset <= node.range.end.offset) {
        if (
          node.range.end.offset - node.range.start.offset <
          deepestNode.range.end.offset - deepestNode.range.start.offset
        ) {
          deepestNode = node;
        }
      }
    });

    return deepestNode;
  }

  /**
   * Collects all nodes of a specific type from the syntax tree.
   * For example, you can find all PathExpr nodes or all FunctionCall nodes in an expression.
   * @param root Root node to start searching from
   * @param type Type of nodes to collect
   * @returns Array of all nodes matching the specified type
   */
  static getAllNodesOfType<T extends XPathNode>(root: XPathNode, type: XPathNodeType): T[] {
    const results: T[] = [];

    this.traverseNode(root, (node) => {
      if (node.type === type) {
        results.push(node as T);
      }
    });

    return results;
  }

  /**
   * Gets the chain of parent nodes from root to the given node.
   * The chain starts with the root-most parent and ends with the given node.
   * Useful for understanding the context or path to a specific node in the tree.
   * @param node Node to get parent chain for
   * @returns Array of nodes from root to the given node, including the node itself
   */
  static getParentChain(node: XPathNode): XPathNode[] {
    const chain: XPathNode[] = [node];
    let current = node.parent;
    while (current) {
      chain.unshift(current);
      current = current.parent;
    }
    return chain;
  }

  /**
   * The expressions that make up the result of `node`, i.e. what an `xsl:copy-of` of it writes. Only the parts
   * that can contribute nodes to the result are followed: every item of a comma sequence, both operands of a
   * union, the left operand of `intersect` / `except` (their result is a subset of it), the inside of
   * parentheses, and the `then` / `else` branches of `if`. Predicates, function arguments and the operands of
   * comparisons, arithmetic, logical and atomic operators never are, so `string(@id)` and `@id cast as
   * xs:string` are single leaves.
   *
   * A path of one step whose primary is parenthesized, which is how the parser builds `(a | b)`, is unwrapped;
   * a multi-step path such as `/x/(@a | b)` is not, because its parenthesized step is relative to `/x`. An
   * empty `()` is returned as a leaf, since it writes nothing, and so is an `UnsupportedExpr` (`for … return`,
   * `some` / `every`), whose result the syntax tree doesn't model.
   * @param node - the expression to walk, usually the `exprNode` returned by `XPathService.parse`
   * @returns the result leaves, in written order
   */
  static getResultExpressions(node: ExprNode | ExprSingleNode | undefined): ExprSingleNode[] {
    if (!node) return [];
    switch (node.type) {
      case XPathNodeType.Expr:
        return node.expressions.flatMap((expression) => XPathUtil.getResultExpressions(expression));
      case XPathNodeType.CombineExpr:
        return XPathUtil.getCombineResultExpressions(node);
      case XPathNodeType.ParenthesizedExpr:
        return node.expr ? XPathUtil.getResultExpressions(node.expr) : [node];
      case XPathNodeType.IfExpr:
        return [...XPathUtil.getResultExpressions(node.thenExpr), ...XPathUtil.getResultExpressions(node.elseExpr)];
      case XPathNodeType.PathExpr: {
        const primary = XPathUtil.getParenthesizedPrimary(node);
        return primary ? XPathUtil.getResultExpressions(primary) : [node];
      }
      default:
        return [node];
    }
  }

  private static getCombineResultExpressions(node: CombineExprNode): ExprSingleNode[] {
    const left = XPathUtil.getResultExpressions(node.left);
    if (node.operator !== CombineOperator.Union) return left;
    return [...left, ...XPathUtil.getResultExpressions(node.right)];
  }

  private static getParenthesizedPrimary(path: PathExprNode): ParenthesizedExprNode | undefined {
    if (path.steps.length !== 1) return undefined;
    const primary = path.steps[0].filterExpr?.primary;
    return primary?.type === XPathNodeType.ParenthesizedExpr ? primary : undefined;
  }
}
