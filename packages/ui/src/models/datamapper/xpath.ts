/**
 * The path representation in the XPath expression. This is solely used to represent the field path
 * in the XPath expression in the XSLT.
 * The PathExpression object holds an array of {@link PathSegment}, which represent each segment in
 * the path separated with `/` (slash). {@link PathSegment} holds an array of {@link Predicate},
 * which represent the predicates for the segment to identify the fields. This is introduced specifically
 * to support JSON lossless representation in XSLT, where it uses `key` attribute to specify the property
 * key. For example, an object field with the name `someField` will be `xf:map[@key = 'someField']` in XPath
 * while an anonymous object field will be just `xf:map`.
 * {@link PathExpression.contextPath} represents context path, for example inside the XSLT `for-each` loop,
 * the relative path is calculated from what is specified in the `for-each` selector. In this case, the path
 * of `for-each` selector is the context path and {@link PathExpression.pathSegments} only holds the relative
 * path segments traced from the context path. {@link PathExpression.isRelative} must be `true` in that case.
 * @see {@link PathSegment}
 * @see {@link Predicate}
 * @see {@link XPathService}
 */
export class PathExpression {
  constructor(public contextPath?: PathExpression) {
    if (contextPath) {
      this.isRelative = true;
      this.documentReferenceName = contextPath.documentReferenceName;
    }
  }

  pathSegments: PathSegment[] = [];
  isRelative: boolean = false;
  documentReferenceName?: string;
}

export class PathSegment {
  constructor(
    public readonly name: string,
    public readonly isAttribute: boolean = false,
    public readonly prefix: string = '',
    public readonly predicates: Predicate[] = [],
  ) {}
}

export class Predicate {
  constructor(
    public left: PathExpression | string,
    public operator: PredicateOperator,
    public right: PathExpression | string,
  ) {}
}

export enum PredicateOperator {
  Equal = 'Equal',
  Eq = 'Eq',
  NotEqual = 'NotEqual',
  Ne = 'Ne',
  LessThan = 'LessThan',
  Lt = 'Lt',
  LessThanEqual = 'LessThanEqual',
  Le = 'Le',
  GreaterThan = 'GreaterThan',
  Gt = 'Gt',
  GreaterThanEqual = 'GreaterThanEqual',
  Ge = 'Ge',
  Is = 'Is',

  Unknown = 'Unknown',
}

export enum PredicateOperatorSymbol {
  Equal = '=',
  Eq = 'eq',
  NotEqual = '!=',
  Ne = 'ne',
  LessThan = '<',
  Lt = 'lt',
  LessThanEqual = '<=',
  Le = 'le',
  GreaterThan = '>',
  Gt = 'gt',
  GreaterThanEqual = '>=',
  Ge = 'ge',
  Is = 'is',
}
