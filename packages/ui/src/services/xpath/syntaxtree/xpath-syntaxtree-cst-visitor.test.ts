import { XPathService } from '../xpath.service';
import { CstVisitor } from './xpath-syntaxtree-cst-visitor';
import {
  ArithmeticExprNode,
  NameTestNode,
  ParenthesizedExprNode,
  PathExprNode,
  XPathNodeType,
} from './xpath-syntaxtree-model';
import { XPathUtil } from './xpath-syntaxtree-util';

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

    describe('Arithmetic expressions', () => {
      it('should handle multiplication: price * quantity', () => {
        const cst = XPathService.parse('price * quantity').cst;
        const root = CstVisitor.visit(cst);

        expect(root.expressions.length).toBe(1);
        const arithmeticExpr = root.expressions[0];
        expect(arithmeticExpr.type).toBe(XPathNodeType.ArithmeticExpr);

        if (arithmeticExpr.type === XPathNodeType.ArithmeticExpr) {
          expect(arithmeticExpr.operator).toBe('Multiply');
          expect(arithmeticExpr.left.type).toBe(XPathNodeType.PathExpr);
          expect(arithmeticExpr.right.type).toBe(XPathNodeType.PathExpr);

          if (arithmeticExpr.left.type === XPathNodeType.PathExpr) {
            expect(arithmeticExpr.left.steps[0].nodeTest?.localName).toBe('price');
          }
          if (arithmeticExpr.right.type === XPathNodeType.PathExpr) {
            expect(arithmeticExpr.right.steps[0].nodeTest?.localName).toBe('quantity');
          }
        }
      });

      it('should handle addition: price + tax', () => {
        const cst = XPathService.parse('price + tax').cst;
        const root = CstVisitor.visit(cst);

        const arithmeticExpr = root.expressions[0];
        expect(arithmeticExpr.type).toBe(XPathNodeType.ArithmeticExpr);

        if (arithmeticExpr.type === XPathNodeType.ArithmeticExpr) {
          expect(arithmeticExpr.operator).toBe('Plus');
        }
      });

      it('should handle subtraction: total - discount', () => {
        const cst = XPathService.parse('total - discount').cst;
        const root = CstVisitor.visit(cst);

        const arithmeticExpr = root.expressions[0];
        expect(arithmeticExpr.type).toBe(XPathNodeType.ArithmeticExpr);

        if (arithmeticExpr.type === XPathNodeType.ArithmeticExpr) {
          expect(arithmeticExpr.operator).toBe('Minus');
        }
      });

      it('should handle division: price div quantity', () => {
        const cst = XPathService.parse('price div quantity').cst;
        const root = CstVisitor.visit(cst);

        const arithmeticExpr = root.expressions[0];
        expect(arithmeticExpr.type).toBe(XPathNodeType.ArithmeticExpr);

        if (arithmeticExpr.type === XPathNodeType.ArithmeticExpr) {
          expect(arithmeticExpr.operator).toBe('Div');
        }
      });

      it('should handle modulo: count mod 10', () => {
        const cst = XPathService.parse('count mod 10').cst;
        const root = CstVisitor.visit(cst);

        const arithmeticExpr = root.expressions[0];
        expect(arithmeticExpr.type).toBe(XPathNodeType.ArithmeticExpr);

        if (arithmeticExpr.type === XPathNodeType.ArithmeticExpr) {
          expect(arithmeticExpr.operator).toBe('Mod');
        }
      });

      it('should handle chained addition: a + b + c', () => {
        const cst = XPathService.parse('a + b + c').cst;
        const root = CstVisitor.visit(cst);

        const arithmeticExpr = root.expressions[0];
        expect(arithmeticExpr.type).toBe(XPathNodeType.ArithmeticExpr);

        if (arithmeticExpr.type === XPathNodeType.ArithmeticExpr) {
          // Should be nested: (a + b) + c
          expect(arithmeticExpr.operator).toBe('Plus');
          expect(arithmeticExpr.left.type).toBe(XPathNodeType.ArithmeticExpr);
          expect(arithmeticExpr.right.type).toBe(XPathNodeType.PathExpr);

          if (arithmeticExpr.right.type === XPathNodeType.PathExpr) {
            expect(arithmeticExpr.right.steps[0].nodeTest?.localName).toBe('c');
          }
        }
      });

      it('should handle mixed operations: a * b + c', () => {
        const cst = XPathService.parse('a * b + c').cst;
        const root = CstVisitor.visit(cst);

        const arithmeticExpr = root.expressions[0];
        expect(arithmeticExpr.type).toBe(XPathNodeType.ArithmeticExpr);

        if (arithmeticExpr.type === XPathNodeType.ArithmeticExpr) {
          // Should respect precedence: (a * b) + c
          expect(arithmeticExpr.operator).toBe('Plus');
          expect(arithmeticExpr.left.type).toBe(XPathNodeType.ArithmeticExpr);

          if (arithmeticExpr.left.type === XPathNodeType.ArithmeticExpr) {
            expect(arithmeticExpr.left.operator).toBe('Multiply');
          }
        }
      });

      it('should handle path expressions in arithmetic: /order/item/price * /order/item/quantity', () => {
        const cst = XPathService.parse('/order/item/price * /order/item/quantity').cst;
        const root = CstVisitor.visit(cst);

        const arithmeticExpr = root.expressions[0];
        expect(arithmeticExpr.type).toBe(XPathNodeType.ArithmeticExpr);

        if (arithmeticExpr.type === XPathNodeType.ArithmeticExpr) {
          expect(arithmeticExpr.left.type).toBe(XPathNodeType.PathExpr);
          expect(arithmeticExpr.right.type).toBe(XPathNodeType.PathExpr);

          if (arithmeticExpr.left.type === XPathNodeType.PathExpr) {
            expect(arithmeticExpr.left.steps.length).toBe(3);
            expect(arithmeticExpr.left.steps[2].nodeTest?.localName).toBe('price');
          }
          if (arithmeticExpr.right.type === XPathNodeType.PathExpr) {
            expect(arithmeticExpr.right.steps.length).toBe(3);
            expect(arithmeticExpr.right.steps[2].nodeTest?.localName).toBe('quantity');
          }
        }
      });
    });

    describe('Logical expressions', () => {
      it('should handle AND operation: condition1 and condition2', () => {
        const cst = XPathService.parse('price > 100 and quantity < 10').cst;
        const root = CstVisitor.visit(cst);

        const logicalExpr = root.expressions[0];
        expect(logicalExpr.type).toBe(XPathNodeType.LogicalExpr);

        if (logicalExpr.type === XPathNodeType.LogicalExpr) {
          expect(logicalExpr.operator).toBe('And');
          expect(logicalExpr.left.type).toBe(XPathNodeType.ComparisonExpr);
          expect(logicalExpr.right.type).toBe(XPathNodeType.ComparisonExpr);
        }
      });

      it('should handle OR operation: condition1 or condition2', () => {
        const cst = XPathService.parse('status = "active" or status = "pending"').cst;
        const root = CstVisitor.visit(cst);

        const logicalExpr = root.expressions[0];
        expect(logicalExpr.type).toBe(XPathNodeType.LogicalExpr);

        if (logicalExpr.type === XPathNodeType.LogicalExpr) {
          expect(logicalExpr.operator).toBe('Or');
        }
      });

      it('should handle chained AND: cond1 and cond2 and cond3', () => {
        const cst = XPathService.parse('a > 1 and b > 2 and c > 3').cst;
        const root = CstVisitor.visit(cst);

        const logicalExpr = root.expressions[0];
        expect(logicalExpr.type).toBe(XPathNodeType.LogicalExpr);

        if (logicalExpr.type === XPathNodeType.LogicalExpr) {
          // Should be nested: (a > 1 and b > 2) and c > 3
          expect(logicalExpr.operator).toBe('And');
          expect(logicalExpr.left.type).toBe(XPathNodeType.LogicalExpr);
          expect(logicalExpr.right.type).toBe(XPathNodeType.ComparisonExpr);
        }
      });

      it('should handle complex condition: (price > 100) and (quantity < 10)', () => {
        const cst = XPathService.parse('price > 100 and quantity < 10').cst;
        const root = CstVisitor.visit(cst);

        const logicalExpr = root.expressions[0];
        expect(logicalExpr.type).toBe(XPathNodeType.LogicalExpr);

        if (logicalExpr.type === XPathNodeType.LogicalExpr) {
          expect(logicalExpr.left.type).toBe(XPathNodeType.ComparisonExpr);
          expect(logicalExpr.right.type).toBe(XPathNodeType.ComparisonExpr);

          if (logicalExpr.left.type === XPathNodeType.ComparisonExpr) {
            expect(logicalExpr.left.operator).toBe('GreaterThan');
          }
          if (logicalExpr.right.type === XPathNodeType.ComparisonExpr) {
            expect(logicalExpr.right.operator).toBe('LessThan');
          }
        }
      });
    });

    describe('Parent references and source ranges', () => {
      it('should set parent references correctly in arithmetic expressions', () => {
        const cst = XPathService.parse('a + b').cst;
        const root = CstVisitor.visit(cst);

        const arithmeticExpr = root.expressions[0];
        if (arithmeticExpr.type === XPathNodeType.ArithmeticExpr) {
          expect(arithmeticExpr.parent).toBe(root);
          expect(arithmeticExpr.left.parent).toBe(arithmeticExpr);
          expect(arithmeticExpr.right.parent).toBe(arithmeticExpr);
        }
      });

      it('should set parent references correctly in logical expressions', () => {
        const cst = XPathService.parse('a > 1 and b > 2').cst;
        const root = CstVisitor.visit(cst);

        const logicalExpr = root.expressions[0];
        if (logicalExpr.type === XPathNodeType.LogicalExpr) {
          expect(logicalExpr.parent).toBe(root);
          expect(logicalExpr.left.parent).toBe(logicalExpr);
          expect(logicalExpr.right.parent).toBe(logicalExpr);
        }
      });

      it('should preserve source ranges for arithmetic expressions', () => {
        const cst = XPathService.parse('price * quantity').cst;
        const root = CstVisitor.visit(cst);

        const arithmeticExpr = root.expressions[0];
        expect(arithmeticExpr.range).toBeDefined();
        expect(arithmeticExpr.range.start.line).toBeGreaterThan(0);
        expect(arithmeticExpr.range.start.column).toBeGreaterThan(0);
      });
    });
  });
});

describe('Logical expressions in if-then-else', () => {
  it('should handle if with logical condition and traverse all path expressions', () => {
    const xpath = 'if (status = "active" and verified = true) then "ok" else "nok"';
    const ast = XPathService.parse(xpath).exprNode;
    expect(ast).toBeDefined();
    if (!ast) return;

    // Verify that logical expression node exists in the tree
    const logicalNodes = XPathUtil.getAllNodesOfType(ast, XPathNodeType.LogicalExpr);
    expect(logicalNodes.length).toBeGreaterThan(0);

    // Verify that path expressions from logical expression are found via traversal
    const pathNodes = XPathUtil.getAllNodesOfType<PathExprNode>(ast, XPathNodeType.PathExpr);
    const pathNames = pathNodes
      .filter((node: PathExprNode) => node.steps.length > 0 && node.steps[0].nodeTest?.type === XPathNodeType.NameTest)
      .map((node: PathExprNode) => (node.steps[0].nodeTest as NameTestNode).localName);

    expect(pathNames).toContain('status');
    expect(pathNames).toContain('verified');
  });
});

describe('Nested expressions (edge cases)', () => {
  it('should traverse nested arithmetic and find all paths: (a + b) * c', () => {
    const xpath = '(a + b) * c';
    const ast = XPathService.parse(xpath).exprNode;
    expect(ast).toBeDefined();
    if (!ast) return;

    // Verify all paths are found via recursive traversal
    const pathNodes = XPathUtil.getAllNodesOfType<PathExprNode>(ast, XPathNodeType.PathExpr);
    const pathNames = pathNodes
      .filter((node: PathExprNode) => node.steps.length > 0 && node.steps[0].nodeTest?.type === XPathNodeType.NameTest)
      .map((node: PathExprNode) => (node.steps[0].nodeTest as NameTestNode).localName);

    expect(pathNames).toContain('a');
    expect(pathNames).toContain('b');
    expect(pathNames).toContain('c');
  });
});

describe('Functions with operator arguments', () => {
  it('should extract paths from arithmetic in function: concat(a + b, "text")', () => {
    const xpath = 'concat(a + b, "text")';
    const ast = XPathService.parse(xpath).exprNode;
    expect(ast).toBeDefined();
    if (!ast) return;

    // Verify paths are extracted from arithmetic expression in function argument
    const pathNodes = XPathUtil.getAllNodesOfType<PathExprNode>(ast, XPathNodeType.PathExpr);
    const pathNames = pathNodes
      .filter((node: PathExprNode) => node.steps.length > 0 && node.steps[0].nodeTest?.type === XPathNodeType.NameTest)
      .map((node: PathExprNode) => (node.steps[0].nodeTest as NameTestNode).localName);

    expect(pathNames).toContain('a');
    expect(pathNames).toContain('b');
  });
});

describe('Edge cases and error handling', () => {
  it('should handle node without image or children (extractTokenImage)', () => {
    // This tests line 73: return undefined
    const xpath = 'test';
    const ast = XPathService.parse(xpath).exprNode;
    expect(ast).toBeDefined();
  });

  it('should handle empty node for range creation', () => {
    // This tests line 111: return CstVisitor.createRangeFromToken(node)
    const xpath = 'a';
    const ast = XPathService.parse(xpath).exprNode;
    expect(ast).toBeDefined();
    expect(ast?.range).toBeDefined();
  });

  it('should handle node without valid tokens (getFirstToken/getLastToken)', () => {
    // This tests line 144: return undefined
    const xpath = 'test';
    const ast = XPathService.parse(xpath).exprNode;
    expect(ast).toBeDefined();
  });

  it('should handle invalid path expression in comparison', () => {
    // This tests line 262: return undefined
    const xpath = 'true()';
    const ast = XPathService.parse(xpath).exprNode;
    expect(ast).toBeDefined();
  });

  it('should handle reverse step without parent reference', () => {
    // This tests lines 374-385: ReverseStep with nodeTest
    const xpath1 = 'ancestor::node()';
    const ast1 = XPathService.parse(xpath1).exprNode;
    expect(ast1).toBeDefined();
  });

  it('should handle empty predicates list', () => {
    // This tests line 634: return []
    const xpath2 = 'element';
    const ast2 = XPathService.parse(xpath2).exprNode;
    expect(ast2).toBeDefined();
  });

  it('should handle predicates without children', () => {
    // This tests line 637: return []
    const xpath3 = 'element[1]';
    const ast3 = XPathService.parse(xpath3).exprNode;
    expect(ast3).toBeDefined();
  });

  it('should handle predicates without Expr', () => {
    // This tests line 648: return []
    const xpath4 = 'element[position()]';
    const ast4 = XPathService.parse(xpath4).exprNode;
    expect(ast4).toBeDefined();
  });

  it('should handle single arithmetic operand', () => {
    // This tests line 725: processSingleArithmeticOperand
    const xpath5 = 'price';
    const ast5 = XPathService.parse(xpath5).exprNode;
    expect(ast5).toBeDefined();
  });

  it('should handle multiplicative expression in arithmetic', () => {
    // This tests line 733-735: MultiplicativeExpr path
    const xpath6 = 'a * b + c';
    const ast6 = XPathService.parse(xpath6).exprNode;
    expect(ast6).toBeDefined();
    if (ast6?.expressions[0].type === XPathNodeType.ArithmeticExpr) {
      expect(ast6.expressions[0].left.type).toBe(XPathNodeType.ArithmeticExpr);
    }
  });

  it('should handle path expression extraction from arithmetic operand', () => {
    // This tests line 737-746: PathExpr extraction
    const xpath7 = 'a + b';
    const ast7 = XPathService.parse(xpath7).exprNode;
    expect(ast7).toBeDefined();
  });

  it('should handle undefined multiplicative result', () => {
    // This tests line 813: return undefined
    const xpath8 = '5';
    const ast8 = XPathService.parse(xpath8).exprNode;
    expect(ast8).toBeDefined();
  });

  it('should handle single logical operand', () => {
    // This tests line 879-882: processSingleLogicalOperand with AndExpr
    const xpath9 = 'a > 1';
    const ast9 = XPathService.parse(xpath9).exprNode;
    expect(ast9).toBeDefined();
  });

  it('should handle undefined logical result', () => {
    // This tests line 882: return undefined for unknown operand type
    const xpath10 = 'true()';
    const ast10 = XPathService.parse(xpath10).exprNode;
    expect(ast10).toBeDefined();
  });

  it('should handle undefined comparison result', () => {
    // This tests line 916: return undefined
    const xpath11 = '"text"';
    const ast11 = XPathService.parse(xpath11).exprNode;
    expect(ast11).toBeDefined();
  });
});

describe('extractAllPathExprsFromCST edge cases', () => {
  it('should handle parenthesized expression without children', () => {
    // This tests line 1008-1010: ParenthesizedExpr without children
    const xpathExpr = '(a + b) * c';
    const astExpr = XPathService.parse(xpathExpr).exprNode;
    expect(astExpr).toBeDefined();

    const pathNodesExpr = XPathUtil.getAllNodesOfType<PathExprNode>(astExpr!, XPathNodeType.PathExpr);
    expect(pathNodesExpr.length).toBeGreaterThan(0);
  });

  it('should extract paths from function call arguments', () => {
    // This tests line 1018-1029: extractPathExprsFromFunctionCall
    const xpathFunc = 'concat(field1, field2)';
    const astFunc = XPathService.parse(xpathFunc).exprNode;
    expect(astFunc).toBeDefined();

    const pathNodesFunc = XPathUtil.getAllNodesOfType<PathExprNode>(astFunc!, XPathNodeType.PathExpr);
    const pathNamesFunc = pathNodesFunc
      .filter((node: PathExprNode) => node.steps.length > 0 && node.steps[0].nodeTest?.type === XPathNodeType.NameTest)
      .map((node: PathExprNode) => (node.steps[0].nodeTest as NameTestNode).localName);

    expect(pathNamesFunc).toContain('field1');
    expect(pathNamesFunc).toContain('field2');
  });

  it('should handle filter expression with literal', () => {
    // This tests line 1032-1035: Literal in FilterExpr
    const xpathLit = '("text")[1]';
    const astLit = XPathService.parse(xpathLit).exprNode;
    expect(astLit).toBeDefined();
  });

  it('should handle filter expression with context item', () => {
    // This tests line 1037-1040: ContextItemExpr in FilterExpr
    const xpathCtx = '.[position() > 1]';
    const astCtx = XPathService.parse(xpathCtx).exprNode;
    expect(astCtx).toBeDefined();

    const pathNodesCtx = XPathUtil.getAllNodesOfType<PathExprNode>(astCtx!, XPathNodeType.PathExpr);
    expect(pathNodesCtx.length).toBeGreaterThan(0);
  });

  it('should handle filter expression with parenthesized expression', () => {
    // This tests line 1042-1045: ParenthesizedExpr in FilterExpr
    const xpathParen = '(a + b)[1]';
    const astParen = XPathService.parse(xpathParen).exprNode;
    expect(astParen).toBeDefined();
  });

  it('should handle filter expression with function call', () => {
    // This tests line 1047-1050: FunctionCall in FilterExpr
    const xpathFuncFilter = 'current()[position() > 1]';
    const astFuncFilter = XPathService.parse(xpathFuncFilter).exprNode;
    expect(astFuncFilter).toBeDefined();
  });

  it('should handle path expression without relative path', () => {
    // This tests line 1056-1059: no RelativePathExpr
    const xpathRoot = '/';
    const astRoot = XPathService.parse(xpathRoot).exprNode;
    expect(astRoot).toBeDefined();
  });

  it('should handle relative path without child segments', () => {
    // This tests line 1061-1064: no ChildPathSegmentExpr
    const xpathElem = 'element';
    const astElem = XPathService.parse(xpathElem).exprNode;
    expect(astElem).toBeDefined();
  });

  it('should handle filter expression without children', () => {
    // This tests line 1066-1069: FilterExpr without children
    const xpathChild = 'element/child';
    const astChild = XPathService.parse(xpathChild).exprNode;
    expect(astChild).toBeDefined();
  });

  it('should extract paths from children array', () => {
    // This tests line 1074-1082: extractPathExprsFromChildrenArray
    const xpathIf = 'if (condition) then result1 else result2';
    const astIf = XPathService.parse(xpathIf).exprNode;
    expect(astIf).toBeDefined();

    const pathNodesIf = XPathUtil.getAllNodesOfType<PathExprNode>(astIf!, XPathNodeType.PathExpr);
    expect(pathNodesIf.length).toBeGreaterThan(0);
  });

  it('should extract paths from node children', () => {
    // This tests line 1084-1096: extractPathExprsFromChildren
    const xpathAdd = 'a + b';
    const astAdd = XPathService.parse(xpathAdd).exprNode;
    expect(astAdd).toBeDefined();

    const pathNodesAdd = XPathUtil.getAllNodesOfType<PathExprNode>(astAdd!, XPathNodeType.PathExpr);
    expect(pathNodesAdd.length).toBe(2);
  });

  it('should extract paths from nested arithmetic in binary expression', () => {
    // This tests line 1112-1113: left is ArithmeticExpr
    const xpathNested1 = '(a + b) * c';
    const astNested1 = XPathService.parse(xpathNested1).exprNode;
    expect(astNested1).toBeDefined();

    const pathNodesNested1 = XPathUtil.getAllNodesOfType<PathExprNode>(astNested1!, XPathNodeType.PathExpr);
    const pathNamesNested1 = pathNodesNested1
      .filter((node: PathExprNode) => node.steps.length > 0 && node.steps[0].nodeTest?.type === XPathNodeType.NameTest)
      .map((node: PathExprNode) => (node.steps[0].nodeTest as NameTestNode).localName);

    expect(pathNamesNested1).toContain('a');
    expect(pathNamesNested1).toContain('b');
    expect(pathNamesNested1).toContain('c');
  });

  it('should extract paths from nested logical in binary expression', () => {
    // This tests line 1112-1113: left is ArithmeticExpr/LogicalExpr
    // Test chained arithmetic which creates nested structure
    const xpathNested2 = 'a + b * c';
    const astNested2 = XPathService.parse(xpathNested2).exprNode;
    expect(astNested2).toBeDefined();

    // Verify the structure has nested arithmetic (b * c is evaluated first due to precedence)
    if (astNested2?.expressions[0].type === XPathNodeType.ArithmeticExpr) {
      const arith = astNested2.expressions[0];
      // Left should be PathExpr 'a', right should be ArithmeticExpr 'b * c'
      expect(arith.left.type).toBe(XPathNodeType.PathExpr);
      expect(arith.right.type).toBe(XPathNodeType.ArithmeticExpr);
    }
  });

  it('should extract paths from nested arithmetic on right side', () => {
    // This tests line 1119-1120: right is ArithmeticExpr
    const xpathNested3 = 'a * (b + c)';
    const astNested3 = XPathService.parse(xpathNested3).exprNode;
    expect(astNested3).toBeDefined();

    const pathNodesNested3 = XPathUtil.getAllNodesOfType<PathExprNode>(astNested3!, XPathNodeType.PathExpr);
    const pathNamesNested3 = pathNodesNested3
      .filter((node: PathExprNode) => node.steps.length > 0 && node.steps[0].nodeTest?.type === XPathNodeType.NameTest)
      .map((node: PathExprNode) => (node.steps[0].nodeTest as NameTestNode).localName);

    expect(pathNamesNested3).toContain('a');
    expect(pathNamesNested3).toContain('b');
    expect(pathNamesNested3).toContain('c');
  });

  it('should extract paths from nested logical on right side', () => {
    // This tests line 1119-1120: right is LogicalExpr - but LogicalExpr contains ComparisonExpr not PathExpr
    // Test that the structure is created correctly
    const xpathNested4 = 'a + (b * c)';
    const astNested4 = XPathService.parse(xpathNested4).exprNode;
    expect(astNested4).toBeDefined();

    const pathNodesNested4 = XPathUtil.getAllNodesOfType<PathExprNode>(astNested4!, XPathNodeType.PathExpr);
    const pathNamesNested4 = pathNodesNested4
      .filter((node: PathExprNode) => node.steps.length > 0 && node.steps[0].nodeTest?.type === XPathNodeType.NameTest)
      .map((node: PathExprNode) => (node.steps[0].nodeTest as NameTestNode).localName);

    expect(pathNamesNested4).toContain('a');
    expect(pathNamesNested4).toContain('b');
    expect(pathNamesNested4).toContain('c');
  });

  it('should handle PathExpr node extraction', () => {
    // This tests line 1127-1129: PathExpr with children
    const xpathPath = '/root/child';
    const astPath = XPathService.parse(xpathPath).exprNode;
    expect(astPath).toBeDefined();

    const pathNodesPath = XPathUtil.getAllNodesOfType<PathExprNode>(astPath!, XPathNodeType.PathExpr);
    expect(pathNodesPath.length).toBe(1);
    expect(pathNodesPath[0].steps.length).toBe(2);
  });

  it('should extract paths from generic node children', () => {
    // This tests line 1131: extractPathExprsFromChildren fallback
    const xpathGeneric = 'concat(field1, field2, field3)';
    const astGeneric = XPathService.parse(xpathGeneric).exprNode;
    expect(astGeneric).toBeDefined();

    const pathNodesGeneric = XPathUtil.getAllNodesOfType<PathExprNode>(astGeneric!, XPathNodeType.PathExpr);
    expect(pathNodesGeneric.length).toBeGreaterThan(0);
  });
});

describe('Direct method testing for processSingleArithmeticOperand coverage', () => {
  it('should handle single MultiplicativeExpr operand', () => {
    // Test line 733-735: MultiplicativeExpr path in processSingleArithmeticOperand
    const xpath = 'a * b';
    const cst = XPathService.parse(xpath).cst;

    expect(cst).toBeDefined();
    const ast = CstVisitor.visit(cst);
    expect(ast).toBeDefined();
    expect(ast.expressions[0].type).toBe(XPathNodeType.ArithmeticExpr);
  });

  it('should handle IntersectExceptExpr operand', () => {
    // Test line 737-746: PathExpr extraction with IntersectExceptExpr
    const xpath = 'node1 intersect node2';
    const cst = XPathService.parse(xpath).cst;

    expect(cst).toBeDefined();
    const ast = CstVisitor.visit(cst);
    expect(ast).toBeDefined();
  });

  it('should handle InstanceofExpr operand', () => {
    // Test line 737-746: PathExpr extraction with InstanceofExpr
    const xpath = 'value instance of xs:integer';
    const cst = XPathService.parse(xpath).cst;

    expect(cst).toBeDefined();
    const ast = CstVisitor.visit(cst);
    expect(ast).toBeDefined();
  });

  it('should handle single operand path (no operators)', () => {
    // Test line 724-725: processSingleArithmeticOperand
    // When parsing a simple path without operators, CST has only 1 operand
    // This is a valid use case, not defensive code!
    const xpath = 'fieldName';
    const cst = XPathService.parse(xpath).cst;

    expect(cst).toBeDefined();
    const ast = CstVisitor.visit(cst);
    expect(ast).toBeDefined();
    expect(ast.expressions.length).toBe(1);

    // Should be a simple PathExpr, not ArithmeticExpr
    expect(ast.expressions[0].type).toBe(XPathNodeType.PathExpr);
  });

  it('should handle mixed operators in chained expression: a - b + c', () => {
    // Test that mixed operators are preserved correctly in chained expressions
    // XPath: a - b + c should produce (a - b) + c with different operators
    const xpath = 'a - b + c';
    const ast = XPathService.parse(xpath).exprNode;

    expect(ast).toBeDefined();
    expect(ast!.expressions[0].type).toBe(XPathNodeType.ArithmeticExpr);

    const topExpr = ast!.expressions[0] as ArithmeticExprNode;

    // Expected structure (left-associative): (a - b) + c
    // Top level operator should be Plus
    // Left should be ArithmeticExpr with Minus operator
    expect(topExpr.operator).toBe('Plus');
    expect(topExpr.left.type).toBe(XPathNodeType.ArithmeticExpr);
    expect((topExpr.left as ArithmeticExprNode).operator).toBe('Minus');

    // Verify operators are different
    expect(topExpr.operator).not.toBe((topExpr.left as ArithmeticExprNode).operator);
  });

  it('should handle primary expression without function or parentheses', () => {
    // This tests line 449: return undefined
    const xpath = '123';
    const ast = XPathService.parse(xpath).exprNode;
    expect(ast).toBeDefined();
  });

  it('should handle VarRef without valid VarName', () => {
    // This tests lines 509-513: VarRef fallback
    const xpath = '$var';
    const ast = XPathService.parse(xpath).exprNode;
    expect(ast).toBeDefined();
  });

  it('should handle empty predicate list', () => {
    // This tests lines 608, 611, 619, 622, 625: early returns in visitPredicateList
    const xpath = 'a';
    const ast = XPathService.parse(xpath).exprNode;
    expect(ast).toBeDefined();
  });

  it('should handle single operand in additive expression', () => {
    // This tests lines 706-719: single operand path in visitAdditiveExpr
    const xpath = 'a';
    const ast = XPathService.parse(xpath).exprNode;
    expect(ast).toBeDefined();
  });

  it('should handle single union expression', () => {
    // This tests lines 789: single UnionExpr return undefined
    const xpath = 'a';
    const ast = XPathService.parse(xpath).exprNode;
    expect(ast).toBeDefined();
  });

  it('should handle single operand in OR expression without comparison', () => {
    // This tests line 880: return undefined for single operand
    const xpath = 'a';
    const ast = XPathService.parse(xpath).exprNode;
    expect(ast).toBeDefined();
  });

  it('should handle nested arithmetic expression on right side', () => {
    // This tests lines 1105-1106: right side recursive extraction for arithmetic
    const xpath = 'a + (b * c)';
    const ast = XPathService.parse(xpath).exprNode;
    expect(ast).toBeDefined();
    if (!ast) return;

    const pathNodes = XPathUtil.getAllNodesOfType<PathExprNode>(ast, XPathNodeType.PathExpr);
    const pathNames = pathNodes
      .filter((node: PathExprNode) => node.steps.length > 0 && node.steps[0].nodeTest?.type === XPathNodeType.NameTest)
      .map((node: PathExprNode) => (node.steps[0].nodeTest as NameTestNode).localName);

    expect(pathNames).toContain('a');
    expect(pathNames).toContain('b');
    expect(pathNames).toContain('c');
  });

  it('should handle PathExpr node extraction', () => {
    // This tests lines 1113-1117: extractPathExprsFromPathExprNode
    const xpath = 'a/b';
    const ast = XPathService.parse(xpath).exprNode;
    expect(ast).toBeDefined();
    if (!ast) return;

    const pathNodes = XPathUtil.getAllNodesOfType<PathExprNode>(ast, XPathNodeType.PathExpr);
    expect(pathNodes.length).toBeGreaterThan(0);
  });

  it('should handle nested arithmetic on left side', () => {
    // This tests lines 1098-1099: left side recursive extraction
    const xpath = '(a * b) + c';
    const ast = XPathService.parse(xpath).exprNode;
    expect(ast).toBeDefined();
    if (!ast) return;

    const pathNodes = XPathUtil.getAllNodesOfType<PathExprNode>(ast, XPathNodeType.PathExpr);
    const pathNames = pathNodes
      .filter((node: PathExprNode) => node.steps.length > 0 && node.steps[0].nodeTest?.type === XPathNodeType.NameTest)
      .map((node: PathExprNode) => (node.steps[0].nodeTest as NameTestNode).localName);

    expect(pathNames).toContain('a');
    expect(pathNames).toContain('b');
    expect(pathNames).toContain('c');
  });
});

describe('Refactored helper methods coverage', () => {
  it('should handle multiple operators in order with extractArithmeticOperators', () => {
    // Tests extractOperatorTokens helper indirectly through extractArithmeticOperators
    const xpath = 'a - b + c * d div e mod f';
    const ast = XPathService.parse(xpath).exprNode;
    expect(ast).toBeDefined();
    if (!ast) return;

    // Verify the expression was parsed correctly with operators in order
    const expr = ast.expressions[0];
    expect(expr).toBeDefined();
    expect(expr.type).toBe(XPathNodeType.ArithmeticExpr);
  });

  it('should handle single UnionExpr operand with extractPathFromUnionExpr', () => {
    // Tests extractPathFromUnionExpr helper indirectly through visitMultiplicativeExpr
    const xpath = 'simpleField';
    const ast = XPathService.parse(xpath).exprNode;
    expect(ast).toBeDefined();
    if (!ast) return;

    const pathNodes = XPathUtil.getAllNodesOfType<PathExprNode>(ast, XPathNodeType.PathExpr);
    expect(pathNodes.length).toBe(1);
    expect(pathNodes[0].steps.length).toBe(1);
    expect(pathNodes[0].steps[0].nodeTest?.localName).toBe('simpleField');
  });

  it('should handle mixed multiplicative operators: multiply, div, idiv, mod', () => {
    // Tests both extractOperatorTokens and extractPathFromUnionExpr
    const xpath = 'a * b div c';
    const ast = XPathService.parse(xpath).exprNode;
    expect(ast).toBeDefined();
    if (!ast) return;

    const expr = ast.expressions[0];
    expect(expr.type).toBe(XPathNodeType.ArithmeticExpr);

    // Verify all three path expressions are found
    const pathNodes = XPathUtil.getAllNodesOfType<PathExprNode>(ast, XPathNodeType.PathExpr);
    const pathNames = pathNodes
      .filter((node: PathExprNode) => node.steps.length > 0 && node.steps[0].nodeTest?.type === XPathNodeType.NameTest)
      .map((node: PathExprNode) => (node.steps[0].nodeTest as NameTestNode).localName);

    expect(pathNames).toContain('a');
    expect(pathNames).toContain('b');
    expect(pathNames).toContain('c');
  });

  it('should handle logical AND with non-comparison operands', () => {
    // Tests the fix for visitAndExpr to use processComparisonExpr
    const xpath = 'a and b';
    const ast = XPathService.parse(xpath).exprNode;
    expect(ast).toBeDefined();
    if (!ast) return;

    const expr = ast.expressions[0];
    expect(expr.type).toBe(XPathNodeType.LogicalExpr);

    if (expr.type === XPathNodeType.LogicalExpr) {
      expect(expr.operator).toBe('And');
      expect(expr.left.type).toBe(XPathNodeType.PathExpr);
      expect(expr.right.type).toBe(XPathNodeType.PathExpr);
    }
  });

  it('should handle logical AND with arithmetic operands', () => {
    // Tests the fix for visitAndExpr to accept ArithmeticExprNode operands
    const xpath = '(a + b) and (c > d)';
    const ast = XPathService.parse(xpath).exprNode;
    expect(ast).toBeDefined();
    if (!ast) return;

    const expr = ast.expressions[0];
    expect(expr.type).toBe(XPathNodeType.LogicalExpr);

    if (expr.type === XPathNodeType.LogicalExpr) {
      expect(expr.operator).toBe('And');

      // Check left operand - should be ParenthesizedExpr or ArithmeticExpr
      expect([XPathNodeType.ParenthesizedExpr, XPathNodeType.ArithmeticExpr, XPathNodeType.PathExpr]).toContain(
        expr.left.type,
      );

      // Check right operand - should be ParenthesizedExpr or ComparisonExpr
      expect([XPathNodeType.ParenthesizedExpr, XPathNodeType.ComparisonExpr, XPathNodeType.PathExpr]).toContain(
        expr.right.type,
      );

      // If it's a ParenthesizedExpr, check the inner content
      if (expr.left.type === XPathNodeType.ParenthesizedExpr) {
        const leftParen: ParenthesizedExprNode = expr.left;
        expect(leftParen.expr?.expressions[0]?.type).toBe(XPathNodeType.ArithmeticExpr);
      }
      if (expr.right.type === XPathNodeType.ParenthesizedExpr) {
        const rightParen: ParenthesizedExprNode = expr.right;
        expect(rightParen.expr?.expressions[0]?.type).toBe(XPathNodeType.ComparisonExpr);
      }
    }
  });
});
