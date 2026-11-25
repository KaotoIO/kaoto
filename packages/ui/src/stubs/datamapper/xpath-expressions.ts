import { XPathService } from '../../services/xpath/xpath.service';

/*
 * XPath expressions for syntax tree tests. The operator corpus nests every operator family into every other, on
 * both sides and with and without parentheses, and puts each one into the containers that have dropped operands
 * before.
 */

const BINARY_FAMILIES = [
  '+',
  '-',
  '*',
  'div',
  'idiv',
  'mod',
  'and',
  'or',
  '|',
  'union',
  'intersect',
  'except',
  'to',
  '=',
  '!=',
  '<',
  '<=',
  '>',
  '>=',
  'eq',
  'ne',
  'lt',
  'le',
  'gt',
  'ge',
  'is',
  '<<',
  '>>',
].map((operator) => (x: string, y: string) => `${x} ${operator} ${y}`);
const ATOMIC_FAMILIES = [
  (x: string) => `-${x}`,
  (x: string) => `+${x}`,
  (x: string) => `${x} cast as xs:string`,
  (x: string) => `${x} castable as xs:string`,
  (x: string) => `${x} instance of xs:string`,
];
const INNER = [...BINARY_FAMILIES.map((family) => family('a', 'b')), ...ATOMIC_FAMILIES.map((family) => family('a'))];
const CONTAINERS = [
  (x: string) => x,
  (x: string) => `string(${x})`,
  (x: string) => `n[${x}]`,
  (x: string) => `if (${x}) then e else f`,
  (x: string) => `if (e) then ${x} else f`,
  (x: string) => `(${x})`,
  (x: string) => `${x}, e`,
];

/**
 * Whether `xpath` lexes and parses without errors.
 * @param xpath - the expression to check
 */
export const isParsableXPath = (xpath: string): boolean => {
  const parsed = XPathService.parse(xpath);
  return parsed.lexErrors.length === 0 && parsed.parseErrors.length === 0;
};

/**
 * Every operator family nested into every other, on both sides and with and without parentheses, plus each binary
 * operator with a literal operand. Expressions the grammar rejects (e.g. a chained comparison) are left out.
 */
export const nestedOperatorExpressions = (): string[] => {
  const expressions: string[] = [];
  for (const inner of INNER) {
    for (const family of BINARY_FAMILIES) {
      expressions.push(family(inner, 'c'), family('c', inner), family(`(${inner})`, 'c'), family('c', `(${inner})`));
    }
    for (const family of ATOMIC_FAMILIES) {
      expressions.push(family(`(${inner})`));
    }
  }
  for (const family of BINARY_FAMILIES) {
    expressions.push(family('c', "'x'"), family('1', 'c'));
  }
  return expressions.filter(isParsableXPath);
};

/**
 * Every operator put into each container that has dropped operands before. Not filtered by
 * {@link isParsableXPath}, so a test can assert that every one of them parses.
 */
export const containedOperatorExpressions = (): string[] =>
  INNER.flatMap((expression) => CONTAINERS.map((container) => container(expression)));

/**
 * The nested operator expressions, each of them again inside `string(…)`, and the contained operator expressions
 * that parse.
 */
export const tokenCoverageExpressions = (): string[] => {
  const nested = nestedOperatorExpressions();
  return [
    ...nested,
    ...nested.map((expression) => `string(${expression})`),
    ...containedOperatorExpressions().filter(isParsableXPath),
  ];
};

/**
 * Node shapes the operator corpus doesn't produce: reverse steps, the context item, variable references, filters,
 * parentheses, `if`, `for` / `some` / `every`, decimal and double literals and function arguments. Together with
 * {@link tokenCoverageExpressions} they reach every `XPathNodeType`.
 */
export const NODE_SHAPE_EXPRESSIONS: readonly string[] = [
  '..',
  'ancestor::x',
  '.',
  '$v[1]',
  "a[@id = 'x']/b",
  '(a)',
  '()',
  'if (a) then b else c',
  'for $x in a return $x',
  'some $x in a satisfies $x',
  'every $x in a satisfies $x',
  '1.5',
  '1e3',
  'f(a, 2)',
];
