import { afterAll, expectTypeOf } from 'vitest';

import { NODE_SHAPE_EXPRESSIONS, tokenCoverageExpressions } from '../../../stubs/datamapper/xpath-expressions';
import { XPathService } from '../xpath.service';
import {
  CompleteXPathNodeMap,
  ExprNode,
  ExprSingleNode,
  NameTestNode,
  ParenthesizedExprNode,
  PathExprNode,
  XPathNodeMap,
  XPathNodeType,
  XPathSyntaxNode,
} from './xpath-syntaxtree-model';
import { XPathUtil } from './xpath-syntaxtree-util';

type WithoutLiteral = Omit<XPathNodeMap, XPathNodeType.Literal>;

// Compiled by the UI typecheck, never executed. The node map must have one entry per node type.
function checkNodeMapTypes(root: ExprNode) {
  // @ts-expect-error a node map without Literal is incomplete
  type IncompleteNodeMap = CompleteXPathNodeMap<WithoutLiteral>;
  expectTypeOf<IncompleteNodeMap>().toBeObject();
  expectTypeOf<XPathSyntaxNode['type']>().toEqualTypeOf<XPathNodeType>();
  expectTypeOf(XPathUtil.getAllNodesOfType(root, XPathNodeType.PathExpr)).toEqualTypeOf<PathExprNode[]>();
}
void checkNodeMapTypes;

const CHILD_WALK: Record<XPathNodeType, { expression: string; children: string[] }> = {
  [XPathNodeType.PathExpr]: { expression: 'a/b', children: ['StepExpr a', 'StepExpr b'] },
  [XPathNodeType.StepExpr]: { expression: 'a[1]', children: ['NameTest a', 'Predicate 1'] },
  [XPathNodeType.FilterExpr]: { expression: '$v[1]', children: ['VarRef v', 'Predicate 1'] },
  [XPathNodeType.FunctionCall]: { expression: 'f(a, 2)', children: ['Expr a', 'Expr 2'] },
  [XPathNodeType.Predicate]: { expression: 'a[1]', children: ['Expr 1'] },
  [XPathNodeType.ComparisonExpr]: { expression: "a = 'x'", children: ['PathExpr a', 'Literal x'] },
  [XPathNodeType.Expr]: { expression: 'a, b', children: ['PathExpr a', 'PathExpr b'] },
  [XPathNodeType.ParenthesizedExpr]: { expression: '(a)', children: ['Expr a'] },
  [XPathNodeType.ReverseStep]: { expression: 'ancestor::x', children: ['NameTest x'] },
  [XPathNodeType.IfExpr]: { expression: 'if (a) then b else c', children: ['Expr a', 'PathExpr b', 'PathExpr c'] },
  [XPathNodeType.ArithmeticExpr]: { expression: 'a + b', children: ['PathExpr a', 'PathExpr b'] },
  [XPathNodeType.LogicalExpr]: { expression: 'a and b', children: ['PathExpr a', 'PathExpr b'] },
  [XPathNodeType.CombineExpr]: { expression: 'a | b', children: ['PathExpr a', 'PathExpr b'] },
  [XPathNodeType.AtomicExpr]: { expression: 'a to b', children: ['PathExpr a', 'PathExpr b'] },
  [XPathNodeType.NameTest]: { expression: 'a', children: [] },
  [XPathNodeType.Literal]: { expression: "'x'", children: [] },
  [XPathNodeType.VarRef]: { expression: '$v', children: [] },
  [XPathNodeType.ContextItemExpr]: { expression: '.', children: [] },
  [XPathNodeType.UnsupportedExpr]: { expression: 'for $x in a return $x', children: [] },
};

const NODE_TYPES = new Set<unknown>(Object.values(XPathNodeType));

let corpus: { expression: string; root: ExprNode }[] | undefined;

function parseRoot(expression: string): ExprNode {
  const root = XPathService.parse(expression).exprNode;
  if (!root) throw new Error(`${expression} did not parse`);
  return root;
}

function getCorpus(): { expression: string; root: ExprNode }[] {
  corpus ??= [...tokenCoverageExpressions(), ...NODE_SHAPE_EXPRESSIONS].map((expression) => ({
    expression,
    root: parseRoot(expression),
  }));
  return corpus;
}

function firstText(node: XPathSyntaxNode): string | undefined {
  if (node.type === XPathNodeType.NameTest || node.type === XPathNodeType.VarRef) return node.localName;
  if (node.type === XPathNodeType.Literal) return String(node.value);
  for (const child of XPathUtil.getChildren(node)) {
    const text = firstText(child);
    if (text !== undefined) return text;
  }
  return undefined;
}

function childLabel(node: XPathSyntaxNode): string {
  const text = firstText(node);
  return text === undefined ? node.type : `${node.type} ${text}`;
}

function isSyntaxNode(value: unknown): value is XPathSyntaxNode {
  return typeof value === 'object' && value !== null && 'type' in value && NODE_TYPES.has(value.type);
}

function collectHeldNodes(value: unknown, held: XPathSyntaxNode[]): void {
  if (isSyntaxNode(value)) {
    held.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectHeldNodes(item, held);
    return;
  }
  if (typeof value === 'object' && value !== null) collectFields(value, held);
}

function collectFields(value: object, held: XPathSyntaxNode[]): void {
  for (const [key, field] of Object.entries(value)) {
    if (key !== 'parent' && key !== 'range') collectHeldNodes(field, held);
  }
}

function hasDuplicates(nodes: XPathSyntaxNode[]): boolean {
  return new Set(nodes).size !== nodes.length;
}

function findChildMismatches(expression: string, node: XPathSyntaxNode): string[] {
  const held: XPathSyntaxNode[] = [];
  collectFields(node, held);
  const walked = XPathUtil.getChildren(node);
  const mismatches: string[] = [];
  if (
    held.length !== walked.length ||
    hasDuplicates(held) ||
    hasDuplicates(walked) ||
    held.some((child) => !walked.includes(child))
  ) {
    mismatches.push(`${expression} → ${node.type} → walks ${walked.length} children of ${held.length} held`);
  }
  for (const child of walked) {
    if (child.parent !== node) mismatches.push(`${expression} → ${node.type} → ${child.type} has another parent`);
  }
  return mismatches;
}

function collectMismatches(expression: string, node: XPathSyntaxNode, mismatches: string[]): void {
  mismatches.push(...findChildMismatches(expression, node));
  for (const child of XPathUtil.getChildren(node)) collectMismatches(expression, child, mismatches);
}

function collectTypes(node: XPathSyntaxNode, types: Set<XPathNodeType>): void {
  types.add(node.type);
  for (const child of XPathUtil.getChildren(node)) collectTypes(child, types);
}

describe('XPathUtil', () => {
  describe('findNodeAtPosition()', () => {
    it('should find the deepest node at a given offset', () => {
      const ast = XPathService.parse('/root/child').exprNode;
      expect(ast).toBeDefined();
      if (!ast) return;

      const rootExpression = ast.expressions[0];
      expect(rootExpression).toBeDefined();

      const node = XPathUtil.findNodeAtPosition(ast, 1);
      expect(node).toBeDefined();
    });

    it('should return undefined for offset outside range', () => {
      const ast = XPathService.parse('/root').exprNode;
      expect(ast).toBeDefined();
      if (!ast) return;

      const node = XPathUtil.findNodeAtPosition(ast, 1000);
      expect(node).toBeUndefined();
    });

    it('should find child node when offset is within child range', () => {
      const ast = XPathService.parse('/root/child').exprNode;
      expect(ast).toBeDefined();
      if (!ast) return;

      const node = XPathUtil.findNodeAtPosition(ast, 7);
      expect(node).toBeDefined();
      if (node?.type === XPathNodeType.NameTest) {
        expect((node as NameTestNode).localName).toBe('child');
      }
    });
  });

  describe('getAllNodesOfType()', () => {
    it('should find all PathExpr nodes', () => {
      const ast = XPathService.parse('/path1, /path2').exprNode;
      expect(ast).toBeDefined();
      if (!ast) return;

      const pathNodes = XPathUtil.getAllNodesOfType(ast, XPathNodeType.PathExpr);
      expect(pathNodes).toHaveLength(2);
      expect(pathNodes[0].type).toBe(XPathNodeType.PathExpr);
      expect(pathNodes[1].type).toBe(XPathNodeType.PathExpr);
    });

    it('should find all StepExpr nodes in a path', () => {
      const ast = XPathService.parse('/root/child1/child2').exprNode;
      expect(ast).toBeDefined();
      if (!ast) return;

      const stepNodes = XPathUtil.getAllNodesOfType(ast, XPathNodeType.StepExpr);
      expect(stepNodes).toHaveLength(3);
      expect(stepNodes[0].nodeTest?.localName).toBe('root');
      expect(stepNodes[1].nodeTest?.localName).toBe('child1');
      expect(stepNodes[2].nodeTest?.localName).toBe('child2');
    });

    it('should find all Literal nodes in a complex expression', () => {
      const ast = XPathService.parse("'hello', 'world', 42").exprNode;
      expect(ast).toBeDefined();
      if (!ast) return;

      const literalNodes = XPathUtil.getAllNodesOfType(ast, XPathNodeType.Literal);
      expect(literalNodes).toHaveLength(3);
      expect(literalNodes[0].value).toBe('hello');
      expect(literalNodes[1].value).toBe('world');
      expect(literalNodes[2].value).toBe(42);
    });

    it('should find function calls', () => {
      const ast = XPathService.parse("concat('a', 'b')").exprNode;
      expect(ast).toBeDefined();
      if (!ast) return;

      const funcNodes = XPathUtil.getAllNodesOfType(ast, XPathNodeType.FunctionCall);
      expect(funcNodes).toHaveLength(1);
      expect(funcNodes[0].localName).toBe('concat');
    });

    it('should return empty array when no nodes of type exist', () => {
      const ast = XPathService.parse('/simple/path').exprNode;
      expect(ast).toBeDefined();
      if (!ast) return;

      const funcNodes = XPathUtil.getAllNodesOfType(ast, XPathNodeType.FunctionCall);
      expect(funcNodes).toHaveLength(0);
    });

    it('should find predicates in path expressions', () => {
      const ast = XPathService.parse("/root/item[@key='value']").exprNode;
      expect(ast).toBeDefined();
      if (!ast) return;

      const predicateNodes = XPathUtil.getAllNodesOfType(ast, XPathNodeType.Predicate);
      expect(predicateNodes).toHaveLength(1);
    });

    it('should find PathExpr nodes inside ArithmeticExpr', () => {
      const xpath = 'Price * Quantity + 10';
      const ast = XPathService.parse(xpath).exprNode;
      if (!ast) return;

      const pathNodes = XPathUtil.getAllNodesOfType(ast, XPathNodeType.PathExpr);
      // Price, Quantity, and literal 10 (which is also wrapped in PathExpr)
      expect(pathNodes.length).toBeGreaterThanOrEqual(2);

      // Verify that Price and Quantity are found
      const pathNames = pathNodes
        .filter((node) => node.steps.length > 0 && node.steps[0].nodeTest?.type === XPathNodeType.NameTest)
        .map((node) => (node.steps[0].nodeTest as NameTestNode).localName);
      expect(pathNames).toContain('Price');
      expect(pathNames).toContain('Quantity');
    });

    it('should find PathExpr nodes inside LogicalExpr', () => {
      const xpath = 'Name = "VIP" and OrderId = "123"';
      const ast = XPathService.parse(xpath).exprNode;
      if (!ast) return;

      const pathNodes = XPathUtil.getAllNodesOfType(ast, XPathNodeType.PathExpr);
      // Name, OrderId, and literals (which are also wrapped in PathExpr)
      expect(pathNodes.length).toBeGreaterThanOrEqual(2);

      // Verify that Name and OrderId are found
      const pathNames = pathNodes
        .filter((node) => node.steps.length > 0 && node.steps[0].nodeTest?.type === XPathNodeType.NameTest)
        .map((node) => (node.steps[0].nodeTest as NameTestNode).localName);
      expect(pathNames).toContain('Name');
      expect(pathNames).toContain('OrderId');
    });

    it('should find PathExpr nodes inside CombineExpr', () => {
      const xpath = '/Name | /OrderId';
      const ast = XPathService.parse(xpath).exprNode;
      if (!ast) return;

      const pathNodes = XPathUtil.getAllNodesOfType(ast, XPathNodeType.PathExpr);
      // Both operands of a union are real sources, so both have to be reachable — this is what
      // lets MappingLinksService draw a connection line per operand.
      expect(pathNodes).toHaveLength(2);

      const pathNames = pathNodes
        .filter((node) => node.steps.length > 0 && node.steps[0].nodeTest?.type === XPathNodeType.NameTest)
        .map((node) => (node.steps[0].nodeTest as NameTestNode).localName);
      expect(pathNames).toContain('Name');
      expect(pathNames).toContain('OrderId');
    });

    it('should find PathExpr nodes across a chained mixed combination', () => {
      const xpath = '/A | /B intersect /C except /D';
      const ast = XPathService.parse(xpath).exprNode;
      if (!ast) return;

      const pathNodes = XPathUtil.getAllNodesOfType(ast, XPathNodeType.PathExpr);
      expect(pathNodes).toHaveLength(4);
    });

    it('should find PathExpr nodes in nested arithmetic expressions', () => {
      const xpath = '(Price * Quantity) + (Tax * Rate)';
      const ast = XPathService.parse(xpath).exprNode;
      if (!ast) return;

      const pathNodes = XPathUtil.getAllNodesOfType(ast, XPathNodeType.PathExpr);
      // Price, Quantity, Tax, Rate (and possibly parenthesized expressions)
      expect(pathNodes.length).toBeGreaterThanOrEqual(4);

      // Verify that all field names are found
      const pathNames = pathNodes
        .filter((node) => node.steps.length > 0 && node.steps[0].nodeTest?.type === XPathNodeType.NameTest)
        .map((node) => (node.steps[0].nodeTest as NameTestNode).localName);
      expect(pathNames).toContain('Price');
      expect(pathNames).toContain('Quantity');
      expect(pathNames).toContain('Tax');
      expect(pathNames).toContain('Rate');
    });
  });

  describe('getChildren()', () => {
    afterAll(() => {
      corpus = undefined;
    });

    it.each(Object.values(XPathNodeType))('should walk the children of %s', (type) => {
      const { expression, children } = CHILD_WALK[type];
      const node = XPathUtil.getAllNodesOfType(parseRoot(expression), type)[0];
      expect(node).toBeDefined();
      if (!node) return;

      expect(XPathUtil.getChildren(node).map(childLabel)).toEqual(children);
    });

    it('should walk a reverse step before its predicates', () => {
      const step = XPathUtil.getAllNodesOfType(parseRoot('ancestor::x[1]'), XPathNodeType.StepExpr)[0];
      expect(step).toBeDefined();
      if (!step) return;

      expect(XPathUtil.getChildren(step).map(childLabel)).toEqual(['ReverseStep x', 'Predicate 1']);
    });

    it('should return a new array', () => {
      const path = XPathUtil.getAllNodesOfType(parseRoot('a/b'), XPathNodeType.PathExpr)[0];
      expect(path).toBeDefined();
      if (!path) return;

      const children = XPathUtil.getChildren(path);
      expect(children).toEqual(path.steps);
      expect(children).not.toBe(path.steps);
    });

    it('should throw for a node type it has no case for', () => {
      const forged = { type: 'Forged' } as unknown as XPathSyntaxNode;

      expect(() => XPathUtil.getChildren(forged)).toThrow('Unexpected XPath syntax node type: Forged');
    });

    it('should walk every child a node holds', () => {
      const childWalkRoots = Object.values(CHILD_WALK).map(({ expression }) => ({
        expression,
        root: parseRoot(expression),
      }));
      const mismatches: string[] = [];
      for (const { expression, root } of [...getCorpus(), ...childWalkRoots]) {
        collectMismatches(expression, root, mismatches);
      }

      expect(mismatches).toEqual([]);
    });

    it('should reach every node type', () => {
      const reached = new Set<XPathNodeType>();
      for (const { root } of getCorpus()) collectTypes(root, reached);

      expect(reached).toEqual(new Set(Object.values(XPathNodeType)));
    });
  });

  describe('getParentChain()', () => {
    it('should return chain of parent nodes', () => {
      const ast = XPathService.parse('/root/child').exprNode;
      expect(ast).toBeDefined();
      if (!ast) return;

      const stepNodes = XPathUtil.getAllNodesOfType(ast, XPathNodeType.StepExpr);
      expect(stepNodes.length).toBeGreaterThan(0);

      const chain = XPathUtil.getParentChain(stepNodes[0]);
      expect(chain.length).toBeGreaterThan(1);
      expect(chain[0]).toBe(ast);
    });

    it('should include the node itself at the end of the chain', () => {
      const ast = XPathService.parse('/root').exprNode;
      expect(ast).toBeDefined();
      if (!ast) return;

      const chain = XPathUtil.getParentChain(ast);
      expect(chain).toHaveLength(1);
      expect(chain[0]).toBe(ast);
    });

    it('should handle deep nesting', () => {
      const ast = XPathService.parse("/root[@key='value']/child").exprNode;
      expect(ast).toBeDefined();
      if (!ast) return;

      const literalNodes = XPathUtil.getAllNodesOfType(ast, XPathNodeType.Literal);
      expect(literalNodes.length).toBeGreaterThan(0);

      const chain = XPathUtil.getParentChain(literalNodes[0]);
      expect(chain.length).toBeGreaterThan(3);
      expect(chain[0]).toBe(ast);
      expect(chain[chain.length - 1]).toBe(literalNodes[0]);
    });
  });

  describe('createRange()', () => {
    it('should create a range with start and end positions', () => {
      const range = XPathUtil.createRange(1, 10, 0, 1, 20, 10);

      expect(range.start.line).toBe(1);
      expect(range.start.column).toBe(10);
      expect(range.start.offset).toBe(0);
      expect(range.end.line).toBe(1);
      expect(range.end.column).toBe(20);
      expect(range.end.offset).toBe(10);
    });

    it('should default end position to start position when not provided', () => {
      const range = XPathUtil.createRange(2, 5, 15);

      expect(range.start.line).toBe(2);
      expect(range.start.column).toBe(5);
      expect(range.start.offset).toBe(15);
      expect(range.end.line).toBe(2);
      expect(range.end.column).toBe(5);
      expect(range.end.offset).toBe(15);
    });
  });

  describe('getResultExpressions()', () => {
    const describeLeaf = (node: ExprSingleNode): string => {
      if (node.type === XPathNodeType.ParenthesizedExpr) return node.expr ? '(…)' : '()';
      if (node.type !== XPathNodeType.PathExpr) return node.type;
      return node.steps
        .map((step) => step.filterExpr?.primary.type ?? `${step.isAttribute ? '@' : ''}${step.nodeTest?.localName}`)
        .join('/');
    };
    const resultsOf = (expression: string) =>
      XPathUtil.getResultExpressions(XPathService.parse(expression).exprNode).map(describeLeaf);

    it('should throw for a node type it has no case for', () => {
      const forged = { type: 'Forged' } as unknown as ExprSingleNode;

      expect(() => XPathUtil.getResultExpressions(forged)).toThrow('Unexpected XPath syntax node type: Forged');
    });

    it.each([
      ['a comma sequence', 'a, b', ['a', 'b']],
      ['a union', 'a | b', ['a', 'b']],
      ['a union keyword', 'a union @b', ['a', '@b']],
      ['the left operand of intersect', 'a intersect b', ['a']],
      ['the left operand of except', 'a except b', ['a']],
      ['the inside of parentheses', '(a | b)', ['a', 'b']],
      ['both branches of if', 'if (c) then a else @b', ['a', '@b']],
      ['a multi-step path with a parenthesized step', '/x/(@a | b)', [`x/${XPathNodeType.ParenthesizedExpr}`]],
      ['a function call as one leaf', 'string(@id)', [XPathNodeType.FunctionCall]],
      ['a variable reference as one leaf', '$v', [XPathNodeType.VarRef]],
      ['a literal as one leaf', "'text'", [XPathNodeType.Literal]],
      ['an atomic operator as one leaf', '@a cast as xs:string', [XPathNodeType.AtomicExpr]],
      ['a comparison as one leaf', 'a = b', [XPathNodeType.ComparisonExpr]],
      ['an arithmetic operator as one leaf', 'a + b', [XPathNodeType.ArithmeticExpr]],
      ['a logical operator as one leaf', 'a and b', [XPathNodeType.LogicalExpr]],
      [
        'a quantified if branch as an unsupported leaf',
        'if (c) then some $x in X satisfies $x else @a',
        [XPathNodeType.UnsupportedExpr, '@a'],
      ],
      ['a for expression as an unsupported leaf', '@a, for $x in X return $x', ['@a', XPathNodeType.UnsupportedExpr]],
    ])('should return %s', (_name, expression, expected) => {
      expect(resultsOf(expression)).toEqual(expected);
    });

    it('should return an empty sequence as an empty parenthesized leaf', () => {
      const results = XPathUtil.getResultExpressions(XPathService.parse('()').exprNode);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe(XPathNodeType.ParenthesizedExpr);
      expect((results[0] as ParenthesizedExprNode).expr).toBeUndefined();
    });

    it('should return nothing for an undefined node', () => {
      expect(XPathUtil.getResultExpressions(undefined)).toEqual([]);
    });
  });
});
