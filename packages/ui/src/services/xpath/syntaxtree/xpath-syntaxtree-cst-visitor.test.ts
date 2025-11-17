import { XPathService } from '../xpath.service';
import { CstVisitor } from './xpath-syntaxtree-cst-visitor';
import { PathExprNode, XPathNodeType } from './xpath-syntaxtree-model';

describe('CstVisitor', () => {
  describe('visit()', () => {
    it('should convert simple path expression CST to a logical nodes', () => {
      const cst = XPathService.parse('/aaa/bbb/ccc').cst;
      const root = CstVisitor.visit(cst);

      expect(root).toBeDefined();
      expect(root.type).toBe(XPathNodeType.Expr);
      expect(root.expressions.length).toBe(1);

      const pathExpr = root.expressions[0] as PathExprNode;
      expect(pathExpr.type).toBe(XPathNodeType.PathExpr);
      expect(pathExpr.isAbsolute).toBe(true);
      expect(pathExpr.steps.length).toBe(3);
      expect(pathExpr.steps[0].nodeTest?.localName).toBe('aaa');
      expect(pathExpr.steps[1].nodeTest?.localName).toBe('bbb');
      expect(pathExpr.steps[2].nodeTest?.localName).toBe('ccc');
    });

    it('should handle relative path expressions', () => {
      const cst = XPathService.parse('aaa/bbb').cst;
      const root = CstVisitor.visit(cst);

      const pathExpr = root.expressions[0] as PathExprNode;
      expect(pathExpr.isAbsolute).toBe(false);
      expect(pathExpr.steps.length).toBe(2);
    });

    it('should handle attribute selectors', () => {
      const cst = XPathService.parse('/root/@attr').cst;
      const root = CstVisitor.visit(cst);

      const pathExpr = root.expressions[0] as PathExprNode;
      expect(pathExpr.steps.length).toBe(2);
      expect(pathExpr.steps[0].isAttribute).toBe(false);
      expect(pathExpr.steps[1].isAttribute).toBe(true);
      expect(pathExpr.steps[1].nodeTest?.localName).toBe('attr');
    });

    it('should handle namespaced elements', () => {
      const cst = XPathService.parse('/ns:root/ns:child').cst;
      const root = CstVisitor.visit(cst);

      const pathExpr = root.expressions[0] as PathExprNode;
      expect(pathExpr.steps[0].nodeTest?.prefix).toBe('ns');
      expect(pathExpr.steps[0].nodeTest?.localName).toBe('root');
      expect(pathExpr.steps[1].nodeTest?.prefix).toBe('ns');
      expect(pathExpr.steps[1].nodeTest?.localName).toBe('child');
    });

    it('should handle parent references', () => {
      const cst = XPathService.parse('../parent').cst;
      const root = CstVisitor.visit(cst);

      const pathExpr = root.expressions[0] as PathExprNode;
      expect(pathExpr.steps.length).toBe(2);
      expect(pathExpr.steps[0].reverseStep?.isParentReference).toBe(true);
      expect(pathExpr.steps[1].nodeTest?.localName).toBe('parent');
    });

    it('should handle predicates with string literals', () => {
      const cst = XPathService.parse("/root/item[@key='value']").cst;
      const root = CstVisitor.visit(cst);

      const pathExpr = root.expressions[0] as PathExprNode;
      expect(pathExpr.steps[1].predicates.length).toBe(1);

      const predicate = pathExpr.steps[1].predicates[0];
      expect(predicate.type).toBe(XPathNodeType.Predicate);
    });

    it('should handle variable references', () => {
      const cst = XPathService.parse('$var/path').cst;
      const root = CstVisitor.visit(cst);

      const pathExpr = root.expressions[0] as PathExprNode;
      expect(pathExpr.steps.length).toBe(2);
      expect(pathExpr.steps[0].filterExpr?.primary.type).toBe(XPathNodeType.VarRef);
    });

    it('should handle context item expressions', () => {
      const cst = XPathService.parse('./child').cst;
      const root = CstVisitor.visit(cst);

      const pathExpr = root.expressions[0] as PathExprNode;
      expect(pathExpr.steps.length).toBe(2);
      expect(pathExpr.steps[0].filterExpr?.primary.type).toBe(XPathNodeType.ContextItemExpr);
    });

    it('should handle function calls', () => {
      const cst = XPathService.parse("concat('hello', 'world')").cst;
      const root = CstVisitor.visit(cst);

      const pathExpr = root.expressions[0] as PathExprNode;
      expect(pathExpr.steps.length).toBe(1);
      expect(pathExpr.steps[0].filterExpr?.primary.type).toBe(XPathNodeType.FunctionCall);

      const funcCall = pathExpr.steps[0].filterExpr?.primary;
      if (funcCall && funcCall.type === XPathNodeType.FunctionCall) {
        expect(funcCall.localName).toBe('concat');
        expect(funcCall.arguments.length).toBe(2);
      }
    });

    it('should handle string literals', () => {
      const cst = XPathService.parse("'hello world'").cst;
      const root = CstVisitor.visit(cst);

      const pathExpr = root.expressions[0] as PathExprNode;
      const literal = pathExpr.steps[0].filterExpr?.primary;
      expect(literal?.type).toBe(XPathNodeType.Literal);
      if (literal && literal.type === XPathNodeType.Literal) {
        expect(literal.value).toBe('hello world');
        expect(literal.literalType).toBe('string');
      }
    });

    it('should handle integer literals', () => {
      const cst = XPathService.parse('42').cst;
      const root = CstVisitor.visit(cst);

      const pathExpr = root.expressions[0] as PathExprNode;
      const literal = pathExpr.steps[0].filterExpr?.primary;
      expect(literal?.type).toBe(XPathNodeType.Literal);
      if (literal && literal.type === XPathNodeType.Literal) {
        expect(literal.value).toBe(42);
        expect(literal.literalType).toBe('integer');
      }
    });

    it('should handle decimal literals', () => {
      const cst = XPathService.parse('3.14').cst;
      const root = CstVisitor.visit(cst);

      const pathExpr = root.expressions[0] as PathExprNode;
      const literal = pathExpr.steps[0].filterExpr?.primary;
      expect(literal?.type).toBe(XPathNodeType.Literal);
      if (literal && literal.type === XPathNodeType.Literal) {
        expect(literal.value).toBe(3.14);
        expect(literal.literalType).toBe('decimal');
      }
    });

    it('should handle comma-separated expressions', () => {
      const cst = XPathService.parse('/path1, /path2').cst;
      const root = CstVisitor.visit(cst);

      expect(root.expressions.length).toBe(2);
      expect((root.expressions[0] as PathExprNode).steps[0].nodeTest?.localName).toBe('path1');
      expect((root.expressions[1] as PathExprNode).steps[0].nodeTest?.localName).toBe('path2');
    });

    it('should preserve source position information', () => {
      const cst = XPathService.parse('/root/child').cst;
      const root = CstVisitor.visit(cst);

      expect(root.range).toBeDefined();
      expect(root.range.start).toBeDefined();
      expect(root.range.end).toBeDefined();
      expect(root.range.start.line).toBeGreaterThan(0);
      expect(root.range.start.column).toBeGreaterThan(0);
    });

    it('should handle path expression following function call', () => {
      const cst = XPathService.parse('current()/path/to/field').cst;
      const root = CstVisitor.visit(cst);

      const pathExpr = root.expressions[0] as PathExprNode;
      expect(pathExpr.steps.length).toBe(4);
      expect(pathExpr.steps[0].filterExpr?.primary.type).toBe(XPathNodeType.FunctionCall);
    });
  });
});
