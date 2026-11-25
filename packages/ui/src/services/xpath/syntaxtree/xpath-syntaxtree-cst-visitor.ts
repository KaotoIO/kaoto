import { CstElement, CstNode, CstNodeLocation } from 'chevrotain';

import { PredicateOperator } from '../../../models/datamapper/xpath';
import {
  ArithmeticExprNode,
  ArithmeticOperator,
  AtomicExprNode,
  AtomicOperator,
  CombineExprNode,
  CombineOperator,
  ComparisonExprNode,
  ExprNode,
  ExprSingleNode,
  FilterExprNode,
  FunctionCallNode,
  IfExprNode,
  LiteralNode,
  LogicalExprNode,
  LogicalOperator,
  NameTestNode,
  ParenthesizedExprNode,
  PathExprNode,
  PredicateNode,
  PrimaryExprNode,
  ReverseStepNode,
  SourceRange,
  StepExprNode,
  UnsupportedExprNode,
  VarRefNode,
  XPathNodeType,
} from './xpath-syntaxtree-model';
import { XPathUtil } from './xpath-syntaxtree-util';

// Type aliases to reduce cognitive complexity and improve readability
type ExprSingleResult = ExprSingleNode | undefined;

/**
 * Configuration for processing binary expressions (arithmetic or logical).
 * This abstraction eliminates duplication between arithmetic and logical expression handling.
 */
interface BinaryExpressionConfig<TNode, TOperator> {
  operandPath: string[];
  extractOperator: (node: CstElement) => TOperator | undefined;
  visitOperand: (operand: CstElement) => TNode;
  createNode: (range: SourceRange, left: TNode, right: TNode, operator: TOperator | undefined) => TNode;
}

/**
 * A visitor that converts Chevrotain Concrete Syntax Tree (CST) nodes to a logical syntax tree node object {@link ExprNode}
 * which represents the root node of the logical syntax tree.
 *
 * This class uses the visitor pattern to traverse the CST produced by the XPath parser and transforms it into
 * a logical typed structure that can be used for analysis, validation, and code generation.
 *
 * @example
 * ```typescript
 * const cst = parser.parse('/root/child').cst;
 * const root = CstVisitor.visit(cst);
 * ```
 *
 * @see {@link visit} - The main entry point for converting CST to AST
 */
export class CstVisitor {
  private static getSingleNode(node: CstElement, paths: string[]): CstElement | undefined {
    let answer: CstElement[] = [node];
    for (const path of paths) {
      if (!('children' in answer[0]) || !answer[0].children[path]) return undefined;
      answer = answer[0].children[path];
    }
    return answer?.[0];
  }

  private static getNodes(node: CstElement, paths: string[]): CstElement[] | undefined {
    let answer: CstElement[] = [node];
    for (const path of paths) {
      if (!('children' in answer[0]) || !answer[0].children[path]) return undefined;
      answer = answer[0].children[path];
    }
    return answer;
  }

  private static extractTokenImage(node: CstElement | undefined): string | undefined {
    if (!node) return undefined;
    if ('image' in node) return node.image;
    if ('children' in node && typeof node.children === 'object') {
      for (const childArray of Object.values(node.children)) {
        if (Array.isArray(childArray) && childArray.length > 0 && 'image' in childArray[0]) {
          return childArray[0].image;
        }
      }
    }
    return undefined;
  }

  private static extractQualifiedName(
    elements: CstElement[] | undefined,
    colons: CstElement[] | undefined,
  ): { prefix?: string; localName: string } {
    if (elements?.length === 1 && (!colons || colons.length === 0)) {
      return { localName: CstVisitor.extractTokenImage(elements[0]) ?? '' };
    }
    if (elements?.length === 2 && colons?.length === 1) {
      return {
        prefix: CstVisitor.extractTokenImage(elements[0]) ?? '',
        localName: CstVisitor.extractTokenImage(elements[1]) ?? '',
      };
    }
    return { localName: '' };
  }

  private static setParent<T extends { parent?: unknown }>(children: T[], parent: unknown): void {
    for (const child of children) {
      child.parent = parent;
    }
  }

  /**
   * The range a parser element was read from: a token's own position, or a CST node's `location`. The parser
   * tracks full positions, so only an element without tokens (an empty CST node, whose offsets are `-1`) or a
   * hand-built CST without positions has none.
   * @param element - a token or a CST node
   * @returns the range, or `undefined` when the element has no valid start offset
   */
  private static getSourceRange(element: CstElement): SourceRange | undefined {
    const position: CstNodeLocation | undefined = 'image' in element ? element : element.location;
    if (position && position.startOffset >= 0) {
      return XPathUtil.createRange(
        position.startLine ?? 1,
        position.startColumn ?? 1,
        position.startOffset,
        position.endLine,
        position.endColumn,
        position.endOffset,
      );
    }
    return undefined;
  }

  /**
   * One range from the start of the first element to the end of the last one, for a node that has no CST node
   * of its own, such as one link of an operator chain or a predicate with its brackets. Elements without a
   * position are skipped. When none has one, which only a hand-built CST without positions can cause, the
   * range is the `0-0` default.
   * @param elements - parser elements in written order
   * @returns the range spanning the elements
   */
  private static createRangeSpanning(elements: readonly CstElement[]): SourceRange {
    let spanning: SourceRange | undefined;
    for (const element of elements) {
      const range = CstVisitor.getSourceRange(element);
      if (range) {
        spanning = spanning ? { start: spanning.start, end: range.end } : range;
      }
    }
    return spanning ?? XPathUtil.createRange(1, 1, 0);
  }

  private static createRangeFromNode(node: CstElement): SourceRange {
    return CstVisitor.createRangeSpanning([node]);
  }

  /**
   * Converts a Chevrotain Concrete Syntax Tree (CST) node to a logical syntax tree node object {@link ExprNode} which
   * represents the root of the syntax tree.
   * {@link ExprNode}.
   *
   * @param cstNode - The CST node produced by the XPath parser
   * @returns An ExprNode representing the root of the syntax tree
   */
  static visit(cstNode: CstNode): ExprNode {
    return CstVisitor.visitExpr(cstNode);
  }

  private static visitExpr(node: CstNode): ExprNode {
    const expressions: ExprSingleNode[] = [];

    if ('children' in node && node.children.ExprSingle) {
      for (const exprSingle of node.children.ExprSingle) {
        if ('children' in exprSingle) {
          const result = CstVisitor.visitExprSingle(exprSingle);
          if (result) expressions.push(result);
        }
      }
    }

    const exprNode: ExprNode = {
      type: XPathNodeType.Expr,
      range: CstVisitor.createRangeFromNode(node),
      expressions,
    };

    CstVisitor.setParent(expressions, exprNode);
    return exprNode;
  }

  private static visitExprSingle(node: CstNode): ExprSingleNode | undefined {
    // Check for IfExpr first
    const ifExpr = CstVisitor.getSingleNode(node, ['IfExpr']);
    if (ifExpr && 'children' in ifExpr) {
      return CstVisitor.visitIfExpr(ifExpr);
    }

    const forExpr = CstVisitor.getSingleNode(node, ['ForExpr']);
    if (forExpr) return CstVisitor.createUnsupportedNode(forExpr, 'for');
    const quantifiedExpr = CstVisitor.getSingleNode(node, ['QuantifiedExpr']);
    if (quantifiedExpr && 'children' in quantifiedExpr) {
      return CstVisitor.createUnsupportedNode(quantifiedExpr, 'Every' in quantifiedExpr.children ? 'every' : 'some');
    }

    const orExpr = CstVisitor.getSingleNode(node, ['OrExpr']);
    if (!orExpr || !('children' in orExpr)) return undefined;

    return CstVisitor.unwrapOrExpr(orExpr);
  }

  /**
   * Generic helper to unwrap or visit a logical expression node.
   * Eliminates duplication between unwrapOrExpr and unwrapAndExpr.
   *
   * @param element - The CST element to process
   * @param opType - The expected logical operator type (Or or And)
   * @param visitFn - Function to call if the operator matches
   * @param nextChildName - Path to the next child node in the CST hierarchy
   * @param nextStepFn - Function to call for the next level of processing
   * @returns The result of visiting or unwrapping the expression
   */
  private static unwrapOrVisit(
    element: CstElement,
    opType: LogicalOperator,
    visitFn: (node: CstElement) => ExprSingleNode | undefined,
    nextChildName: string[],
    nextStepFn: (node: CstElement) => ExprSingleNode | undefined,
  ): ExprSingleNode | undefined {
    // Check if this node actually performs the logic (e.g., OR / AND)
    if (CstVisitor.extractLogicalOperator(element) === opType) {
      return visitFn(element);
    }

    // Validate and unwrap to the next level
    const nextNode = CstVisitor.getSingleNode(element, nextChildName);
    if (nextNode && 'children' in nextNode) {
      return nextStepFn(nextNode);
    }

    return undefined;
  }

  private static unwrapOrExpr(orExpr: CstElement): ExprSingleNode | undefined {
    return CstVisitor.unwrapOrVisit(
      orExpr,
      LogicalOperator.Or,
      CstVisitor.visitOrExpr,
      ['AndExpr'],
      CstVisitor.unwrapAndExpr,
    );
  }

  private static unwrapAndExpr(andExpr: CstElement): ExprSingleNode | undefined {
    return CstVisitor.unwrapOrVisit(
      andExpr,
      LogicalOperator.And,
      CstVisitor.visitAndExpr,
      ['ComparisonExpr'],
      CstVisitor.processComparisonExpr,
    );
  }

  private static processComparisonExpr(comparisonExpr: CstElement): ExprSingleNode | undefined {
    const rangeExprs = CstVisitor.getNodes(comparisonExpr, ['RangeExpr']) ?? [];
    if (rangeExprs.length > 1) {
      return CstVisitor.visitComparisonExpr(comparisonExpr, rangeExprs[0], rangeExprs[1]);
    }
    return rangeExprs[0] ? CstVisitor.visitRangeExpr(rangeExprs[0]) : undefined;
  }

  private static visitRangeExpr(rangeExpr: CstElement): ExprSingleNode | undefined {
    if (!('children' in rangeExpr)) return undefined;

    const additiveExprs = CstVisitor.getNodes(rangeExpr, ['AdditiveExpr']) ?? [];
    if ('To' in rangeExpr.children) {
      const operands = additiveExprs
        .map((additive) => CstVisitor.visitAdditiveLayer(additive))
        .filter((operand): operand is NonNullable<typeof operand> => !!operand);
      return CstVisitor.createAtomicNode(rangeExpr, AtomicOperator.Range, operands);
    }
    return additiveExprs[0] ? CstVisitor.visitAdditiveLayer(additiveExprs[0]) : undefined;
  }

  private static visitAdditiveLayer(additiveExpr: CstElement): ExprSingleNode | undefined {
    if (!('children' in additiveExpr)) return undefined;

    // Check for arithmetic operations (additive: +, -)
    const additiveOperator = CstVisitor.extractArithmeticOperator(additiveExpr);
    if (additiveOperator) {
      return CstVisitor.visitAdditiveExpr(additiveExpr);
    }

    // Check for arithmetic operations (multiplicative: *, div, idiv, mod)
    const multiplicativeExpr = CstVisitor.getSingleNode(additiveExpr, ['MultiplicativeExpr']);
    if (multiplicativeExpr && 'children' in multiplicativeExpr) {
      const multOperator = CstVisitor.extractArithmeticOperator(multiplicativeExpr);
      if (multOperator) {
        return CstVisitor.visitMultiplicativeExpr(multiplicativeExpr);
      }
    }

    // No arithmetic or comparison operator at this level — descend to the combining layer, which
    // collapses to the bare path when it carries no operator of its own.
    const unionExpr = CstVisitor.getSingleNode(additiveExpr, ['MultiplicativeExpr', 'UnionExpr']);

    if (unionExpr && 'children' in unionExpr) {
      return CstVisitor.visitUnionExpr(unionExpr);
    }

    return undefined;
  }

  private static extractStepsFromRelativePathExpr(relativePathExpr: CstElement): StepExprNode[] {
    const steps: StepExprNode[] = [];

    const stepExpr = CstVisitor.getSingleNode(relativePathExpr, ['StepExpr']);
    if (stepExpr && 'children' in stepExpr) {
      steps.push(CstVisitor.visitStepExpr(stepExpr));
    }

    const childPathSegments = CstVisitor.getNodes(relativePathExpr, ['ChildPathSegmentExpr']);
    if (childPathSegments) {
      for (const segment of childPathSegments) {
        const stepExpr = CstVisitor.getSingleNode(segment, ['StepExpr']);
        if (stepExpr && 'children' in stepExpr) {
          steps.push(CstVisitor.visitStepExpr(stepExpr));
        }
      }
    }

    return steps;
  }

  private static visitPathExpr(node: CstNode): PathExprNode {
    const isAbsolute = 'children' in node && ('Slash' in node.children || 'DoubleSlash' in node.children);
    const isDoubleSlash = 'children' in node && 'DoubleSlash' in node.children;

    const steps: StepExprNode[] = [];
    const relativePathExpr = CstVisitor.getSingleNode(node, ['RelativePathExpr']);
    if (relativePathExpr && 'children' in relativePathExpr) {
      steps.push(...CstVisitor.extractStepsFromRelativePathExpr(relativePathExpr));
    }

    const pathNode: PathExprNode = {
      type: XPathNodeType.PathExpr,
      range: CstVisitor.createRangeFromNode(node),
      isAbsolute,
      isDoubleSlash,
      steps,
    };

    CstVisitor.setParent(steps, pathNode);
    return pathNode;
  }

  private static visitStepExpr(node: CstNode): StepExprNode {
    const reverseStep = CstVisitor.getSingleNode(node, ['ReverseStep']);
    if (reverseStep && 'children' in reverseStep) {
      const reverseStepNode = CstVisitor.visitReverseStep(reverseStep);
      const predicates = CstVisitor.visitPredicateList(CstVisitor.getSingleNode(node, ['PredicateList']));

      const stepNode: StepExprNode = {
        type: XPathNodeType.StepExpr,
        range: CstVisitor.createRangeFromNode(node),
        isAttribute: false,
        predicates,
        reverseStep: reverseStepNode,
      };

      CstVisitor.setParent(predicates, stepNode);
      if (reverseStepNode) {
        reverseStepNode.parent = stepNode;
      }
      return stepNode;
    }

    const filterExpr = CstVisitor.getSingleNode(node, ['FilterExpr']);
    if (filterExpr && 'children' in filterExpr) {
      const filterExprNode = CstVisitor.visitFilterExpr(filterExpr);
      const stepNode: StepExprNode = {
        type: XPathNodeType.StepExpr,
        range: CstVisitor.createRangeFromNode(node),
        isAttribute: false,
        predicates: [],
        filterExpr: filterExprNode,
      };

      if (filterExprNode) filterExprNode.parent = stepNode;
      return stepNode;
    }

    const axisTokenName = [
      'Child',
      'Descendant',
      'Attribute',
      'Self',
      'DescendantOrSelf',
      'FollowingSibling',
      'Following',
      'Namespace',
    ].find((axisName) => axisName in node.children);
    const axis = axisTokenName
      ? CstVisitor.extractTokenImage(CstVisitor.getSingleNode(node, [axisTokenName]))
      : undefined;
    // `@id` and `attribute::id` are the same step. Deriving this from the `At` token alone would
    // let the explicit spelling build a PathSegment describing an *element*, so the path would
    // resolve to the wrong field.
    const isAttribute = 'At' in node.children || axis === 'attribute';
    const nodeTest = CstVisitor.getSingleNode(node, ['NodeTest', 'NameTest']);
    const nameTestNode = nodeTest && 'children' in nodeTest ? CstVisitor.visitNameTest(nodeTest) : undefined;
    const predicates = CstVisitor.visitPredicateList(CstVisitor.getSingleNode(node, ['PredicateList']));

    const stepNode: StepExprNode = {
      type: XPathNodeType.StepExpr,
      range: CstVisitor.createRangeFromNode(node),
      axis,
      isAttribute,
      nodeTest: nameTestNode,
      predicates,
    };

    CstVisitor.setParent(predicates, stepNode);
    if (nameTestNode) {
      nameTestNode.parent = stepNode;
    }
    return stepNode;
  }

  private static visitReverseStep(node: CstNode): ReverseStepNode {
    const abbrevReverseStep = CstVisitor.getSingleNode(node, ['AbbrevReverseStep']);
    if (abbrevReverseStep) {
      return {
        type: XPathNodeType.ReverseStep,
        range: CstVisitor.createRangeFromNode(node),
        isParentReference: true,
      };
    }

    const nodeTest = CstVisitor.getSingleNode(node, ['NodeTest', 'NameTest']);
    const nameTestNode = nodeTest && 'children' in nodeTest ? CstVisitor.visitNameTest(nodeTest) : undefined;

    const reverseNode: ReverseStepNode = {
      type: XPathNodeType.ReverseStep,
      range: CstVisitor.createRangeFromNode(node),
      isParentReference: false,
      nodeTest: nameTestNode,
    };

    if (nameTestNode) nameTestNode.parent = reverseNode;
    return reverseNode;
  }

  private static visitNameTest(node: CstNode): NameTestNode {
    const identifiers = 'children' in node ? node.children['Identifier'] : undefined;
    const colon = 'children' in node ? node.children['Colon'] : undefined;

    const { prefix, localName } = CstVisitor.extractQualifiedName(identifiers, colon);

    return {
      type: XPathNodeType.NameTest,
      range: CstVisitor.createRangeFromNode(node),
      prefix,
      localName,
    };
  }

  private static visitFilterExpr(node: CstNode): FilterExprNode | undefined {
    const primary = CstVisitor.visitPrimaryExpr(node);
    if (!primary) return undefined;

    const predicates = CstVisitor.visitPredicateList(CstVisitor.getSingleNode(node, ['PredicateList']));

    const filterNode: FilterExprNode = {
      type: XPathNodeType.FilterExpr,
      range: CstVisitor.createRangeFromNode(node),
      primary,
      predicates,
    };

    primary.parent = filterNode;
    CstVisitor.setParent(predicates, filterNode);
    return filterNode;
  }

  private static visitPrimaryExpr(node: CstNode): PrimaryExprNode | undefined {
    const literal = CstVisitor.getSingleNode(node, ['Literal']);
    if (literal && 'children' in literal) {
      return CstVisitor.visitLiteral(literal);
    }

    const varRef = CstVisitor.getSingleNode(node, ['VarRef']);
    if (varRef && 'children' in varRef) {
      return CstVisitor.visitVarRef(varRef);
    }

    const contextItem = CstVisitor.getSingleNode(node, ['ContextItemExpr']);
    if (contextItem && 'image' in contextItem) {
      return {
        type: XPathNodeType.ContextItemExpr,
        range: CstVisitor.createRangeFromNode(contextItem),
      };
    }

    const functionCall = CstVisitor.getSingleNode(node, ['FunctionCall']);
    if (functionCall && 'children' in functionCall) {
      return CstVisitor.visitFunctionCall(functionCall);
    }

    const parenthesizedExpr = CstVisitor.getSingleNode(node, ['ParenthesizedExpr']);
    if (parenthesizedExpr && 'children' in parenthesizedExpr) {
      return CstVisitor.visitParenthesizedExpr(parenthesizedExpr);
    }

    return undefined;
  }

  private static visitLiteral(node: CstNode): LiteralNode {
    const stringLiteral = CstVisitor.getSingleNode(node, ['StringLiteral']);
    if (stringLiteral && 'image' in stringLiteral) {
      const image = stringLiteral.image;
      const value = image.replace(/^['"](.*)['"]/, '$1');
      return {
        type: XPathNodeType.Literal,
        range: CstVisitor.createRangeFromNode(stringLiteral),
        value,
        literalType: 'string',
      };
    }

    const numericLiteral = CstVisitor.getSingleNode(node, ['NumericLiteral']);
    if (numericLiteral && 'children' in numericLiteral) {
      const integerLiteral = CstVisitor.getSingleNode(numericLiteral, ['IntegerLiteral']);
      if (integerLiteral && 'image' in integerLiteral) {
        return {
          type: XPathNodeType.Literal,
          range: CstVisitor.createRangeFromNode(integerLiteral),
          value: Number.parseInt(integerLiteral.image, 10),
          literalType: 'integer',
        };
      }

      const decimalLiteral = CstVisitor.getSingleNode(numericLiteral, ['DecimalLiteral']);
      if (decimalLiteral && 'image' in decimalLiteral) {
        return {
          type: XPathNodeType.Literal,
          range: CstVisitor.createRangeFromNode(decimalLiteral),
          value: Number.parseFloat(decimalLiteral.image),
          literalType: 'decimal',
        };
      }

      const doubleLiteral = CstVisitor.getSingleNode(numericLiteral, ['DoubleLiteral']);
      if (doubleLiteral && 'image' in doubleLiteral) {
        return {
          type: XPathNodeType.Literal,
          range: CstVisitor.createRangeFromNode(doubleLiteral),
          value: Number.parseFloat(doubleLiteral.image),
          literalType: 'double',
        };
      }
    }

    return {
      type: XPathNodeType.Literal,
      range: CstVisitor.createRangeFromNode(node),
      value: '',
      literalType: 'string',
    };
  }

  private static visitVarRef(node: CstNode): VarRefNode {
    const varName = CstVisitor.getSingleNode(node, ['VarName']);
    if (!varName || !('children' in varName)) {
      return {
        type: XPathNodeType.VarRef,
        range: CstVisitor.createRangeFromNode(node),
        localName: '',
      };
    }

    const identifiers = varName.children['Identifier'];
    const colon = varName.children['Colon'];

    const { prefix, localName } = CstVisitor.extractQualifiedName(identifiers, colon);

    return {
      type: XPathNodeType.VarRef,
      range: CstVisitor.createRangeFromNode(node),
      prefix,
      localName,
    };
  }

  private static processFunctionArgument(exprSingle: CstNode): ExprNode {
    const exprNode: ExprNode = {
      type: XPathNodeType.Expr,
      range: CstVisitor.createRangeFromNode(exprSingle),
      expressions: [],
    };

    const result = CstVisitor.visitExprSingle(exprSingle);
    if (result) {
      exprNode.expressions.push(result);
      result.parent = exprNode;
    }

    return exprNode;
  }

  private static extractFunctionArguments(node: CstNode): ExprNode[] {
    const args: ExprNode[] = [];
    if ('children' in node && node.children.ExprSingle) {
      for (const exprSingle of node.children.ExprSingle) {
        if ('children' in exprSingle) {
          args.push(CstVisitor.processFunctionArgument(exprSingle));
        }
      }
    }
    return args;
  }

  private static visitFunctionCall(node: CstNode): FunctionCallNode {
    const qName = CstVisitor.getSingleNode(node, ['QName']);
    let prefix: string | undefined;
    let localName = '';

    if (qName && 'children' in qName) {
      const ncNames = qName.children['NCName'];
      const colon = qName.children['Colon'];

      const qualifiedName = CstVisitor.extractQualifiedName(ncNames, colon);
      prefix = qualifiedName.prefix;
      localName = qualifiedName.localName;
    }

    const args = CstVisitor.extractFunctionArguments(node);

    const funcNode: FunctionCallNode = {
      type: XPathNodeType.FunctionCall,
      range: CstVisitor.createRangeFromNode(node),
      prefix,
      localName,
      arguments: args,
    };

    CstVisitor.setParent(args, funcNode);
    return funcNode;
  }

  private static visitParenthesizedExpr(node: CstNode): ParenthesizedExprNode {
    const expr = CstVisitor.getSingleNode(node, ['Expr']);
    const exprNode = expr && 'children' in expr ? CstVisitor.visitExpr(expr) : undefined;

    const parenNode: ParenthesizedExprNode = {
      type: XPathNodeType.ParenthesizedExpr,
      range: CstVisitor.createRangeFromNode(node),
      expr: exprNode,
    };

    if (exprNode) exprNode.parent = parenNode;
    return parenNode;
  }

  private static visitPredicateList(predicateList: CstElement | undefined): PredicateNode[] {
    if (!predicateList) {
      return [];
    }
    if (!('children' in predicateList)) {
      return [];
    }
    if (Object.keys(predicateList.children).length === 0) {
      return [];
    }

    const predicatesCst = predicateList.children;
    if (!('LSquare' in predicatesCst)) {
      return [];
    }
    if (!('Expr' in predicatesCst)) {
      return [];
    }
    if (!('RSquare' in predicatesCst)) {
      return [];
    }

    const predicates: PredicateNode[] = [];
    const exprs = predicatesCst['Expr'];
    const openBrackets = predicatesCst['LSquare'];
    const closeBrackets = predicatesCst['RSquare'];

    for (const [i, expr] of exprs.entries()) {
      if ('children' in expr) {
        const exprNode = CstVisitor.visitExpr(expr);
        const predicateNode: PredicateNode = {
          type: XPathNodeType.Predicate,
          range: CstVisitor.createRangeSpanning([openBrackets[i], closeBrackets[i]]),
          expr: exprNode,
        };
        exprNode.parent = predicateNode;
        predicates.push(predicateNode);
      }
    }

    return predicates;
  }
  /**
   * Extracts arithmetic operator from CST node children.
   * Maps CST operator tokens to ArithmeticOperator enum values.
   */
  private static extractArithmeticOperator(node: CstElement): ArithmeticOperator | undefined {
    const children = 'children' in node && node.children;
    if (!children) return undefined;

    if ('Plus' in children) return ArithmeticOperator.Plus;
    if ('Minus' in children) return ArithmeticOperator.Minus;
    if ('Asterisk' in children) return ArithmeticOperator.Multiply;
    if ('Div' in children) return ArithmeticOperator.Div;
    if ('Idiv' in children) return ArithmeticOperator.Idiv;
    if ('Mod' in children) return ArithmeticOperator.Mod;

    return undefined;
  }

  /**
   * Extracts tokens for a specific operator type from children
   */
  private static extractOperatorTokens<TOperator>(
    children: Record<string, unknown>,
    key: string,
    operator: TOperator,
  ): Array<{ offset: number; operator: TOperator }> {
    const result: Array<{ offset: number; operator: TOperator }> = [];
    if (!(key in children)) return result;

    const tokens = children[key];
    if (!Array.isArray(tokens)) return result;

    for (const token of tokens) {
      if ('startOffset' in token) {
        result.push({ offset: token.startOffset as number, operator });
      }
    }
    return result;
  }

  /**
   * Extracts all arithmetic operators from CST node in the order they appear.
   * For chained expressions like "a - b + c", returns [Minus, Plus] in order.
   */
  private static extractArithmeticOperators(node: CstElement): ArithmeticOperator[] {
    const children = 'children' in node && node.children;
    if (!children) return [];

    const operators: Array<{ offset: number; operator: ArithmeticOperator }> = [];

    // Extract each operator type with its position
    const operatorTypes: Array<{ key: string; value: ArithmeticOperator }> = [
      { key: 'Plus', value: ArithmeticOperator.Plus },
      { key: 'Minus', value: ArithmeticOperator.Minus },
      { key: 'Asterisk', value: ArithmeticOperator.Multiply },
      { key: 'Div', value: ArithmeticOperator.Div },
      { key: 'Idiv', value: ArithmeticOperator.Idiv },
      { key: 'Mod', value: ArithmeticOperator.Mod },
    ];

    for (const { key, value } of operatorTypes) {
      operators.push(...CstVisitor.extractOperatorTokens(children, key, value));
    }

    // Sort by offset to preserve order
    operators.sort((a, b) => a.offset - b.offset);
    return operators.map((op) => op.operator);
  }

  /**
   * Extracts logical operator from CST node children.
   * Maps CST operator tokens to LogicalOperator enum values.
   */
  private static extractLogicalOperator(node: CstElement): LogicalOperator | undefined {
    const children = 'children' in node && node.children;
    if (!children) return undefined;

    if ('And' in children) return LogicalOperator.And;
    if ('Or' in children) return LogicalOperator.Or;

    return undefined;
  }

  /**
   * Generic visitor for binary expressions (arithmetic or logical).
   * Handles chained operations like `a + b + c` or `cond1 and cond2 and cond3`.
   * Eliminates code duplication between arithmetic and logical expression handling.
   *
   * @param node - CST node containing operands and operators
   * @param config - Configuration object defining how to process this binary expression type
   * @returns The resulting node or the single operand if no operators present
   */
  private static visitBinaryExpr<TNode, TOperator>(
    node: CstElement,
    config: BinaryExpressionConfig<TNode, TOperator>,
  ): TNode | undefined {
    if (!('children' in node)) return undefined;

    const operands = CstVisitor.getNodes(node, config.operandPath);
    if (!operands || operands.length === 0) return undefined;

    // Single operand - recursively process it
    if (operands.length === 1) {
      return config.visitOperand(operands[0]);
    }

    // Multiple operands - build chained expression
    return CstVisitor.buildChainedBinaryExpr(node, operands, config);
  }

  /**
   * Builds a chained binary expression from multiple operands.
   * For "a + b + c", creates nested structure: (a + b) + c
   */
  private static buildChainedBinaryExpr<TNode, TOperator>(
    cstNode: CstElement,
    operands: CstElement[],
    config: BinaryExpressionConfig<TNode, TOperator>,
  ): TNode | undefined {
    let result: TNode | undefined;

    for (let i = 0; i < operands.length; i++) {
      const operand = config.visitOperand(operands[i]);
      if (!operand) continue;

      if (i === 0) {
        result = operand;
      } else if (result) {
        const operator = config.extractOperator(cstNode);
        result = config.createNode(
          CstVisitor.createRangeSpanning([operands[0], operands[i]]),
          result,
          operand,
          operator,
        );
      }
    }

    return result;
  }

  /**
   * Extracts the combining operators of one grammar layer in source order.
   *
   * Both layers accept two spellings that Chevrotain files under *different* child keys — `|` as
   * `Pipe` and `union` as `Union`, `intersect` as `Intersect` and `except` as `Except` — so the
   * tokens have to be merged and re-sorted by offset to recover the order they were written in.
   * @param node - the `UnionExpr` or `IntersectExceptExpr` CST node
   * @param operatorTypes - the child keys this layer can carry, with the operator each maps to
   */
  private static extractCombineOperators(
    node: CstElement,
    operatorTypes: Array<{ key: string; value: CombineOperator }>,
  ): CombineOperator[] {
    const children = 'children' in node && node.children;
    if (!children) return [];

    const operators: Array<{ offset: number; operator: CombineOperator }> = [];
    for (const { key, value } of operatorTypes) {
      operators.push(...CstVisitor.extractOperatorTokens(children, key, value));
    }

    operators.sort((a, b) => a.offset - b.offset);
    return operators.map((op) => op.operator);
  }

  /**
   * Visits a UnionExpr CST node.
   * Handles operations: `|`, `union`
   * Example: `/a | /b` — both operands are real sources, so both render a mapping line.
   * @returns the combination, or — when the layer carries no operator — the single path it wraps, possibly
   * under an atomic operator
   */
  private static visitUnionExpr(node: CstElement): ExprSingleResult {
    const operators = CstVisitor.extractCombineOperators(node, [
      { key: 'Pipe', value: CombineOperator.Union },
      { key: 'Union', value: CombineOperator.Union },
    ]);
    let operatorIndex = 0;

    return CstVisitor.visitBinaryExpr<ExprSingleResult, CombineOperator>(node, {
      operandPath: ['IntersectExceptExpr'],
      extractOperator: () => operators[operatorIndex++],
      visitOperand: (operand) => CstVisitor.visitIntersectExceptExpr(operand),
      createNode: (range, left, right, operator) => CstVisitor.createCombineNode(range, left, right, operator),
    });
  }

  /**
   * Visits an IntersectExceptExpr CST node.
   * Handles operations: `intersect`, `except`
   * Example: `a intersect b` or the mixed chain `b intersect c except d`
   * @returns the combination, or — when the layer carries no operator — the single path it wraps, possibly
   * under an atomic operator
   */
  private static visitIntersectExceptExpr(node: CstElement): ExprSingleResult {
    const operators = CstVisitor.extractCombineOperators(node, [
      { key: 'Intersect', value: CombineOperator.Intersect },
      { key: 'Except', value: CombineOperator.Except },
    ]);
    let operatorIndex = 0;

    return CstVisitor.visitBinaryExpr<ExprSingleResult, CombineOperator>(node, {
      operandPath: ['InstanceofExpr'],
      extractOperator: () => operators[operatorIndex++],
      visitOperand: (operand) => CstVisitor.visitInstanceofExpr(operand),
      createNode: (range, left, right, operator) => CstVisitor.createCombineNode(range, left, right, operator),
    });
  }

  /**
   * Visits an InstanceofExpr CST node, the layer that holds a leading sign, `cast as`, `castable as`,
   * `treat as` and `instance of` around a path. Every one of them except `treat as` turns the path into
   * atomic values, so the path is wrapped in an {@link AtomicExprNode} named after the outermost of them.
   */
  private static visitInstanceofExpr(node: CstElement): PathExprNode | AtomicExprNode | undefined {
    const pathExpr = CstVisitor.getSingleNode(node, ['PathExpr']);
    if (!pathExpr || !('children' in pathExpr) || !('children' in node)) return undefined;
    const path = CstVisitor.visitPathExpr(pathExpr);
    const operator = CstVisitor.extractAtomicOperator(node.children);
    return operator ? CstVisitor.createAtomicNode(node, operator, [path]) : path;
  }

  private static extractAtomicOperator(children: CstNode['children']): AtomicOperator | undefined {
    if ('Instance' in children) return AtomicOperator.InstanceOf;
    if ('Castable' in children) return AtomicOperator.Castable;
    if ('Cast' in children) return AtomicOperator.Cast;
    if ('Minus' in children) return AtomicOperator.UnaryMinus;
    if ('Plus' in children) return AtomicOperator.UnaryPlus;
    return undefined;
  }

  private static createAtomicNode(
    cstNode: CstElement,
    operator: AtomicOperator,
    operands: ExprSingleNode[],
  ): AtomicExprNode {
    const atomicNode: AtomicExprNode = {
      type: XPathNodeType.AtomicExpr,
      range: CstVisitor.createRangeFromNode(cstNode),
      operator,
      operands,
    };
    CstVisitor.setParent(operands, atomicNode);
    return atomicNode;
  }

  /**
   * Creates a {@link CombineExprNode} with proper parent references.
   * Returns the left operand when the operator or either side is missing, matching
   * {@link createArithmeticNode} — a layer with no operator collapses to what it wraps.
   * @param range - The source range from the first to the last operand of this link of the chain
   * @param left - Left operand of the combining expression
   * @param right - Right operand of the combining expression
   * @param operator - `|`/`union`, `intersect` or `except`
   */
  private static createCombineNode(
    range: SourceRange,
    left: ExprSingleResult,
    right: ExprSingleResult,
    operator: CombineOperator | undefined,
  ): ExprSingleResult {
    if (!operator || !left || !right) return left;

    const combineNode: CombineExprNode = {
      type: XPathNodeType.CombineExpr,
      range,
      left,
      operator,
      right,
    };

    left.parent = combineNode;
    right.parent = combineNode;
    return combineNode;
  }

  /**
   * Visits a MultiplicativeExpr CST node.
   * Handles operations: *, div, idiv, mod
   * Example: `price * quantity` or `count mod 10`
   */
  private static visitMultiplicativeExpr(node: CstElement): ExprSingleResult {
    // Extract all operators in order for mixed multiplicative operators
    // For "a * b div c", this gives [Multiply, Div] in correct order
    const operators = CstVisitor.extractArithmeticOperators(node);
    let operatorIndex = 0;

    return CstVisitor.visitBinaryExpr<ExprSingleResult, ArithmeticOperator>(node, {
      operandPath: ['UnionExpr'],
      extractOperator: () => operators[operatorIndex++],
      visitOperand: (operand) => CstVisitor.visitUnionExpr(operand),
      createNode: (range, left, right, operator) => CstVisitor.createArithmeticNode(range, left, right, operator),
    });
  }

  /**
   * Creates an ArithmeticExprNode with proper parent references.
   * Returns left operand if operator or either operand is missing.
   *
   * @param range - The source range from the first to the last operand of this link of the chain
   * @param left - Left operand of the arithmetic expression
   * @param right - Right operand of the arithmetic expression
   * @param operator - The arithmetic operator (+, -, *, div, idiv, mod)
   * @returns The created ArithmeticExprNode, or left operand if operator/right is missing
   */
  private static createArithmeticNode(
    range: SourceRange,
    left: ExprSingleResult,
    right: ExprSingleResult,
    operator: ArithmeticOperator | undefined,
  ): ExprSingleResult {
    if (!operator || !left || !right) return left;

    const arithmeticNode: ArithmeticExprNode = {
      type: XPathNodeType.ArithmeticExpr,
      range,
      left,
      operator,
      right,
    };

    left.parent = arithmeticNode;
    right.parent = arithmeticNode;
    return arithmeticNode;
  }

  /**
   * Visits an AdditiveExpr CST node.
   * Handles operations: +, -
   * Example: `price + tax` or `total - discount`
   */
  private static visitAdditiveExpr(node: CstElement): ExprSingleResult {
    // Extract all operators in order to handle mixed operators correctly
    // For "a - b + c", this gives [Minus, Plus] so each pair gets the right operator
    const operators = CstVisitor.extractArithmeticOperators(node);
    let operatorIndex = 0;

    return CstVisitor.visitBinaryExpr<ExprSingleResult, ArithmeticOperator>(node, {
      operandPath: ['MultiplicativeExpr'],
      extractOperator: () => operators[operatorIndex++],
      visitOperand: (operand) => CstVisitor.visitMultiplicativeExpr(operand),
      createNode: (range, left, right, operator) => CstVisitor.createArithmeticNode(range, left, right, operator),
    });
  }

  /**
   * Creates a LogicalExprNode with proper parent references.
   * Returns left operand if either operand is missing.
   *
   * @param range - The source range from the first to the last operand of this link of the chain
   * @param left - Left operand of the logical expression
   * @param right - Right operand of the logical expression
   * @param operator - The logical operator (And or Or)
   * @returns The created LogicalExprNode, or left operand if right is missing
   */
  private static createLogicalNode(
    range: SourceRange,
    left: ExprSingleResult,
    right: ExprSingleResult,
    operator: LogicalOperator,
  ): ExprSingleResult {
    if (!left || !right) return left;

    const logicalNode: LogicalExprNode = {
      type: XPathNodeType.LogicalExpr,
      range,
      left,
      operator,
      right,
    };

    left.parent = logicalNode;
    right.parent = logicalNode;
    return logicalNode;
  }

  /**
   * Visits an AndExpr CST node.
   * Handles logical AND operations: `condition1 and condition2`
   */
  private static visitAndExpr(node: CstElement): ExprSingleResult {
    return CstVisitor.visitBinaryExpr<ExprSingleResult, LogicalOperator>(node, {
      operandPath: ['ComparisonExpr'],
      extractOperator: () => LogicalOperator.And,
      visitOperand: (operand) => CstVisitor.processComparisonExpr(operand),
      createNode: (range, left, right) => CstVisitor.createLogicalNode(range, left, right, LogicalOperator.And),
    });
  }

  /**
   * Visits an OrExpr CST node.
   * Handles logical OR operations: `condition1 or condition2`
   */
  private static visitOrExpr(node: CstElement): ExprSingleResult {
    return CstVisitor.visitBinaryExpr<ExprSingleResult, LogicalOperator>(node, {
      operandPath: ['AndExpr'],
      extractOperator: () => LogicalOperator.Or,
      visitOperand: (operand) => CstVisitor.visitAndExpr(operand),
      createNode: (range, left, right) => CstVisitor.createLogicalNode(range, left, right, LogicalOperator.Or),
    });
  }

  private static visitComparisonExpr(
    node: CstElement,
    leftRangeExpr: CstElement,
    rightRangeExpr: CstElement,
  ): ComparisonExprNode | undefined {
    const operator = CstVisitor.extractComparisonOperator(node);
    const left = CstVisitor.visitComparisonOperand(leftRangeExpr);
    const right = CstVisitor.visitComparisonOperand(rightRangeExpr);

    if (!left) return undefined;

    const compNode: ComparisonExprNode = {
      type: XPathNodeType.ComparisonExpr,
      range: CstVisitor.createRangeFromNode(node),
      left,
      operator,
      right,
    };

    left.parent = compNode;
    if (right) right.parent = compNode;
    return compNode;
  }

  /**
   * Visits one side of a comparison like any other operand, so arithmetic, ranges and atomic operators keep all
   * their operands. A bare literal (`… = 'x'`) is then lifted out of the path that wraps it, since predicate
   * consumers such as `XPathService.extractPredicate` read the literal's value directly.
   */
  private static visitComparisonOperand(rangeExpr: CstElement): ExprSingleNode | undefined {
    const operand = CstVisitor.visitRangeExpr(rangeExpr);
    if (operand?.type !== XPathNodeType.PathExpr || operand.isAbsolute || operand.steps.length !== 1) return operand;

    const [step] = operand.steps;
    const primary = step.filterExpr?.primary;
    if (primary?.type !== XPathNodeType.Literal || step.predicates.length > 0 || step.filterExpr?.predicates.length) {
      return operand;
    }
    primary.parent = undefined;
    return primary;
  }

  private static extractComparisonOperator(comparisonExpr: CstElement): PredicateOperator {
    const compChildren = 'children' in comparisonExpr && comparisonExpr.children;
    if (!compChildren) return PredicateOperator.Unknown;

    const operator = Object.values(PredicateOperator).find((operator) => operator in compChildren);
    return operator ?? PredicateOperator.Unknown;
  }

  private static createUnsupportedNode(node: CstElement, keyword: UnsupportedExprNode['keyword']): UnsupportedExprNode {
    return { type: XPathNodeType.UnsupportedExpr, range: CstVisitor.createRangeFromNode(node), keyword };
  }

  private static visitIfExpr(node: CstNode): IfExprNode {
    const conditionCst = CstVisitor.getSingleNode(node, ['Expr']);
    const conditionNode = conditionCst && 'children' in conditionCst ? CstVisitor.visitExpr(conditionCst) : undefined;

    const exprSingles = CstVisitor.getNodes(node, ['ExprSingle']);
    const thenCst = exprSingles?.[0];
    const elseCst = exprSingles?.[1];

    const thenNode = thenCst && 'children' in thenCst ? CstVisitor.visitExprSingle(thenCst) : undefined;
    const elseNode = elseCst && 'children' in elseCst ? CstVisitor.visitExprSingle(elseCst) : undefined;

    // XPath grammar ensures all three parts (condition, then, else) are present
    // Non-null assertion is safe as parser would have failed for incomplete if-else
    const ifNode: IfExprNode = {
      type: XPathNodeType.IfExpr,
      range: CstVisitor.createRangeFromNode(node),
      condition: conditionNode!,
      thenExpr: thenNode!,
      elseExpr: elseNode!,
    };

    if (conditionNode) conditionNode.parent = ifNode;
    if (thenNode) thenNode.parent = ifNode;
    if (elseNode) elseNode.parent = ifNode;

    return ifNode;
  }
}
