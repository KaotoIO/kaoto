/**
 * The path representation in the XPath expression. This is solely used to represent the field path
 * in the XPath expression in the XSLT.
 * The PathExpression object holds an array of {@link PathSegment}, which represent each segment in
 * the path separated with `/` (slash). {@link PathSegment} holds an array of {@link Predicate},
 * which represent the predicates for the segment to identify the fields. This is introduced specifically
 * to support JSON lossless representation in XSLT, where it uses `key` attribute to specify the property
 * key. For example, an object field with the name `someField` will be `fn:map[@key = 'someField']` in XPath
 * while an anonymous object field will be just `fn:map`.
 * {@link PathExpression.contextPath} represents context path, for example inside the XSLT `for-each` loop,
 * the relative path is calculated from what is specified in the `for-each` selector. In this case, the path
 * of `for-each` selector is the context path and {@link PathExpression.pathSegments} only holds the relative
 * path segments traced from the context path. {@link PathExpression.isRelative} must be `true` in that case.
 * Even if it's not inside the `for-each` context, the xpath could be relative from the root. For example,
 * the path `/aaa/bbb/ccc` is equal to `aaa/bbb/ccc` if it's not in any context. In both case, they should have
 * {@link PathExpression.contextPath} undefined. However, `/aaa/bbb/ccc` should have `isRelative=false` while
 * `aaa/bbb/ccc` should have `isRelative=true`.
 * @see {@link PathSegment}
 * @see {@link Predicate}
 * @see {@link XPathService}
 */
export class PathExpression {
  constructor(
    public contextPath?: PathExpression,
    public isRelative?: boolean,
  ) {
    if (contextPath) {
      if (isRelative === undefined) {
        this.isRelative = true;
      }
      this.documentReferenceName = contextPath.documentReferenceName;
    } else if (isRelative === undefined) {
      this.isRelative = false;
    }
  }

  pathSegments: PathSegment[] = [];
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
  Precede = 'Precede',
  Follow = 'Follow',

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
  Precede = '<<',
  Follow = '>>',
}

/**
 * What an XPath expression, or a DataMapper mapping item, writes into the element that receives its output,
 * as far as attribute order is concerned. XSLT requires every attribute of an element to be written before any
 * of its children, otherwise the transform fails with XTDE0410. "Children" follows XDM: child elements, text
 * nodes, comments and processing instructions; attributes are not children. Namespace nodes count as
 * `ATTRIBUTES`: they too must be written before any child, and may follow an attribute.
 *
 * `EMPTY` (writes nothing, such as `()` or a variable declaration) is kept apart from `CHILDREN`: an empty part
 * next to attributes must not turn an attributes-only result into one that writes both. A result that can't be
 * determined statically, such as a variable reference or a function call, counts as `CHILDREN`.
 */
export enum XPathOutputKind {
  EMPTY = 'empty',
  CHILDREN = 'children',
  ATTRIBUTES = 'attributes',
  ATTRIBUTES_AND_CHILDREN = 'attributesAndChildren',
}
