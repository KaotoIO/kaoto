import { CstElement, CstNode, IToken } from 'chevrotain';

import { PredicateOperator } from '../../../models/datamapper/xpath';
import {
  ComparisonExprNode,
  ExprNode,
  ExprSingleNode,
  FilterExprNode,
  FunctionCallNode,
  IfExprNode,
  LiteralNode,
  NameTestNode,
  ParenthesizedExprNode,
  PathExprNode,
  PredicateNode,
  PrimaryExprNode,
  ReverseStepNode,
  SourceRange,
  StepExprNode,
  VarRefNode,
  XPathNodeType,
} from './xpath-syntaxtree-model';
import { XPathUtil } from './xpath-syntaxtree-util';

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

  private static createRangeFromToken(token: IToken): SourceRange {
    return XPathUtil.createRange(
      token.startLine ?? 1,
      token.startColumn ?? 1,
      token.startOffset ?? 0,
      token.endLine,
      token.endColumn,
      token.endOffset,
    );
  }

  private static createRangeFromNode(node: CstElement): SourceRange {
    if ('image' in node) {
      return CstVisitor.createRangeFromToken(node);
    }

    if ('children' in node) {
      const children = Object.values(node.children).flat();
      if (children.length > 0) {
        const firstToken = CstVisitor.getFirstToken(children[0]);
        const lastToken = CstVisitor.getLastToken(children[children.length - 1]);
        if (firstToken && lastToken) {
          return XPathUtil.createRange(
            firstToken.startLine ?? 1,
            firstToken.startColumn ?? 1,
            firstToken.startOffset ?? 0,
            lastToken.endLine,
            lastToken.endColumn,
            lastToken.endOffset,
          );
        }
      }
    }

    return XPathUtil.createRange(1, 1, 0);
  }

  private static getFirstToken(node: CstElement): IToken | undefined {
    if ('image' in node) return node;
    if ('children' in node) {
      const children = Object.values(node.children).flat();
      for (const child of children) {
        const token = CstVisitor.getFirstToken(child);
        if (token) return token;
      }
    }
    return undefined;
  }

  private static getLastToken(node: CstElement): IToken | undefined {
    if ('image' in node) return node;
    if ('children' in node) {
      const children = Object.values(node.children).flat().reverse();
      for (const child of children) {
        const token = CstVisitor.getLastToken(child);
        if (token) return token;
      }
    }
    return undefined;
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

    const orExpr = CstVisitor.getSingleNode(node, ['OrExpr']);
    if (!orExpr || !('children' in orExpr)) return undefined;

    const andExpr = CstVisitor.getSingleNode(orExpr, ['AndExpr']);
    if (!andExpr || !('children' in andExpr)) return undefined;

    const comparisonExpr = CstVisitor.getSingleNode(andExpr, ['ComparisonExpr']);
    if (!comparisonExpr || !('children' in comparisonExpr)) return undefined;

    const operator = CstVisitor.extractComparisonOperator(comparisonExpr);
    if (operator && operator !== PredicateOperator.Unknown) {
      return CstVisitor.visitComparisonExpr(comparisonExpr);
    }

    const rangeExpr = CstVisitor.getSingleNode(comparisonExpr, ['RangeExpr']);
    if (!rangeExpr) return undefined;

    const additiveExpr = CstVisitor.getSingleNode(rangeExpr, ['AdditiveExpr']);
    if (additiveExpr && 'children' in additiveExpr && additiveExpr.children.MultiplicativeExpr) {
      const firstMultExpr = additiveExpr.children.MultiplicativeExpr[0];
      const pathExpr = CstVisitor.getSingleNode(firstMultExpr, [
        'UnionExpr',
        'IntersectExceptExpr',
        'InstanceofExpr',
        'PathExpr',
      ]);
      if (pathExpr && 'children' in pathExpr) {
        return CstVisitor.visitPathExpr(pathExpr);
      }
    }

    const pathExpr = CstVisitor.getSingleNode(rangeExpr, [
      'AdditiveExpr',
      'MultiplicativeExpr',
      'UnionExpr',
      'IntersectExceptExpr',
      'InstanceofExpr',
      'PathExpr',
    ]);

    if (pathExpr && 'children' in pathExpr) {
      return CstVisitor.visitPathExpr(pathExpr);
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

    const isAttribute = 'children' in node && 'At' in node.children;
    const nodeTest = CstVisitor.getSingleNode(node, ['NodeTest', 'NameTest']);
    const nameTestNode = nodeTest && 'children' in nodeTest ? CstVisitor.visitNameTest(nodeTest) : undefined;
    const predicates = CstVisitor.visitPredicateList(CstVisitor.getSingleNode(node, ['PredicateList']));

    const stepNode: StepExprNode = {
      type: XPathNodeType.StepExpr,
      range: CstVisitor.createRangeFromNode(node),
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
        range: CstVisitor.createRangeFromToken(contextItem),
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
        range: CstVisitor.createRangeFromToken(stringLiteral),
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
          range: CstVisitor.createRangeFromToken(integerLiteral),
          value: Number.parseInt(integerLiteral.image, 10),
          literalType: 'integer',
        };
      }

      const decimalLiteral = CstVisitor.getSingleNode(numericLiteral, ['DecimalLiteral']);
      if (decimalLiteral && 'image' in decimalLiteral) {
        return {
          type: XPathNodeType.Literal,
          range: CstVisitor.createRangeFromToken(decimalLiteral),
          value: Number.parseFloat(decimalLiteral.image),
          literalType: 'decimal',
        };
      }

      const doubleLiteral = CstVisitor.getSingleNode(numericLiteral, ['DoubleLiteral']);
      if (doubleLiteral && 'image' in doubleLiteral) {
        return {
          type: XPathNodeType.Literal,
          range: CstVisitor.createRangeFromToken(doubleLiteral),
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

    const arithmeticPaths = CstVisitor.extractAllPathExprsFromCST(exprSingle);
    if (arithmeticPaths.length > 0) {
      exprNode.expressions.push(...arithmeticPaths);
      CstVisitor.setParent(arithmeticPaths, exprNode);
    } else {
      const result = CstVisitor.visitExprSingle(exprSingle);
      if (result) {
        exprNode.expressions.push(result);
        result.parent = exprNode;
      }
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

    for (const expr of exprs) {
      if ('children' in expr) {
        const exprNode = CstVisitor.visitExpr(expr);
        const predicateNode: PredicateNode = {
          type: XPathNodeType.Predicate,
          range: CstVisitor.createRangeFromNode(expr),
          expr: exprNode,
        };
        exprNode.parent = predicateNode;
        predicates.push(predicateNode);
      }
    }

    return predicates;
  }

  private static visitComparisonExpr(node: CstElement): ComparisonExprNode | undefined {
    const rangeExprArray = CstVisitor.getNodes(node, ['RangeExpr']);
    if (!rangeExprArray || rangeExprArray.length < 2) return undefined;

    const operator = CstVisitor.extractComparisonOperator(node);
    const left = CstVisitor.extractOperand(rangeExprArray[0]);
    const right = CstVisitor.extractOperand(rangeExprArray[1]);

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

  private static extractOperand(rangeExpr: CstElement): PathExprNode | LiteralNode | VarRefNode | undefined {
    const pathExpr = CstVisitor.getSingleNode(rangeExpr, [
      'AdditiveExpr',
      'MultiplicativeExpr',
      'UnionExpr',
      'IntersectExceptExpr',
      'InstanceofExpr',
      'PathExpr',
    ]);

    if (!pathExpr || !('children' in pathExpr)) return undefined;

    const literal = CstVisitor.getSingleNode(pathExpr, ['RelativePathExpr', 'StepExpr', 'FilterExpr', 'Literal']);
    if (literal && 'children' in literal) {
      return CstVisitor.visitLiteral(literal);
    }

    return CstVisitor.visitPathExpr(pathExpr);
  }

  private static extractComparisonOperator(comparisonExpr: CstElement): PredicateOperator {
    const compChildren = 'children' in comparisonExpr && comparisonExpr.children;
    if (!compChildren) return PredicateOperator.Unknown;

    const operator = Object.values(PredicateOperator).find((operator) => operator in compChildren);
    return operator ?? PredicateOperator.Unknown;
  }

  private static extractPathExprsFromParenthesizedExpr(parenthesizedExpr: CstElement): PathExprNode[] {
    if (!('children' in parenthesizedExpr)) {
      return [];
    }
    const expr = parenthesizedExpr.children['Expr'];
    if (expr && expr.length > 0 && 'children' in expr[0]) {
      return CstVisitor.extractAllPathExprsFromCST(expr[0]);
    }
    return [];
  }

  private static extractPathExprsFromFunctionCall(functionCall: CstElement): PathExprNode[] {
    const paths: PathExprNode[] = [];
    if (!('children' in functionCall) || !functionCall.children.ExprSingle) {
      return paths;
    }
    for (const exprSingle of functionCall.children.ExprSingle) {
      if ('children' in exprSingle) {
        paths.push(...CstVisitor.extractAllPathExprsFromCST(exprSingle));
      }
    }
    return paths;
  }

  private static extractPathExprsFromFilterExpr(node: CstNode, filterExpr: CstElement): PathExprNode[] {
    const literal = CstVisitor.getSingleNode(filterExpr, ['Literal']);
    if (literal) {
      return [];
    }

    const contextItemExpr = CstVisitor.getSingleNode(filterExpr, ['ContextItemExpr']);
    if (contextItemExpr) {
      return [CstVisitor.visitPathExpr(node)];
    }

    const parenthesizedExpr = CstVisitor.getSingleNode(filterExpr, ['ParenthesizedExpr']);
    if (parenthesizedExpr && 'children' in parenthesizedExpr) {
      return CstVisitor.extractPathExprsFromParenthesizedExpr(parenthesizedExpr);
    }

    const functionCall = CstVisitor.getSingleNode(filterExpr, ['FunctionCall']);
    if (functionCall && 'children' in functionCall) {
      return CstVisitor.extractPathExprsFromFunctionCall(functionCall);
    }

    return [CstVisitor.visitPathExpr(node)];
  }

  private static extractPathExprsFromPathExprNode(node: CstNode): PathExprNode[] {
    const relativePathExpr = CstVisitor.getSingleNode(node, ['RelativePathExpr']);
    if (!relativePathExpr || !('children' in relativePathExpr)) {
      return [];
    }

    const childPathSegments = CstVisitor.getNodes(relativePathExpr, ['ChildPathSegmentExpr']);
    if (childPathSegments && childPathSegments.length > 0) {
      return [CstVisitor.visitPathExpr(node)];
    }

    const filterExpr = CstVisitor.getSingleNode(relativePathExpr, ['StepExpr', 'FilterExpr']);
    if (!filterExpr || !('children' in filterExpr)) {
      return [CstVisitor.visitPathExpr(node)];
    }

    return CstVisitor.extractPathExprsFromFilterExpr(node, filterExpr);
  }

  private static extractPathExprsFromChildrenArray(children: CstElement[]): PathExprNode[] {
    const paths: PathExprNode[] = [];
    for (const child of children) {
      if (('children' in child || 'name' in child) && 'children' in child) {
        paths.push(...CstVisitor.extractAllPathExprsFromCST(child));
      }
    }
    return paths;
  }

  private static extractPathExprsFromChildren(node: CstNode): PathExprNode[] {
    const paths: PathExprNode[] = [];
    if (!('children' in node)) {
      return paths;
    }

    for (const children of Object.values(node.children)) {
      if (Array.isArray(children)) {
        paths.push(...CstVisitor.extractPathExprsFromChildrenArray(children));
      }
    }

    return paths;
  }

  private static extractAllPathExprsFromCST(node: CstNode): PathExprNode[] {
    if (node.name === 'PathExpr' && 'children' in node) {
      return CstVisitor.extractPathExprsFromPathExprNode(node);
    }

    return CstVisitor.extractPathExprsFromChildren(node);
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
