import {
  CombineExprNode,
  CombineOperator,
  ExprNode,
  ExprSingleNode,
  ParenthesizedExprNode,
  PathExprNode,
  SourceRange,
  XPathNode,
  XPathNodeMap,
  XPathNodeType,
  XPathSyntaxNode,
} from './xpath-syntaxtree-model';

/**
 * Utility functions for working with XPath syntax tree nodes.
 *
 * The syntax tree stays faithful to the expression and keeps every child the parser models; readers don't
 * prune it. Two walks read it and each decides what to follow: the child walk ({@link XPathUtil.getChildren},
 * behind {@link XPathUtil.getAllNodesOfType}) follows every child, i.e. what an expression reads; the result walk
 * ({@link XPathUtil.getResultExpressions}) follows only the parts that contribute nodes to the result, i.e. what
 * it writes. Every node type has a child-walk case; every {@link ExprSingleNode} type also has a result-walk case.
 * {@link XPathUtil.findNodeAtPosition} uses {@link XPathUtil.getChildren} too, but follows only the child that
 * contains the offset.
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

  /**
   * Every child syntax node of `node`, in written order, which `findNodeAtPosition` tie-breaking and
   * `getAllNodesOfType` result order relies on. There is one case per node type, so a node type without a case
   * fails to compile. The returned array is always a new one, so changing it doesn't change the node's child
   * lists.
   * @param node - the node whose children to return
   * @returns the children, or an empty array for a leaf
   */
  static getChildren(node: XPathSyntaxNode): XPathSyntaxNode[] {
    switch (node.type) {
      case XPathNodeType.PathExpr:
        return [...node.steps];
      case XPathNodeType.StepExpr:
        return [
          ...XPathUtil.present(node.reverseStep, node.nodeTest),
          ...node.predicates,
          ...XPathUtil.present(node.filterExpr),
        ];
      case XPathNodeType.FilterExpr:
        return [node.primary, ...node.predicates];
      case XPathNodeType.FunctionCall:
        return [...node.arguments];
      case XPathNodeType.Predicate:
        return [node.expr];
      case XPathNodeType.ComparisonExpr:
        return XPathUtil.present(node.left, node.right);
      case XPathNodeType.Expr:
        return [...node.expressions];
      case XPathNodeType.ParenthesizedExpr:
        return XPathUtil.present(node.expr);
      case XPathNodeType.ReverseStep:
        return XPathUtil.present(node.nodeTest);
      case XPathNodeType.IfExpr:
        return XPathUtil.present(node.condition, node.thenExpr, node.elseExpr);
      case XPathNodeType.ArithmeticExpr:
      case XPathNodeType.LogicalExpr:
      case XPathNodeType.CombineExpr:
        return [node.left, node.right];
      case XPathNodeType.AtomicExpr:
        return [...node.operands];
      case XPathNodeType.NameTest:
      case XPathNodeType.Literal:
      case XPathNodeType.VarRef:
      case XPathNodeType.ContextItemExpr:
      case XPathNodeType.UnsupportedExpr:
        return [];
      default:
        return XPathUtil.unexpectedNode(node);
    }
  }

  /**
   * The `default` of an exhaustive switch over node types: a node type without a case is not assignable to the
   * parameter, so the build fails naming that type. At runtime it throws for a node that got past the type system.
   * @param node - the node no case matched, `never` when every node type has a case
   */
  private static unexpectedNode(node: { type: never }): never {
    throw new Error(`Unexpected XPath syntax node type: ${String(node.type)}`);
  }

  private static present(...nodes: (XPathSyntaxNode | null | undefined)[]): XPathSyntaxNode[] {
    return nodes.filter((node): node is XPathSyntaxNode => !!node);
  }

  private static traverseNode(node: XPathSyntaxNode, callback: (node: XPathSyntaxNode) => void): void {
    callback(node);
    for (const child of XPathUtil.getChildren(node)) {
      XPathUtil.traverseNode(child, callback);
    }
  }

  private static isNodeOfType<K extends XPathNodeType>(node: XPathSyntaxNode, type: K): node is XPathNodeMap[K] {
    return node.type === type;
  }

  /**
   * Finds the deepest node in the syntax tree that contains the given character offset.
   * Useful for implementing features like hover information or autocomplete in editors.
   *
   * It walks down from `root` into the child that contains the offset until no child does. Siblings don't
   * overlap, so at most one child contains it. A child with the same range as its parent is entered, so a step
   * and its name test resolve to the name test. Offsets are inclusive, see {@link SourceRange}.
   * @param root Root node of the syntax tree
   * @param offset Character offset in the source XPath expression
   * @returns The deepest node containing the offset, or undefined if offset is out of range
   */
  static findNodeAtPosition(root: XPathSyntaxNode, offset: number): XPathSyntaxNode | undefined {
    if (!XPathUtil.containsOffset(root, offset)) {
      return undefined;
    }

    const child = XPathUtil.getChildren(root).find((candidate) => XPathUtil.containsOffset(candidate, offset));
    return child ? XPathUtil.findNodeAtPosition(child, offset) : root;
  }

  private static containsOffset(node: XPathSyntaxNode, offset: number): boolean {
    return node.range.start.offset <= offset && offset <= node.range.end.offset;
  }

  /**
   * Collects all nodes of a specific type from the syntax tree.
   * For example, you can find all PathExpr nodes or all FunctionCall nodes in an expression.
   * @param root Root node to start searching from
   * @param type Type of nodes to collect
   * @returns Array of all nodes matching the specified type
   */
  static getAllNodesOfType<K extends XPathNodeType>(root: XPathSyntaxNode, type: K): XPathNodeMap[K][] {
    const results: XPathNodeMap[K][] = [];

    this.traverseNode(root, (node) => {
      if (XPathUtil.isNodeOfType(node, type)) {
        results.push(node);
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
      case XPathNodeType.ComparisonExpr:
      case XPathNodeType.ArithmeticExpr:
      case XPathNodeType.LogicalExpr:
      case XPathNodeType.Literal:
      case XPathNodeType.FunctionCall:
      case XPathNodeType.VarRef:
      case XPathNodeType.AtomicExpr:
      case XPathNodeType.UnsupportedExpr:
        return [node];
      default:
        return XPathUtil.unexpectedNode(node);
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
