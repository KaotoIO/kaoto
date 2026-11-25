import { IField, PrimitiveDocument } from '../../models/datamapper/document';
import { IFunctionDefinition } from '../../models/datamapper/mapping';
import {
  PathExpression,
  PathSegment,
  Predicate,
  PredicateOperator,
  PredicateOperatorSymbol,
  XPathOutputKind,
} from '../../models/datamapper/xpath';
import { DocumentUtilService } from '../document/document-util.service';
import { getPrefixForNamespaceURI } from '../namespace-util';
import { XPATH_2_0_FUNCTIONS } from './2.0/xpath-2.0-functions';
import { XPath2Parser } from './2.0/xpath-2.0-parser';
import { XPathFunctionCatalogService } from './catalog/xpath-function-catalog.service';
import { CstVisitor } from './syntaxtree/xpath-syntaxtree-cst-visitor';
import {
  ComparisonExprNode,
  ExprNode,
  ExprSingleNode,
  FilterExprNode,
  LiteralNode,
  PathExprNode,
  PredicateNode,
  StepExprNode,
  XPathNode,
  XPathNodeType,
} from './syntaxtree/xpath-syntaxtree-model';
import { XPathUtil } from './syntaxtree/xpath-syntaxtree-util';
import { FunctionGroup, ValidatedXPathParseResult, XPathParserResult } from './xpath-model';

/**
 * The collection of logic to parse/unparse XPath expressions.
 * The parse() method parses the XPath string and returns a syntax tree representation.
 * The other methods are used to introspect the parsed syntax tree and convert between
 * XPath expressions and DataMapper mapping model objects.
 */
export class XPathService {
  static readonly parser = new XPath2Parser();

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
   * Checks whether an XPath expression string is a simple path (a single PathExpr with no functions,
   * operators, arithmetic, or predicates on any of its steps) — except a step may carry exactly one
   * `[@key='literal']` predicate, which {@link isJsonKeyPredicate} recognizes as JSON Schema's
   * deterministic field-addressing convention (every `fn:map`/`fn:string`/etc. step generated for a
   * JSON field carries one) rather than an arbitrary, potentially ambiguous filter.
   * @param expression XPath expression string to check
   */
  static isSimplePath(expression: string): boolean {
    if (!expression?.trim()) return false;
    const parsed = XPathService.parse(expression);
    if (parsed.lexErrors.length > 0 || parsed.parseErrors.length > 0 || !parsed.exprNode) return false;
    if (parsed.exprNode.expressions.length !== 1) return false;

    // A union/intersect/except combination parses to a CombineExpr, so this one check also
    // rejects `/a | /b` without having to inspect the raw CST for operator tokens.
    const singleExpr = parsed.exprNode.expressions[0];
    if (singleExpr.type !== XPathNodeType.PathExpr) return false;

    const pathNode = singleExpr as PathExprNode;
    if (pathNode.steps.length === 0) return false;

    return pathNode.steps.every(
      (step) =>
        (!step.axis || step.axis === 'child' || step.axis === 'attribute') &&
        (!step.reverseStep || step.reverseStep.isParentReference) &&
        XPathService.hasOnlyAllowedPredicates(step) &&
        XPathService.hasValidFilterExpr(step),
    );
  }

  /**
   * A step may carry no predicates, or exactly one `[@key='literal']` JSON key predicate
   * (see {@link isJsonKeyPredicate}); anything else disqualifies {@link isSimplePath}.
   */
  private static hasOnlyAllowedPredicates(step: StepExprNode): boolean {
    if (!step.predicates?.length) return true;
    return step.predicates.length === 1 && XPathService.isJsonKeyPredicate(step.predicates[0]);
  }

  /**
   * A step's filter expression (if any) must have no predicates of its own and must be
   * a bare variable reference or context item (e.g. `$var[...]` or `.[...]`).
   */
  private static hasValidFilterExpr(step: StepExprNode): boolean {
    if (!step.filterExpr) return true;
    if (step.filterExpr.predicates?.length) return false;

    return (
      step.filterExpr.primary.type === XPathNodeType.VarRef ||
      step.filterExpr.primary.type === XPathNodeType.ContextItemExpr
    );
  }

  /**
   * Recognizes a `[@key='literal']` predicate — the shape every JSON Schema field step carries
   * (see `JsonSchemaField`'s constructor), used only to address an `fn:map` entry by key, not to
   * filter among several candidates. Anything else (a non-literal RHS, a non-`key` attribute, a
   * non-equality operator) is treated as a real filter and left to disqualify {@link isSimplePath}.
   */
  private static isJsonKeyPredicate(predicate: PredicateNode): boolean {
    if (predicate.expr.expressions.length !== 1) return false;
    const expr = predicate.expr.expressions[0];
    if (expr.type !== XPathNodeType.ComparisonExpr) return false;
    const comparison = expr as ComparisonExprNode;
    if (comparison.operator !== PredicateOperator.Equal && comparison.operator !== PredicateOperator.Eq) return false;

    const left = comparison.left;
    if (left.type !== XPathNodeType.PathExpr) return false;
    if (left.steps.length !== 1) return false;
    const onlyStep = left.steps[0];
    if (!onlyStep.isAttribute || onlyStep.predicates.length > 0) return false;
    if (onlyStep.nodeTest?.localName !== 'key' || onlyStep.nodeTest.prefix) return false;

    return (
      comparison.right?.type === XPathNodeType.Literal && (comparison.right as LiteralNode).literalType === 'string'
    );
  }

  /**
   * Whether the result of `expression` writes attributes, children, both, or nothing into the element that
   * receives it, which decides where an `xsl:copy-of` of it may go (XTDE0410: attributes must precede children).
   * Only the parts that become the result are looked at ({@link XPathUtil.getResultExpressions}), and each path is
   * judged by its last step, so `Item[@type = 'a']` and `string(@id)` write children while `@*`, `attribute::*`
   * and `@node()` write attributes, and so do namespace nodes (`namespace::*`), which XTDE0410 also requires
   * before any child. Anything that isn't a path writes children, including an operator that turns a path into
   * atomic values (`-@a`, `@a cast as xs:string`, `@a instance of attribute()`, `@a to 7`). A lex or parse
   * error gives `CHILDREN`.
   *
   * Known gaps, which only a hand-edited expression reaches, all reading as `CHILDREN`:
   * - `for … return`, which the syntax tree doesn't model, even when it returns attributes;
   * - variables and function calls, whose result can't be known statically;
   * - an `attribute()` or `namespace-node()` kind test without an axis, because the syntax tree drops kind tests;
   * - `ancestor-or-self::` / `descendant-or-self::` applied to an attribute step.
   * @param expression - the XPath expression, typically an `xsl:copy-of` `select`
   * @param getContextItemKind - the kind of the context item `.`, for example through an enclosing
   * `xsl:for-each`; without it, `.` is treated as writing children
   */
  static getOutputKind(expression: string, getContextItemKind?: () => XPathOutputKind): XPathOutputKind {
    const parsed = XPathService.parse(expression);
    if (parsed.lexErrors.length > 0 || parsed.parseErrors.length > 0 || !parsed.exprNode) {
      return XPathOutputKind.CHILDREN;
    }
    return XPathService.getResultsOutputKind(parsed.exprNode, getContextItemKind);
  }

  /**
   * Combines the kinds of the parts that together make up one result, such as the operands of a union or the
   * children of an `xsl:if`. Empty parts are ignored, so a result with no other part is `EMPTY`. Any
   * `ATTRIBUTES_AND_CHILDREN`, or `ATTRIBUTES` together with `CHILDREN`, gives `ATTRIBUTES_AND_CHILDREN`.
   * Otherwise the single remaining kind wins.
   * @param kinds - the kinds of the parts, in any order
   */
  static combineOutputKinds(kinds: XPathOutputKind[]): XPathOutputKind {
    let hasAttributes = false;
    let hasChildren = false;
    for (const kind of kinds) {
      if (kind === XPathOutputKind.ATTRIBUTES_AND_CHILDREN) return XPathOutputKind.ATTRIBUTES_AND_CHILDREN;
      if (kind === XPathOutputKind.ATTRIBUTES) hasAttributes = true;
      if (kind === XPathOutputKind.CHILDREN) hasChildren = true;
    }
    if (hasAttributes && hasChildren) return XPathOutputKind.ATTRIBUTES_AND_CHILDREN;
    if (hasAttributes) return XPathOutputKind.ATTRIBUTES;
    if (hasChildren) return XPathOutputKind.CHILDREN;
    return XPathOutputKind.EMPTY;
  }

  private static getResultsOutputKind(
    node: ExprNode | ExprSingleNode,
    getContextItemKind?: () => XPathOutputKind,
  ): XPathOutputKind {
    const kinds: XPathOutputKind[] = [];
    for (const result of XPathUtil.getResultExpressions(node)) {
      kinds.push(XPathService.getResultOutputKind(result, getContextItemKind));
    }
    return XPathService.combineOutputKinds(kinds);
  }

  private static getResultOutputKind(
    result: ExprSingleNode,
    getContextItemKind?: () => XPathOutputKind,
  ): XPathOutputKind {
    if (result.type === XPathNodeType.ParenthesizedExpr && !result.expr) return XPathOutputKind.EMPTY;
    if (result.type !== XPathNodeType.PathExpr) return XPathOutputKind.CHILDREN;
    if (result.steps.length === 0) return XPathOutputKind.CHILDREN;
    return XPathService.getStepOutputKind(result, result.steps.length - 1, getContextItemKind);
  }

  private static getStepOutputKind(
    path: PathExprNode,
    index: number,
    getContextItemKind?: () => XPathOutputKind,
  ): XPathOutputKind {
    const step = path.steps[index];
    if (step.reverseStep) return XPathOutputKind.CHILDREN;
    if (step.isAttribute || step.axis === 'namespace') return XPathOutputKind.ATTRIBUTES;
    if (XPathService.isSelfStep(step)) return XPathService.getPrecedingStepKind(path, index, getContextItemKind);
    const primary = step.filterExpr?.primary;
    if (primary?.type !== XPathNodeType.ParenthesizedExpr) return XPathOutputKind.CHILDREN;
    if (!primary.expr) return XPathOutputKind.EMPTY;
    return XPathService.getResultsOutputKind(primary.expr, () =>
      XPathService.getPrecedingStepKind(path, index, getContextItemKind),
    );
  }

  private static getPrecedingStepKind(
    path: PathExprNode,
    index: number,
    getContextItemKind?: () => XPathOutputKind,
  ): XPathOutputKind {
    if (index > 0) return XPathService.getStepOutputKind(path, index - 1, getContextItemKind);
    if (path.isAbsolute || !getContextItemKind) return XPathOutputKind.CHILDREN;
    return getContextItemKind();
  }

  private static isSelfStep(step: StepExprNode): boolean {
    return step.axis === 'self' || step.filterExpr?.primary.type === XPathNodeType.ContextItemExpr;
  }

  /**
   * Gets all XPath function definitions grouped by function category
   * @returns record of function definitions organized by function group
   */
  static getXPathFunctionDefinitions(): Partial<Record<FunctionGroup, IFunctionDefinition[]>> {
    return XPathFunctionCatalogService.getCatalog() ?? XPATH_2_0_FUNCTIONS;
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

  /**
   * Extracts all variable names referenced in an XPath expression.
   * Uses two-phase detection:
   *   1. AST walk via {@link extractFieldPaths} — catches `$x` and `$x/path`
   *   2. Regex fallback — catches `$x` inside function calls that the AST walker skips
   * @returns deduplicated array of variable names (without the `$` prefix)
   */
  static extractVariableNames(expression: string, contextPath?: PathExpression): string[] {
    const fromAst = XPathService.extractFieldPaths(expression, contextPath)
      .filter((p) => p.documentReferenceName)
      .map((p) => p.documentReferenceName!);
    const fromRegex = Array.from(expression.matchAll(/\$(\w+)/g)).map((m) => m[1]);
    return Array.from(new Set([...fromAst, ...fromRegex]));
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
    if (!paths.some((comp) => XPathService.matchPath(comp, pathExpr))) {
      paths.push(pathExpr);
    }
  }

  private static extractFieldPathsFromExprNode(astNode: ExprNode, contextPath?: PathExpression): PathExpression[] {
    const pathExprNodes = XPathUtil.getAllNodesOfType(astNode, XPathNodeType.PathExpr);
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
    const comparisonNodes = XPathUtil.getAllNodesOfType(predicateNode, XPathNodeType.ComparisonExpr);

    if (comparisonNodes.length > 0) {
      const compNode = comparisonNodes[0];
      const left = XPathService.extractOperand(compNode.left);
      const right = compNode.right ? XPathService.extractOperand(compNode.right) : '';

      return new Predicate(left, compNode.operator, right);
    }

    return new Predicate('', PredicateOperator.Unknown, '');
  }

  /**
   * Any operand other than a path or a literal yields `''`, like a variable reference does: a predicate comparing
   * against a union of sequences, an arithmetic result or `@id cast as xs:integer` has no single
   * {@link PathExpression} to report.
   */
  private static extractOperand(operand: ExprSingleNode): PathExpression | string {
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
    const fieldStack = DocumentUtilService.getFieldStack(source, true)
      .reverse()
      .filter((f) => !f.wrapperKind);

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
    return new PathSegment(
      field.name,
      field.isAttribute,
      getPrefixForNamespaceURI(field.namespaceURI, namespaceMap),
      field.predicates,
    );
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
