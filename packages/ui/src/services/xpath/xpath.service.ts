import { XPath2Parser } from './2.0/xpath-2.0-parser';
import { FunctionGroup, XPathParserResult } from './xpath-parser';
import { IFunctionDefinition } from '../../models/datamapper/mapping';
import { XPATH_2_0_FUNCTIONS } from './2.0/xpath-2.0-functions';
import { monacoXPathLanguageMetadata } from './monaco-language';
import { CstElement, CstNode, TokenType } from 'chevrotain';
import { DocumentType, IField, PrimitiveDocument } from '../../models/datamapper/document';
import {
  PathExpression,
  PathSegment,
  Predicate,
  PredicateOperator,
  PredicateOperatorSymbol,
} from '../../models/datamapper/xpath';
import { DocumentUtilService } from '../document-util.service';

export class ValidatedXPathParseResult {
  constructor(public parserResult?: XPathParserResult) {}
  dataMapperErrors: string[] = [];
  warnings: string[] = [];

  hasErrors(): boolean {
    return (
      (this.parserResult && this.parserResult.lexErrors.length > 0) ||
      (this.parserResult && this.parserResult?.parseErrors.length > 0) ||
      this.dataMapperErrors.length > 0
    );
  }

  getErrors(): string[] {
    const answer = [];
    if (this.parserResult) {
      answer.push(...this.parserResult.lexErrors.map((e) => e.message));
      answer.push(...this.parserResult.parseErrors.map((e) => e.message));
    }
    answer.push(...this.dataMapperErrors);
    return answer;
  }

  hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  getWarnings(): string[] {
    return this.warnings;
  }

  getCst(): CstNode | undefined {
    return this.parserResult?.cst;
  }
}

/**
 * The collection of logic to parse/unparse XPath expression.
 * {@link parse()} method parses the XPath string and returns {@link XPathParserResult}.
 * If the parse is successful, {@link XPathParserResult.cst} would contain a parsed CST (Concrete Syntax Tree)
 * represented by {@link CstNode} object. For more information about CST, see https://chevrotain.io/.
 * The other methods contained in this class are mostly to introspect {@link CstNode} generated as a result of
 * parsing the XPath string and feed them into DataMapper mapping model objects.
 */
export class XPathService {
  static parser = new XPath2Parser();
  static functions = XPATH_2_0_FUNCTIONS;

  static parse(xpath: string): XPathParserResult {
    return XPathService.parser.parseXPath(xpath);
  }

  static validate(xpath: string): ValidatedXPathParseResult {
    if (!xpath) {
      const answer = new ValidatedXPathParseResult();
      answer.warnings.push('Empty Expression');
      return answer;
    }
    const parserResult = XPathService.parse(xpath);
    const validationResult = new ValidatedXPathParseResult(parserResult);
    if (!validationResult.getCst()) return validationResult;

    try {
      XPathService.extractFieldPaths(xpath);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      const errorString =
        'DataMapper internal error: failed to render a mapping line from a valid XPath expression: ' +
        ('message' in error ? error.message : error.toString());
      validationResult.dataMapperErrors.push(errorString);
    }
    return validationResult;
  }

  static getXPathFunctionDefinitions(): Record<FunctionGroup, IFunctionDefinition[]> {
    return XPathService.functions;
  }

  static getXPathFunctionNames(): string[] {
    return Object.values(XPathService.getXPathFunctionDefinitions()).reduce((acc, functions) => {
      acc.push(...functions.map((f) => f.name));
      return acc;
    }, [] as string[]);
  }

  static getMonacoXPathLanguageMetadata() {
    monacoXPathLanguageMetadata.tokensProvider.actions = XPathService.getXPathFunctionNames();
    return monacoXPathLanguageMetadata;
  }

  static getAllTokens(): TokenType[] {
    return XPathService.parser.getAllTokens();
  }

  static getSingleNode(node: CstElement, paths: string[]) {
    const nodes = XPathService.getNodes(node, paths);
    return nodes?.[0];
  }

  static getNodes(node: CstElement, paths: string[]) {
    let answer: CstElement[] = [node];
    for (const path of paths) {
      if (!('children' in answer[0]) || !answer[0].children[path]) return undefined;
      answer = answer[0].children[path];
    }
    return answer;
  }

  private static extractPathExpressionFromNode(node: CstNode, contextPath?: PathExpression): PathExpression {
    const answer = new PathExpression(contextPath);
    answer.isRelative = !('Slash' in node.children || 'DoubleSlash' in node.children);
    if (!('children' in node.children.RelativePathExpr[0])) return answer;
    const relativePathExpr = XPathService.getSingleNode(node, ['RelativePathExpr']);
    if (!relativePathExpr) return answer;
    const stepExpr = XPathService.getSingleNode(relativePathExpr, ['StepExpr']);
    if (!stepExpr) return answer;

    const varName = XPathService.getSingleNode(stepExpr, ['FilterExpr', 'VarRef', 'QName', 'NCName']);
    const contextItem = XPathService.getSingleNode(stepExpr, ['FilterExpr', 'ContextItemExpr']);
    if (varName && 'image' in varName) {
      answer.isRelative = false;
      answer.documentReferenceName = varName.image;
    } else if (contextItem && 'image' in contextItem) {
      answer.pathSegments.push(new PathSegment(contextItem.image, false));
    } else {
      const segment = XPathService.extractSegmentFromStepExpr(stepExpr);
      if (segment) {
        answer.pathSegments.push(segment);
      } else {
        throw Error('Unknown RelativePathExpr: ' + relativePathExpr);
      }
    }
    const following =
      relativePathExpr && 'children' in relativePathExpr && relativePathExpr.children.ChildPathSegmentExpr;

    if (!following) return answer;

    return following.reduce((acc, value) => {
      const stepExpr = XPathService.getSingleNode(value, ['StepExpr']);
      const segment = stepExpr && XPathService.extractSegmentFromStepExpr(stepExpr);
      if (segment) acc.pathSegments.push(segment);
      return acc;
    }, answer);
  }

  private static extractSegmentFromStepExpr(stepExpr: CstElement): PathSegment | undefined {
    const isAttribute = !!('children' in stepExpr && stepExpr.children['At']);
    const nameTest = XPathService.getSingleNode(stepExpr, ['NodeTest', 'NameTest']);
    if (!nameTest || !('children' in nameTest)) return;
    const ncNames = nameTest.children['NCName'];
    const colon = nameTest.children['Colon'];

    let segmentPrefix = '';
    let segmentName = '';
    if (ncNames.length === 1 && (!colon || colon.length === 0) && 'image' in ncNames[0]) {
      segmentName += ncNames[0].image;
    } else if (ncNames.length === 2 && colon?.length === 1 && 'image' in ncNames[0] && 'image' in ncNames[1]) {
      segmentPrefix = ncNames[0].image;
      segmentName = ncNames[1].image;
    }

    const predicateList = XPathService.getSingleNode(stepExpr, ['PredicateList']);
    const predicates = XPathService.extractPredicates(predicateList);

    return new PathSegment(segmentName, isAttribute, segmentPrefix, predicates);
  }

  private static extractPredicates(predicateList: CstElement | undefined): Predicate[] {
    if (!predicateList || !('children' in predicateList) || Object.keys(predicateList.children).length === 0) return [];
    const predicatesCst = predicateList.children;
    if (!('LSquare' in predicatesCst) || !('Expr' in predicatesCst) || !('RSquare' in predicatesCst)) return [];

    const answer: Predicate[] = [];
    const comparisonExpr = XPathService.getSingleNode(predicateList, [
      'Expr',
      'ExprSingle',
      'OrExpr',
      'AndExpr',
      'ComparisonExpr',
    ]);
    if (!comparisonExpr) return [];

    const operator = XPathService.extractPredicateOperator(comparisonExpr);
    const { left, right } = XPathService.extractOperands(comparisonExpr);
    if (operator && left && right) {
      answer.push(new Predicate(left, operator, right));
    }
    return answer;
  }

  private static extractOperands(comparisonExpr: CstElement): {
    left?: PathExpression | string;
    right?: PathExpression | string;
  } {
    const rangeExprArray = XPathService.getNodes(comparisonExpr, ['RangeExpr']);
    if (!rangeExprArray || rangeExprArray.length < 2) return {};

    const left = XPathService.extractPredicateRangeExpr(rangeExprArray[0]);
    const right = XPathService.extractPredicateRangeExpr(rangeExprArray[1]);

    return { left, right };
  }

  private static extractPredicateRangeExpr(rangeExpr: CstElement): PathExpression | string {
    const leftPathExpr = XPathService.getSingleNode(rangeExpr, [
      'AdditiveExpr',
      'MultiplicativeExpr',
      'UnionExpr',
      'IntersectExceptExpr',
      'InstanceofExpr',
      'PathExpr',
    ]);
    if (!leftPathExpr) return '';

    const literal = XPathService.extractLiteralFromPathExpr(leftPathExpr);
    if (literal) return literal;

    return XPathService.extractPathExpressionFromNode(leftPathExpr as CstNode);
  }

  private static extractLiteralFromPathExpr(pathExpr: CstElement): string | undefined {
    const literal = XPathService.getSingleNode(pathExpr, ['RelativePathExpr', 'StepExpr', 'FilterExpr', 'Literal']);
    if (!literal || !('children' in literal)) return;

    const literalEntry = Object.entries(literal.children)[0];
    const literalValue = 'image' in literalEntry[1][0] ? (literalEntry[1][0].image as string) : undefined;
    return literalValue && literalEntry[0] === 'StringLiteral'
      ? literalValue.replace(/^['"](.*)['"]/, '$1')
      : literalValue;
  }

  private static extractPredicateOperator(comparisonExpr: CstElement): PredicateOperator {
    const compChildren = 'children' in comparisonExpr && comparisonExpr.children;
    if (!compChildren) return PredicateOperator.Unknown;

    const operator = Object.values(PredicateOperator).find((operator) => operator in compChildren);
    return operator ?? PredicateOperator.Unknown;
  }

  /**
   * Extracts {@link PathExpression} object representing a field path in the XPath expression.
   * This is used to find all the source fields referred from the expression so that the mapping
   * lines in the DataMapper UI could be drawn. The ability to analyze XPath is limited.
   * @param expression
   * @param contextPath
   */
  static extractFieldPaths(expression: string, contextPath?: PathExpression): PathExpression[] {
    const parsed = XPathService.parse(expression);
    if (!parsed.cst) return [];
    const paths = XPathService.collectPathExprNodes(parsed.cst);
    return paths.reduce((acc, node) => {
      if ('children' in node) {
        const pathObj = XPathService.extractPathExpressionFromNode(node, contextPath);
        const existing = acc.find((comp) => XPathService.matchPath(comp, pathObj));
        !existing && acc.push(pathObj);
      } else if ('image' in node && node.image === '.') {
        const pathObj = new PathExpression();
        acc.push(pathObj);
      }
      return acc;
    }, [] as PathExpression[]);
  }

  private static matchPath(path1: PathExpression, path2: PathExpression): boolean {
    if (
      path1.isRelative !== path2.isRelative ||
      path1.documentReferenceName !== path2.documentReferenceName ||
      path1.pathSegments.length !== path2.pathSegments.length
    )
      return false;

    return !path1.pathSegments.find((path1Segment, index) => {
      const path2Segment = path2.pathSegments[index];
      if (
        path1Segment.name !== path2Segment.name ||
        path1Segment.prefix !== path2Segment.prefix ||
        path1Segment.isAttribute !== path2Segment.isAttribute ||
        path1Segment.predicates.length !== path2Segment.predicates.length
      ) {
        return true;
      }

      return path1Segment.predicates.find((path1Predicate, predicateIndex) => {
        const path2Predicate = path2Segment.predicates[predicateIndex];
        if (!path2Predicate) return false;

        return !XPathService.matchPredicate(path1Predicate, path2Predicate);
      });
    });
  }

  private static matchPredicate(predicate1: Predicate, predicate2: Predicate): boolean {
    if (predicate1.operator !== predicate2.operator) return false;

    let left1Match = false;
    if (typeof predicate1.left === 'string') {
      left1Match =
        (typeof predicate2.left === 'string' && predicate1.left === predicate2.left) ||
        (typeof predicate2.right === 'string' && predicate1.left === predicate2.right);
    } else {
      left1Match =
        (predicate2.left instanceof PathExpression && XPathService.matchPath(predicate1.left, predicate2.left)) ||
        (predicate2.right instanceof PathExpression && XPathService.matchPath(predicate1.left, predicate2.right));
    }

    let right1Match = false;
    if (typeof predicate1.right === 'string') {
      right1Match =
        (typeof predicate2.left === 'string' && predicate1.right === predicate2.left) ||
        (typeof predicate2.right === 'string' && predicate1.right === predicate2.right);
    } else {
      right1Match =
        (predicate2.left instanceof PathExpression && XPathService.matchPath(predicate1.right, predicate2.left)) ||
        (predicate2.right instanceof PathExpression && XPathService.matchPath(predicate1.right, predicate2.right));
    }

    return left1Match && right1Match;
  }

  private static collectPathExprNodes(node: CstNode): CstElement[] {
    const answer: CstElement[] = [];
    if (node.name === 'PathExpr') {
      answer.push(...XPathService.extractPathExprNode(node));
      return answer;
    }
    return Object.entries(node.children).reduce((acc, [key, value]) => {
      if (key === 'PathExpr') {
        acc.push(...XPathService.extractPathExprNode(value[0] as CstNode));
      } else {
        value.forEach((child) => {
          if ('children' in child) {
            acc.push(...XPathService.collectPathExprNodes(child));
          }
        });
      }
      return acc;
    }, [] as CstElement[]);
  }

  private static extractPathExprNode(pathExprNode: CstNode): CstElement[] {
    const filterExpr = XPathService.getSingleNode(pathExprNode, ['RelativePathExpr', 'StepExpr', 'FilterExpr']);
    if (!filterExpr) return [pathExprNode];

    const literal = XPathService.getSingleNode(filterExpr, ['Literal']);
    if (literal) return [];

    const contextItemExpr = XPathService.getSingleNode(filterExpr, ['ContextItemExpr']);
    if (contextItemExpr) return [contextItemExpr];

    // Extract contents in parenthesis
    const parenthesizedExpr = XPathService.getSingleNode(filterExpr, ['ParenthesizedExpr']);
    if (parenthesizedExpr && 'children' in parenthesizedExpr) {
      const expr = parenthesizedExpr.children['Expr'];
      return expr && expr.length > 0 ? XPathService.collectPathExprNodes(expr[0] as CstNode) : [];
    }

    // Extract arguments in FunctionCall
    const functionCall = XPathService.getSingleNode(filterExpr, ['FunctionCall']);
    if (functionCall && 'children' in functionCall) {
      return functionCall.children.ExprSingle
        ? functionCall.children.ExprSingle.flatMap((arg) =>
            'children' in arg ? XPathService.collectPathExprNodes(arg) : [],
          )
        : [];
    }

    return [pathExprNode];
  }

  /**
   * Tests if the field matches with the passed in {@link PathSegment}.
   * @param namespaces
   * @param field
   * @param segment
   */
  static matchSegment(namespaces: { [p: string]: string }, field: IField, segment: PathSegment): boolean {
    const hasNamespace = !!segment.prefix;
    const namespaceUri = namespaces[segment.prefix];
    if ((hasNamespace && field.namespaceURI !== namespaceUri) || field.name !== segment.name) return false;

    return field.predicates.every((fieldPredicate) => {
      return segment.predicates.find((segmentPredicate) =>
        XPathService.matchPredicate(fieldPredicate, segmentPredicate),
      );
    });
  }

  /**
   * Generates {@link PathExpression} object representing the passed in document or field.
   * If {@link contextPath} is specified, this will return a relative path from the context path.
   * @param namespaceMap
   * @param source
   * @param contextPath
   */
  static toPathExpression(
    namespaceMap: { [p: string]: string },
    source: PrimitiveDocument | IField,
    contextPath?: PathExpression,
  ): PathExpression {
    const doc = source.ownerDocument;
    const answer = new PathExpression(contextPath);
    if (doc.documentType === DocumentType.PARAM) answer.documentReferenceName = doc.getReferenceId(namespaceMap);

    const parentAbsPath = contextPath && XPathService.toAbsolutePath(contextPath);
    const fieldStack = DocumentUtilService.getFieldStack(source, true).reverse();
    return fieldStack.reduce((acc, field, index) => {
      if (parentAbsPath && index < parentAbsPath.pathSegments.length) return acc;

      const segment = XPathService.extractSegmentFromField(namespaceMap, field);
      acc.pathSegments.push(segment);
      return acc;
    }, answer);
  }

  private static extractSegmentFromField(namespaceMap: { [p: string]: string }, field: IField): PathSegment {
    const nsEntry = Object.entries(namespaceMap).find(([_prefix, uri]) => field.namespaceURI === uri);
    return new PathSegment(field.name, field.isAttribute, nsEntry ? nsEntry[0] : '', field.predicates);
  }

  /**
   * Generates XPath string representation from the passed in {@link PathExpression} object.
   * This is used when D&D is performed in UI, so that the source field could be added into the xpath
   * expression. As of now the ability to handle predicate is limited for that purpose only.
   * Note that currently it assumes that the predicate operands are always string if it's a literal,
   * i.e. wrapped with single quotations. While this should be enough for supporting JSON as `key`
   * attribute always holds a string, it might need a reconsideration when it's extended to the other
   * formats.
   * @see {@link PathExpression}
   * @param pathExpression
   */
  static toXPathString(pathExpression: PathExpression): string {
    let prefix = '';
    if (!pathExpression.isRelative) {
      prefix = pathExpression.documentReferenceName ? `$${pathExpression.documentReferenceName}` : '/';
    }

    return pathExpression.pathSegments.reduce((acc, segment, index) => {
      const segmentString = XPathService.segmentToXPathString(segment);
      const addSeparator =
        index !== 0 || (index === 0 && !pathExpression.isRelative && pathExpression.documentReferenceName);
      const separator = addSeparator ? '/' : '';
      return `${acc}${separator}${segmentString}`;
    }, prefix);
  }

  private static segmentToXPathString(segment: PathSegment): string {
    const nameLocalPart = segment.isAttribute ? `@${segment.name}` : segment.name;
    const namePart = segment.prefix ? `${segment.prefix}:${nameLocalPart}` : nameLocalPart;

    const predicatesPart = segment.predicates.reduce((acc, predicate) => {
      const prefix = acc ? `${acc} and ` : '';
      const leftString =
        predicate.left instanceof PathExpression ? XPathService.toXPathString(predicate.left) : `'${predicate.left}'`;
      const operatorString = PredicateOperatorSymbol[predicate.operator as keyof typeof PredicateOperatorSymbol];
      const rightString =
        predicate.right instanceof PathExpression
          ? XPathService.toXPathString(predicate.right)
          : `'${predicate.right}'`;

      return `${prefix}${leftString}${operatorString}${rightString}`;
    }, '');

    return predicatesPart ? `${namePart}[${predicatesPart}]` : namePart;
  }

  /**
   * Adds a source field represented with the passed in {@link PathExpression} object into the expression.
   * For now it just adds it with a leading comma.
   * @param expression
   * @param source
   */
  static addSource(expression: string, source: PathExpression): string {
    const sourceString = XPathService.toXPathString(source);
    return expression ? `${expression}, ${sourceString}` : sourceString;
  }

  static toAbsolutePath(relativePath: PathExpression): PathExpression {
    if (!relativePath.isRelative || !relativePath.contextPath) return relativePath;

    const answer = new PathExpression();
    answer.documentReferenceName = relativePath.documentReferenceName;
    answer.pathSegments = [...relativePath.pathSegments];

    let targetParentPath: PathExpression | undefined = relativePath.contextPath;
    while (targetParentPath) {
      answer.documentReferenceName = targetParentPath.documentReferenceName;
      answer.pathSegments.unshift(...targetParentPath.pathSegments);
      targetParentPath = targetParentPath.contextPath;
    }

    return answer;
  }
}
