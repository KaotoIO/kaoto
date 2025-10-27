import { IField, PrimitiveDocument } from '../../models/datamapper/document';
import {
  PathExpression,
  PathSegment,
  Predicate,
  PredicateOperator,
  PredicateOperatorSymbol,
} from '../../models/datamapper/xpath';
import { DocumentUtilService } from '../document-util.service';
import { IFunctionDefinition } from '../../models/datamapper/mapping';
import { FunctionGroup, ValidatedXPathParseResult, XPathParserResult } from './xpath-model';
import { monacoXPathLanguageMetadata } from './monaco-language';
import {
  ExprNode,
  PathExprNode,
  StepExprNode,
  XPathNodeType,
  PredicateNode,
  ComparisonExprNode,
  XPathNode,
  FilterExprNode,
  VarRefNode,
  LiteralNode,
} from './syntaxtree/xpath-syntaxtree-model';
import { XPathUtil } from './syntaxtree/xpath-syntaxtree-util';
import { XPath2Parser } from './2.0/xpath-2.0-parser';
import { XPATH_2_0_FUNCTIONS } from './2.0/xpath-2.0-functions';
import { CstVisitor } from './syntaxtree/xpath-syntaxtree-cst-visitor';

/**
 * The collection of logic to parse/unparse XPath expressions.
 * The parse() method parses the XPath string and returns a syntax tree representation.
 * The other methods are used to introspect the parsed syntax tree and convert between
 * XPath expressions and DataMapper mapping model objects.
 */
export class XPathService {
  static readonly parser = new XPath2Parser();
  static readonly functions = XPATH_2_0_FUNCTIONS;

  /**
   * Parses an XPath expression string into a parser result
   * @param xpath XPath expression string to parse
   * @returns parser result with CST, errors, and expression node
   */
  static parse(xpath: string): XPathParserResult {
    const cstResult = XPathService.parser.parseXPath(xpath);
    const exprNode = cstResult.cst ? CstVisitor.visit(cstResult.cst) : undefined;
    return { ...cstResult, exprNode };
  }

  /**
   * Validates an XPath expression and returns validation results
   * @param xpath XPath expression string to validate
   * @returns validation result with errors and warnings
   */
  static validate(xpath: string): ValidatedXPathParseResult {
    if (!xpath) {
      const answer = new ValidatedXPathParseResult();
      answer.warnings.push('Empty Expression');
      return answer;
    }
    const parserResult = XPathService.parse(xpath);
    const validationResult = new ValidatedXPathParseResult(parserResult);
    const exprNode = parserResult.exprNode;
    if (!exprNode) return validationResult;

    try {
      XPathService.extractFieldPathsFromExprNode(exprNode);
    } catch (error) {
      const errorString =
        'DataMapper internal error: failed to render a mapping line from a valid XPath expression: ' +
        (error instanceof Error ? error.message : String(error));
      validationResult.dataMapperErrors.push(errorString);
    }
    return validationResult;
  }

  /**
   * Gets all XPath function definitions grouped by function category
   * @returns record of function definitions organized by function group
   */
  static getXPathFunctionDefinitions(): Record<FunctionGroup, IFunctionDefinition[]> {
    return XPathService.functions;
  }

  private static getXPathFunctionNames(): string[] {
    return Object.values(XPathService.getXPathFunctionDefinitions()).reduce((acc, functions) => {
      acc.push(...functions.map((f) => f.name));
      return acc;
    }, [] as string[]);
  }

  /**
   * Gets Monaco editor language metadata for XPath with function names
   * @returns Monaco language metadata configuration
   */
  static getMonacoXPathLanguageMetadata() {
    monacoXPathLanguageMetadata.tokensProvider.actions = XPathService.getXPathFunctionNames();
    return monacoXPathLanguageMetadata;
  }

  /**
   * Extracts PathExpression objects representing field paths in the XPath expression.
   * This is used to find all the source fields referred from the expression so that the mapping
   * lines in the DataMapper UI could be drawn. The ability to analyze XPath is limited.
   * When the contextPath argument is passed in, the generated PathExpression
   * will be a relative path from the context path.
   * @param expression XPath expression string to parse
   * @param contextPath Optional context path for relative path generation
   */
  static extractFieldPaths(expression: string, contextPath?: PathExpression): PathExpression[] {
    const parsed = XPathService.parse(expression);
    if (!parsed.exprNode) {
      return [];
    }
    return XPathService.extractFieldPathsFromExprNode(parsed.exprNode, contextPath);
  }

  private static isNonRelevantFilterExpr(pathNode: PathExprNode): boolean {
    if (pathNode.steps.length !== 1 || !pathNode.steps[0].filterExpr) {
      return false;
    }
    const primaryType = pathNode.steps[0].filterExpr.primary.type;
    return (
      primaryType === XPathNodeType.Literal ||
      primaryType === XPathNodeType.FunctionCall ||
      primaryType === XPathNodeType.ParenthesizedExpr
    );
  }

  private static shouldSkipPath(pathNode: PathExprNode): boolean {
    return (
      pathNode.steps.length === 0 ||
      XPathService.isPathInsidePredicate(pathNode) ||
      XPathService.isNonRelevantFilterExpr(pathNode)
    );
  }

  private static tryAddUniquePath(paths: PathExpression[], pathNode: PathExprNode, contextPath?: PathExpression): void {
    const pathExpr = XPathService.extractPathExpression(pathNode, contextPath);
    const existing = paths.find((comp) => XPathService.matchPath(comp, pathExpr));
    if (!existing) {
      paths.push(pathExpr);
    }
  }

  private static extractFieldPathsFromExprNode(astNode: ExprNode, contextPath?: PathExpression): PathExpression[] {
    const pathExprNodes = XPathUtil.getAllNodesOfType<PathExprNode>(astNode, XPathNodeType.PathExpr);
    const paths: PathExpression[] = [];

    for (const pathNode of pathExprNodes) {
      if (XPathService.shouldSkipPath(pathNode)) {
        continue;
      }
      XPathService.tryAddUniquePath(paths, pathNode, contextPath);
    }

    return paths;
  }

  private static isPathInsidePredicate(pathNode: PathExprNode): boolean {
    let current: XPathNode | undefined = pathNode.parent;
    while (current) {
      if (current.type === XPathNodeType.Predicate) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  private static handleEmptyPath(isRelative: boolean, contextPath?: PathExpression): PathExpression {
    return new PathExpression(isRelative ? contextPath : undefined, isRelative);
  }

  private static handleVarRefPath(pathNode: PathExprNode, varRef: string): PathExpression {
    const answer = new PathExpression();
    answer.isRelative = false;
    answer.documentReferenceName = varRef;
    XPathService.addSegmentsFromSteps(answer, pathNode.steps, 1);
    return answer;
  }

  private static handleSingleContextItem(contextPath?: PathExpression): PathExpression {
    if (!contextPath) {
      const answer = new PathExpression();
      answer.isRelative = false;
      return answer;
    }
    const answer = new PathExpression();
    answer.isRelative = false;
    answer.documentReferenceName = contextPath.documentReferenceName;
    answer.pathSegments = [...contextPath.pathSegments];
    return answer;
  }

  private static handleMultiStepContextItem(
    pathNode: PathExprNode,
    isRelative: boolean,
    contextPath?: PathExpression,
  ): PathExpression {
    const answer = new PathExpression(isRelative ? contextPath : undefined, isRelative);
    XPathService.addSegmentsFromSteps(answer, pathNode.steps, 1);
    return answer;
  }

  private static handleContextItemPath(
    pathNode: PathExprNode,
    isRelative: boolean,
    contextPath?: PathExpression,
  ): PathExpression {
    if (pathNode.steps.length === 1) {
      return XPathService.handleSingleContextItem(contextPath);
    }
    return XPathService.handleMultiStepContextItem(pathNode, isRelative, contextPath);
  }

  private static handleFunctionCallPath(
    pathNode: PathExprNode,
    isRelative: boolean,
    contextPath?: PathExpression,
  ): PathExpression {
    const answer = new PathExpression(isRelative ? contextPath : undefined, isRelative);
    XPathService.addSegmentsFromStepsWithParentRefs(answer, pathNode.steps, 1);
    return answer;
  }

  private static addSegmentsFromSteps(answer: PathExpression, steps: StepExprNode[], startIndex: number): void {
    for (let i = startIndex; i < steps.length; i++) {
      const stepNode = steps[i];
      if (stepNode.nodeTest) {
        const segment = XPathService.extractSegmentFromStepExpr(stepNode);
        if (segment) {
          answer.pathSegments.push(segment);
        }
      }
    }
  }

  private static addSegmentsFromStepsWithParentRefs(
    answer: PathExpression,
    steps: StepExprNode[],
    startIndex: number,
  ): void {
    for (let i = startIndex; i < steps.length; i++) {
      const stepNode = steps[i];
      if (stepNode.reverseStep?.isParentReference) {
        answer.pathSegments.push(new PathSegment('..', false));
      } else if (stepNode.nodeTest) {
        const segment = XPathService.extractSegmentFromStepExpr(stepNode);
        if (segment) {
          answer.pathSegments.push(segment);
        }
      }
    }
  }

  private static handleSimplePath(
    pathNode: PathExprNode,
    isRelative: boolean,
    contextPath?: PathExpression,
  ): PathExpression {
    const answer = new PathExpression(isRelative ? contextPath : undefined, isRelative);
    for (const stepNode of pathNode.steps) {
      if (stepNode.reverseStep?.isParentReference) {
        answer.pathSegments.push(new PathSegment('..', false));
        continue;
      }
      if (stepNode.nodeTest) {
        const segment = XPathService.extractSegmentFromStepExpr(stepNode);
        if (segment) {
          answer.pathSegments.push(segment);
        }
      }
    }
    return answer;
  }

  private static extractPathExpression(pathNode: PathExprNode, contextPath?: PathExpression): PathExpression {
    const isRelative = !pathNode.isAbsolute;

    if (pathNode.steps.length === 0) {
      return XPathService.handleEmptyPath(isRelative, contextPath);
    }

    const firstStep = pathNode.steps[0];
    if (!firstStep.filterExpr) {
      return XPathService.handleSimplePath(pathNode, isRelative, contextPath);
    }

    const varRef = XPathService.extractVarRefFromFilterExpr(firstStep.filterExpr);
    if (varRef) {
      return XPathService.handleVarRefPath(pathNode, varRef);
    }

    const isContextItem = firstStep.filterExpr.primary.type === XPathNodeType.ContextItemExpr;
    if (isContextItem) {
      return XPathService.handleContextItemPath(pathNode, isRelative, contextPath);
    }

    const isFunctionCall = firstStep.filterExpr.primary.type === XPathNodeType.FunctionCall;
    if (isFunctionCall && pathNode.steps.length > 1) {
      return XPathService.handleFunctionCallPath(pathNode, isRelative, contextPath);
    }

    return XPathService.handleSimplePath(pathNode, isRelative, contextPath);
  }

  private static extractVarRefFromFilterExpr(filterExpr: FilterExprNode): string | undefined {
    if (filterExpr.primary.type === XPathNodeType.VarRef) {
      return filterExpr.primary.localName;
    }
    return undefined;
  }

  private static extractSegmentFromStepExpr(stepNode: StepExprNode): PathSegment | undefined {
    if (!stepNode.nodeTest) return undefined;

    const predicates = stepNode.predicates.map((predNode) => XPathService.extractPredicate(predNode));

    return new PathSegment(
      stepNode.nodeTest.localName,
      stepNode.isAttribute,
      stepNode.nodeTest.prefix || '',
      predicates,
    );
  }

  private static extractPredicate(predicateNode: PredicateNode): Predicate {
    const comparisonNodes = XPathUtil.getAllNodesOfType<ComparisonExprNode>(
      predicateNode,
      XPathNodeType.ComparisonExpr,
    );

    if (comparisonNodes.length > 0) {
      const compNode = comparisonNodes[0];
      const left = XPathService.extractOperand(compNode.left);
      const right = compNode.right ? XPathService.extractOperand(compNode.right) : '';

      return new Predicate(left, compNode.operator, right);
    }

    return new Predicate('', PredicateOperator.Unknown, '');
  }

  private static extractOperand(operand: PathExprNode | LiteralNode | VarRefNode): PathExpression | string {
    if ('steps' in operand) {
      return XPathService.extractPathExpression(operand);
    }

    if (operand.type === XPathNodeType.Literal) {
      return String(operand.value);
    }

    return '';
  }

  private static matchPath(path1: PathExpression, path2: PathExpression): boolean {
    if (
      path1.isRelative !== path2.isRelative ||
      path1.documentReferenceName !== path2.documentReferenceName ||
      path1.pathSegments.length !== path2.pathSegments.length
    ) {
      return false;
    }

    return !path1.pathSegments.some((path1Segment, index) => {
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
    if (predicate1.operator !== predicate2.operator) {
      return false;
    }

    let left1Match: boolean;
    if (typeof predicate1.left === 'string') {
      left1Match =
        (typeof predicate2.left === 'string' && predicate1.left === predicate2.left) ||
        (typeof predicate2.right === 'string' && predicate1.left === predicate2.right);
    } else {
      left1Match =
        (predicate2.left instanceof PathExpression && XPathService.matchPath(predicate1.left, predicate2.left)) ||
        (predicate2.right instanceof PathExpression && XPathService.matchPath(predicate1.left, predicate2.right));
    }

    let right1Match: boolean;
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

  /**
   * Tests if the field matches with the passed in PathSegment.
   * @param namespaces Namespace prefix to URI mapping
   * @param field Field to test
   * @param segment PathSegment to match against
   */
  static matchSegment(namespaces: { [p: string]: string }, field: IField, segment: PathSegment): boolean {
    const hasNamespace = !!segment.prefix;
    const namespaceUri = namespaces[segment.prefix];
    if ((hasNamespace && field.namespaceURI !== namespaceUri) || field.name !== segment.name) {
      return false;
    }

    return field.predicates.every((fieldPredicate) => {
      return segment.predicates.find((segmentPredicate) =>
        XPathService.matchPredicate(fieldPredicate, segmentPredicate),
      );
    });
  }

  /**
   * Generates PathExpression object representing the passed in document or field.
   * If contextPath is specified, this will return a relative path from the context path.
   * @param namespaceMap Namespace prefix to URI mapping
   * @param source Document or field to convert to path expression
   * @param contextPath Optional context path for relative path generation
   */
  static toPathExpression(
    namespaceMap: { [p: string]: string },
    source: PrimitiveDocument | IField,
    contextPath?: PathExpression,
  ): PathExpression {
    const doc = source.ownerDocument;
    const answer = new PathExpression(contextPath);
    answer.documentReferenceName = doc.getReferenceId(namespaceMap) || undefined;

    const parentAbsPath = contextPath && XPathService.toAbsolutePath(contextPath);
    const fieldStack = DocumentUtilService.getFieldStack(source, true).reverse();

    if (!parentAbsPath) {
      return fieldStack.reduce((acc, field) => {
        const segment = XPathService.extractSegmentFromField(namespaceMap, field);
        acc.pathSegments.push(segment);
        return acc;
      }, answer);
    }

    const sourceAbsPath = new PathExpression();
    sourceAbsPath.documentReferenceName = answer.documentReferenceName;
    for (const field of fieldStack) {
      const segment = XPathService.extractSegmentFromField(namespaceMap, field);
      sourceAbsPath.pathSegments.push(segment);
    }

    if (parentAbsPath.documentReferenceName !== sourceAbsPath.documentReferenceName) {
      answer.isRelative = false;
      answer.pathSegments = sourceAbsPath.pathSegments;
      return answer;
    }

    const contextSegments = parentAbsPath.pathSegments;
    const sourceSegments = sourceAbsPath.pathSegments;

    let commonLength = 0;
    while (
      commonLength < Math.min(contextSegments.length, sourceSegments.length) &&
      contextSegments[commonLength].name === sourceSegments[commonLength].name
    ) {
      commonLength++;
    }

    const parentRefsNeeded = contextSegments.length - commonLength;
    for (let i = 0; i < parentRefsNeeded; i++) {
      answer.pathSegments.push(new PathSegment('..', false));
    }

    for (let i = commonLength; i < sourceSegments.length; i++) {
      answer.pathSegments.push(sourceSegments[i]);
    }

    return answer;
  }

  private static extractSegmentFromField(namespaceMap: { [p: string]: string }, field: IField): PathSegment {
    const nsEntry = Object.entries(namespaceMap).find(([, uri]) => field.namespaceURI === uri);
    return new PathSegment(field.name, field.isAttribute, nsEntry ? nsEntry[0] : '', field.predicates);
  }

  /**
   * Generates XPath string representation from the passed in PathExpression object.
   * This is used when drag and drop is performed in UI, so that the source field could be added into the XPath
   * expression. The ability to handle predicates is currently limited to supporting string literals.
   * @param pathExpression PathExpression object to convert to XPath string
   */
  static toXPathString(pathExpression: PathExpression): string {
    if (pathExpression.isRelative && pathExpression.pathSegments.length === 0) {
      return '.';
    }

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
   * Adds a source field represented with the passed in PathExpression object into the expression.
   * For now it just adds it with a leading comma.
   * @param expression Existing XPath expression string
   * @param source PathExpression to add to the expression
   */
  static addSource(expression: string, source: PathExpression): string {
    const sourceString = XPathService.toXPathString(source);
    return expression ? `${expression}, ${sourceString}` : sourceString;
  }

  /**
   * Converts a relative path to an absolute path by resolving context paths
   * @param relativePath PathExpression to convert to absolute
   * @returns absolute PathExpression
   */
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

    answer.pathSegments = XPathService.handleParentReferences(answer.pathSegments);

    return answer;
  }

  private static handleParentReferences(pathSegments: PathSegment[]): PathSegment[] {
    const processedSegments: PathSegment[] = [];
    for (const segment of pathSegments) {
      if (segment.name === '..') {
        if (processedSegments.length > 0) {
          processedSegments.pop();
        }
      } else {
        processedSegments.push(segment);
      }
    }
    return processedSegments;
  }
}
