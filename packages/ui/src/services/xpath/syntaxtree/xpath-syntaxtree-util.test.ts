import { XPathService } from '../xpath.service';
import {
  FunctionCallNode,
  LiteralNode,
  NameTestNode,
  PathExprNode,
  StepExprNode,
  XPathNodeType,
} from './xpath-syntaxtree-model';
import { XPathUtil } from './xpath-syntaxtree-util';

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
      if (node && node.type === XPathNodeType.NameTest) {
        expect((node as NameTestNode).localName).toBe('child');
      }
    });
  });

  describe('getAllNodesOfType()', () => {
    it('should find all PathExpr nodes', () => {
      const ast = XPathService.parse('/path1, /path2').exprNode;
      expect(ast).toBeDefined();
      if (!ast) return;

      const pathNodes = XPathUtil.getAllNodesOfType<PathExprNode>(ast, XPathNodeType.PathExpr);
      expect(pathNodes.length).toBe(2);
      expect(pathNodes[0].type).toBe(XPathNodeType.PathExpr);
      expect(pathNodes[1].type).toBe(XPathNodeType.PathExpr);
    });

    it('should find all StepExpr nodes in a path', () => {
      const ast = XPathService.parse('/root/child1/child2').exprNode;
      expect(ast).toBeDefined();
      if (!ast) return;

      const stepNodes = XPathUtil.getAllNodesOfType<StepExprNode>(ast, XPathNodeType.StepExpr);
      expect(stepNodes.length).toBe(3);
      expect(stepNodes[0].nodeTest?.localName).toBe('root');
      expect(stepNodes[1].nodeTest?.localName).toBe('child1');
      expect(stepNodes[2].nodeTest?.localName).toBe('child2');
    });

    it('should find all Literal nodes in a complex expression', () => {
      const ast = XPathService.parse("'hello', 'world', 42").exprNode;
      expect(ast).toBeDefined();
      if (!ast) return;

      const literalNodes = XPathUtil.getAllNodesOfType<LiteralNode>(ast, XPathNodeType.Literal);
      expect(literalNodes.length).toBe(3);
      expect(literalNodes[0].value).toBe('hello');
      expect(literalNodes[1].value).toBe('world');
      expect(literalNodes[2].value).toBe(42);
    });

    it('should find function calls', () => {
      const ast = XPathService.parse("concat('a', 'b')").exprNode;
      expect(ast).toBeDefined();
      if (!ast) return;

      const funcNodes = XPathUtil.getAllNodesOfType<FunctionCallNode>(ast, XPathNodeType.FunctionCall);
      expect(funcNodes.length).toBe(1);
      expect(funcNodes[0].localName).toBe('concat');
    });

    it('should return empty array when no nodes of type exist', () => {
      const ast = XPathService.parse('/simple/path').exprNode;
      expect(ast).toBeDefined();
      if (!ast) return;

      const funcNodes = XPathUtil.getAllNodesOfType(ast, XPathNodeType.FunctionCall);
      expect(funcNodes.length).toBe(0);
    });

    it('should find predicates in path expressions', () => {
      const ast = XPathService.parse("/root/item[@key='value']").exprNode;
      expect(ast).toBeDefined();
      if (!ast) return;

      const predicateNodes = XPathUtil.getAllNodesOfType(ast, XPathNodeType.Predicate);
      expect(predicateNodes.length).toBe(1);
    });

    it('should find PathExpr nodes inside ArithmeticExpr', () => {
      const xpath = 'Price * Quantity + 10';
      const ast = XPathService.parse(xpath).exprNode;
      if (!ast) return;

      const pathNodes = XPathUtil.getAllNodesOfType<PathExprNode>(ast, XPathNodeType.PathExpr);
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

      const pathNodes = XPathUtil.getAllNodesOfType<PathExprNode>(ast, XPathNodeType.PathExpr);
      // Name, OrderId, and literals (which are also wrapped in PathExpr)
      expect(pathNodes.length).toBeGreaterThanOrEqual(2);

      // Verify that Name and OrderId are found
      const pathNames = pathNodes
        .filter((node) => node.steps.length > 0 && node.steps[0].nodeTest?.type === XPathNodeType.NameTest)
        .map((node) => (node.steps[0].nodeTest as NameTestNode).localName);
      expect(pathNames).toContain('Name');
      expect(pathNames).toContain('OrderId');
    });

    it('should find PathExpr nodes in nested arithmetic expressions', () => {
      const xpath = '(Price * Quantity) + (Tax * Rate)';
      const ast = XPathService.parse(xpath).exprNode;
      if (!ast) return;

      const pathNodes = XPathUtil.getAllNodesOfType<PathExprNode>(ast, XPathNodeType.PathExpr);
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

  describe('getParentChain()', () => {
    it('should return chain of parent nodes', () => {
      const ast = XPathService.parse('/root/child').exprNode;
      expect(ast).toBeDefined();
      if (!ast) return;

      const stepNodes = XPathUtil.getAllNodesOfType<StepExprNode>(ast, XPathNodeType.StepExpr);
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
      expect(chain.length).toBe(1);
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
});
