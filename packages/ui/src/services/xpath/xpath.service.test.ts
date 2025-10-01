import { XPathService } from './xpath.service';
import { createSyntaxDiagramsCode } from 'chevrotain';
import * as fs from 'fs';
import { IFunctionDefinition } from '../../models/datamapper/mapping';
import { FunctionGroup } from './xpath-parser';
import { PathExpression, PathSegment } from '../../models/datamapper';

describe('XPathService', () => {
  it('Generate Syntax Diagram', () => {
    const gastProd = XPathService.parser.getSerializedGastProductions();
    const html = createSyntaxDiagramsCode(gastProd);
    fs.writeFileSync('dist/syntax-diagram.html', html);
  });

  describe('parse()', () => {
    it('should parse a field path', () => {
      const result = XPathService.parse('/aaa/bbb/ccc');
      expect(result.cst).toBeDefined();
    });

    it('should parse a field which contains a reserved word in its spelling', () => {
      let result = XPathService.parse('/shiporder/orderperson');
      expect(result.lexErrors.length).toEqual(0);
      expect(result.parseErrors.length).toEqual(0);
      expect(result.cst).toBeDefined();
      result = XPathService.parse('/shiporder/orderperson/');
      expect(result.lexErrors.length).toEqual(0);
      expect(result.parseErrors.length).toEqual(0);
      expect(result.cst).toBeDefined();
      result = XPathService.parse('/from/me/to/you');
      expect(result.lexErrors.length).toEqual(0);
      expect(result.parseErrors.length).toEqual(0);
      expect(result.cst).toBeDefined();
    });

    it('should parse xpath with string literal', () => {
      const result = XPathService.parse("'Hello', /shiporder/orderperson, '!'");
      expect(result.lexErrors.length).toEqual(0);
      expect(result.parseErrors.length).toEqual(0);
      expect(result.cst).toBeDefined();
    });

    it('should parse numeric literal', () => {
      let result = XPathService.parse('128');
      expect(result.lexErrors.length).toEqual(0);
      expect(result.parseErrors.length).toEqual(0);
      expect(result.cst).toBeDefined();
      /* eslint-disable  @typescript-eslint/no-explicit-any */
      let literalNode = XPathService.getSingleNode(result.cst, [
        'ExprSingle',
        'OrExpr',
        'AndExpr',
        'ComparisonExpr',
        'RangeExpr',
        'AdditiveExpr',
        'MultiplicativeExpr',
        'UnionExpr',
        'IntersectExceptExpr',
        'InstanceofExpr',
        'PathExpr',
        'RelativePathExpr',
        'StepExpr',
        'FilterExpr',
        'Literal',
        'NumericLiteral',
        'IntegerLiteral',
      ]) as any;
      expect(literalNode.image).toEqual('128');

      result = XPathService.parse('0.1');
      expect(result.lexErrors.length).toEqual(0);
      expect(result.parseErrors.length).toEqual(0);
      expect(result.cst).toBeDefined();
      literalNode = XPathService.getSingleNode(result.cst, [
        'ExprSingle',
        'OrExpr',
        'AndExpr',
        'ComparisonExpr',
        'RangeExpr',
        'AdditiveExpr',
        'MultiplicativeExpr',
        'UnionExpr',
        'IntersectExceptExpr',
        'InstanceofExpr',
        'PathExpr',
        'RelativePathExpr',
        'StepExpr',
        'FilterExpr',
        'Literal',
        'NumericLiteral',
        'DecimalLiteral',
      ]) as any;
      expect(literalNode.image).toEqual('0.1');

      result = XPathService.parse('4268.22752E11');
      expect(result.lexErrors.length).toEqual(0);
      expect(result.parseErrors.length).toEqual(0);
      expect(result.cst).toBeDefined();
      literalNode = XPathService.getSingleNode(result.cst, [
        'ExprSingle',
        'OrExpr',
        'AndExpr',
        'ComparisonExpr',
        'RangeExpr',
        'AdditiveExpr',
        'MultiplicativeExpr',
        'UnionExpr',
        'IntersectExceptExpr',
        'InstanceofExpr',
        'PathExpr',
        'RelativePathExpr',
        'StepExpr',
        'FilterExpr',
        'Literal',
        'NumericLiteral',
        'DoubleLiteral',
      ]) as any;
      expect(literalNode.image).toEqual('4268.22752E11');
    });

    it('should parse xpath with relative parent reference inside for-each', () => {
      const result = XPathService.parse('../Name');
      expect(result.lexErrors.length).toEqual(0);
      expect(result.parseErrors.length).toEqual(0);
      expect(result.cst).toBeDefined();
      const result2 = XPathService.parse('../../Name');
      expect(result2.lexErrors.length).toEqual(0);
      expect(result2.parseErrors.length).toEqual(0);
      expect(result2.cst).toBeDefined();
    });

    describe('should parse with reserved word', () => {
      describe('in the path', () => {
        it('to in the middle of the path', () => {
          let result = XPathService.parse('/from/to/you');
          expect(result.lexErrors.length).toEqual(0);
          expect(result.parseErrors.length).toEqual(0);
          expect(result.cst).toBeDefined();
          result = XPathService.parse('/to/from');
          expect(result.lexErrors.length).toEqual(0);
          expect(result.parseErrors.length).toEqual(0);
          expect(result.cst).toBeDefined();
        });

        it('to as the last field', () => {
          const result = XPathService.parse('/note/to');
          expect(result.lexErrors.length).toEqual(0);
          expect(result.parseErrors.length).toEqual(0);
          expect(result.cst).toBeDefined();
        });

        it('item in the middle of the path', () => {
          let result = XPathService.parse('/items/item/title');
          expect(result.lexErrors.length).toEqual(0);
          expect(result.parseErrors.length).toEqual(0);
          expect(result.cst).toBeDefined();
          result = XPathService.parse('/item/title');
          expect(result.lexErrors.length).toEqual(0);
          expect(result.parseErrors.length).toEqual(0);
          expect(result.cst).toBeDefined();
        });

        it('item as the last field', () => {
          const result = XPathService.parse('/items/item');
          expect(result.lexErrors.length).toEqual(0);
          expect(result.parseErrors.length).toEqual(0);
          expect(result.cst).toBeDefined();
        });
      });

      describe('as a param name', () => {
        it('to', () => {
          const result = XPathService.parse('$to/me/from/you');
          expect(result.lexErrors.length).toEqual(0);
          expect(result.parseErrors.length).toEqual(0);
          expect(result.cst).toBeDefined();
        });

        it('item', () => {
          const result = XPathService.parse('$item/title');
          expect(result.lexErrors.length).toEqual(0);
          expect(result.parseErrors.length).toEqual(0);
          expect(result.cst).toBeDefined();
        });
      });

      it('in the predicate', () => {
        let result = XPathService.parse("/items[for='me']");
        expect(result.lexErrors.length).toEqual(0);
        expect(result.parseErrors.length).toEqual(0);
        expect(result.cst).toBeDefined();
        result = XPathService.parse("/items[@for='me']");
        expect(result.lexErrors.length).toEqual(0);
        expect(result.parseErrors.length).toEqual(0);
        expect(result.cst).toBeDefined();
        result = XPathService.parse("/items[item='me']");
        expect(result.lexErrors.length).toEqual(0);
        expect(result.parseErrors.length).toEqual(0);
        expect(result.cst).toBeDefined();
        result = XPathService.parse("/items[@item='me']");
        expect(result.lexErrors.length).toEqual(0);
        expect(result.parseErrors.length).toEqual(0);
        expect(result.cst).toBeDefined();
      });

      it('as an attribute name', () => {
        let result = XPathService.parse('/items/@for');
        expect(result.lexErrors.length).toEqual(0);
        expect(result.parseErrors.length).toEqual(0);
        expect(result.cst).toBeDefined();
        result = XPathService.parse('/items/@item');
        expect(result.lexErrors.length).toEqual(0);
        expect(result.parseErrors.length).toEqual(0);
        expect(result.cst).toBeDefined();
        result = XPathService.parse('$item/@node');
        expect(result.lexErrors.length).toEqual(0);
        expect(result.parseErrors.length).toEqual(0);
        expect(result.cst).toBeDefined();
        result = XPathService.parse('$node/@for');
        expect(result.lexErrors.length).toEqual(0);
        expect(result.parseErrors.length).toEqual(0);
        expect(result.cst).toBeDefined();
      });

      it('item in both param and path', () => {
        const result = XPathService.parse('$item/items/item/title');
        expect(result.lexErrors.length).toEqual(0);
        expect(result.parseErrors.length).toEqual(0);
        expect(result.cst).toBeDefined();
      });

      it('for in both param and path', () => {
        const result = XPathService.parse('$for/items/for');
        expect(result.lexErrors.length).toEqual(0);
        expect(result.parseErrors.length).toEqual(0);
        expect(result.cst).toBeDefined();
      });

      it('node in both param and path', () => {
        const result = XPathService.parse('$node/elements/node');
        expect(result.lexErrors.length).toEqual(0);
        expect(result.parseErrors.length).toEqual(0);
        expect(result.cst).toBeDefined();
      });
    });
  });

  describe('validate()', () => {
    it('should detect parse error', () => {
      const result = XPathService.validate('((');
      expect(result.hasErrors()).toBeTruthy();
    });

    it('should validate with empty string literal', () => {
      const result = XPathService.validate("/ns0:ShipOrder/ns0:OrderPerson != ''");
      expect(result.hasErrors()).toBeFalsy();
      expect(result.getCst()).toBeDefined();
    });

    it('should not get error with valid parenthesis', () => {
      let result = XPathService.validate('(/Hello)');
      expect(result.hasErrors()).toBeFalsy();
      result = XPathService.validate('((/Hello))');
      expect(result.hasErrors()).toBeFalsy();
    });

    it('should not get error with empty parenthesis', () => {
      let result = XPathService.validate('()');
      expect(result.hasErrors()).toBeFalsy();
      result = XPathService.validate('(())');
      expect(result.hasErrors()).toBeFalsy();
    });

    it('should not get error with empty function call', () => {
      const result = XPathService.validate('upper-case()');
      expect(result.hasErrors()).toBeFalsy();
    });
  });

  describe('extractFieldPaths()', () => {
    it('extract field', () => {
      const paths = XPathService.extractFieldPaths('/aaa/bbb/ccc');
      expect(paths.length).toEqual(1);
      expect(paths[0].isRelative).toBeFalsy();
      expect(paths[0].documentReferenceName).toBeUndefined();
      expect(paths[0].pathSegments.length).toEqual(3);
      expect(paths[0].pathSegments[0].name).toEqual('aaa');
      expect(paths[0].pathSegments[1].name).toEqual('bbb');
      expect(paths[0].pathSegments[2].name).toEqual('ccc');
    });

    it('extract param field', () => {
      const paths = XPathService.extractFieldPaths('$param1/aaa/bbb/ccc');
      expect(paths.length).toEqual(1);
      expect(paths[0].isRelative).toBeFalsy();
      expect(paths[0].documentReferenceName).toEqual('param1');
      expect(paths[0].pathSegments.length).toEqual(3);
      expect(paths[0].pathSegments[0].name).toEqual('aaa');
      expect(paths[0].pathSegments[1].name).toEqual('bbb');
      expect(paths[0].pathSegments[2].name).toEqual('ccc');
    });

    it('extract fields from function calls', () => {
      const paths = XPathService.extractFieldPaths(
        'concatenate(/aaa/bbb/ccc, upper-case(aaa/bbb/ddd), lower-case($param1/eee/fff))',
      );
      expect(paths.length).toEqual(3);
      expect(paths[0].isRelative).toBeFalsy();
      expect(paths[0].documentReferenceName).toBeUndefined();
      expect(paths[0].pathSegments.length).toEqual(3);
      expect(paths[0].pathSegments[0].name).toEqual('aaa');
      expect(paths[0].pathSegments[1].name).toEqual('bbb');
      expect(paths[0].pathSegments[2].name).toEqual('ccc');

      expect(paths[1].isRelative).toBeTruthy();
      expect(paths[1].documentReferenceName).toBeUndefined();
      expect(paths[1].pathSegments.length).toEqual(3);
      expect(paths[1].pathSegments[0].name).toEqual('aaa');
      expect(paths[1].pathSegments[1].name).toEqual('bbb');
      expect(paths[1].pathSegments[2].name).toEqual('ddd');

      expect(paths[2].isRelative).toBeFalsy();
      expect(paths[2].documentReferenceName).toEqual('param1');
      expect(paths[2].pathSegments.length).toEqual(2);
      expect(paths[2].pathSegments[0].name).toEqual('eee');
      expect(paths[2].pathSegments[1].name).toEqual('fff');
    });

    it('extract primitive source body', () => {
      const paths = XPathService.extractFieldPaths('.');
      expect(paths.length).toEqual(1);
      expect(paths[0].isRelative).toBeFalsy();
      expect(paths[0].documentReferenceName).toBeUndefined();
      expect(paths[0].pathSegments.length).toEqual(0);
    });

    it('extract from number formula', () => {
      const paths = XPathService.extractFieldPaths(
        'round(100*(PO1/PO1-04 * PO1/PO1-02 * .10 + (PO1/PO1-04 * PO1/PO1-02))) div 100',
      );
      expect(paths.length).toEqual(2);
      expect(paths[0].isRelative).toBeTruthy();
      expect(paths[0].documentReferenceName).toBeUndefined();
      expect(paths[0].pathSegments.length).toEqual(2);
      expect(paths[0].pathSegments[0].name).toEqual('PO1');
      expect(paths[0].pathSegments[1].name).toEqual('PO1-04');

      expect(paths[1].isRelative).toBeTruthy();
      expect(paths[1].documentReferenceName).toBeUndefined();
      expect(paths[1].pathSegments.length).toEqual(2);
      expect(paths[1].pathSegments[0].name).toEqual('PO1');
      expect(paths[1].pathSegments[1].name).toEqual('PO1-02');
    });

    it('extract indexed collection', () => {
      const paths = XPathService.extractFieldPaths('/ns0:ShipOrder/Item[0]/Title');
      expect(paths.length).toEqual(1);
      expect(paths[0].isRelative).toBeFalsy();
    });

    it('extract field paths from current() function in predicate', () => {
      // This test reproduces the reported issue - should not throw error
      const paths = XPathService.extractFieldPaths('Sub[current()/Sub/Typ="5032"]');
      expect(paths.length).toBeGreaterThan(0);

      // Should extract at least the main element path 'Sub' and the path from current() argument
      const mainPath = paths.find((p) => p.pathSegments.length === 1 && p.pathSegments[0].name === 'Sub');
      expect(mainPath).toBeDefined();
      expect(mainPath?.pathSegments[0].predicates.length).toEqual(1);
    });

    it('extract field paths with relative parent reference', () => {
      const contextPath = new PathExpression();
      contextPath.pathSegments = [new PathSegment('Org', false), new PathSegment('Person'), new PathSegment('Emails')];
      const paths = XPathService.extractFieldPaths('../Name', contextPath);
      expect(paths.length).toEqual(1);
      expect(paths[0].isRelative).toBeTruthy();
      expect(paths[0].pathSegments.length).toEqual(2);
      expect(paths[0].pathSegments[1].name).toEqual('Name');

      const paths2 = XPathService.extractFieldPaths('../../Name', contextPath);
      expect(paths2.length).toEqual(1);
      expect(paths2[0].isRelative).toBeTruthy();
      expect(paths2[0].pathSegments.length).toEqual(3);
      expect(paths2[0].pathSegments[2].name).toEqual('Name');
    });

    it('extract field path with ContextItemExpr (.)', () => {
      const contextPath = new PathExpression();
      contextPath.pathSegments = [new PathSegment('Org', false), new PathSegment('Person'), new PathSegment('Email')];
      const paths = XPathService.extractFieldPaths('.', contextPath);
      expect(paths.length).toEqual(1);
      expect(paths[0].isRelative).toBeFalsy();
      expect(paths[0].pathSegments.length).toEqual(3);
      expect(paths[0].pathSegments[2].name).toEqual('Email');
    });

    it('should generate context item expression for empty relative path', () => {
      const emptyRelativePath = new PathExpression();
      emptyRelativePath.isRelative = true;
      emptyRelativePath.pathSegments = [];

      const xpathString = XPathService.toXPathString(emptyRelativePath);
      expect(xpathString).toEqual('.');
    });

    describe('should extract field paths with reserved keyword', () => {
      it('to', () => {
        const paths = XPathService.extractFieldPaths('/note/to');
        expect(paths.length).toEqual(1);
        expect(paths[0].pathSegments.length).toEqual(2);
        expect(paths[0].pathSegments[0].name).toEqual('note');
        expect(paths[0].pathSegments[1].name).toEqual('to');
      });

      it('item', () => {
        const paths = XPathService.extractFieldPaths('/items/item/title');
        expect(paths.length).toEqual(1);
        expect(paths[0].pathSegments.length).toEqual(3);
        expect(paths[0].pathSegments[0].name).toEqual('items');
        expect(paths[0].pathSegments[1].name).toEqual('item');
        expect(paths[0].pathSegments[2].name).toEqual('title');
      });

      it('to as a variable name', () => {
        const paths = XPathService.extractFieldPaths('$to/address');
        expect(paths.length).toEqual(1);
        expect(paths[0].documentReferenceName).toEqual('to');
        expect(paths[0].pathSegments.length).toEqual(1);
        expect(paths[0].pathSegments[0].name).toEqual('address');
      });

      it('in predicate', () => {
        let paths = XPathService.extractFieldPaths("/items/item[to='me']");
        expect(paths.length).toEqual(1);
        expect(paths[0].pathSegments.length).toEqual(2);
        expect(paths[0].pathSegments[0].name).toEqual('items');
        expect(paths[0].pathSegments[1].name).toEqual('item');
        expect(paths[0].pathSegments[1].predicates.length).toEqual(1);
        let predicate = paths[0].pathSegments[1].predicates[0];
        expect(predicate.left).toBeInstanceOf(PathExpression);
        expect((predicate.left as PathExpression).pathSegments[0].name).toEqual('to');
        expect(predicate.right).toEqual('me');

        paths = XPathService.extractFieldPaths("/items/item[item='some']");
        expect(paths.length).toEqual(1);
        expect(paths[0].pathSegments.length).toEqual(2);
        expect(paths[0].pathSegments[0].name).toEqual('items');
        expect(paths[0].pathSegments[1].name).toEqual('item');
        expect(paths[0].pathSegments[1].predicates.length).toEqual(1);
        predicate = paths[0].pathSegments[1].predicates[0];
        expect(predicate.left).toBeInstanceOf(PathExpression);
        expect((predicate.left as PathExpression).pathSegments[0].name).toEqual('item');
        expect(predicate.right).toEqual('some');

        paths = XPathService.extractFieldPaths("/items/item[@to='me']");
        expect(paths.length).toEqual(1);
        expect(paths[0].pathSegments.length).toEqual(2);
        expect(paths[0].pathSegments[0].name).toEqual('items');
        expect(paths[0].pathSegments[1].name).toEqual('item');
        expect(paths[0].pathSegments[1].predicates.length).toEqual(1);
        predicate = paths[0].pathSegments[1].predicates[0];
        expect(predicate.left).toBeInstanceOf(PathExpression);
        expect((predicate.left as PathExpression).pathSegments[0].name).toEqual('to');
        expect((predicate.left as PathExpression).pathSegments[0].isAttribute).toBeTruthy();
        expect(predicate.right).toEqual('me');

        paths = XPathService.extractFieldPaths("/items/item[@item='some']");
        expect(paths.length).toEqual(1);
        expect(paths[0].pathSegments.length).toEqual(2);
        expect(paths[0].pathSegments[0].name).toEqual('items');
        expect(paths[0].pathSegments[1].name).toEqual('item');
        expect(paths[0].pathSegments[1].predicates.length).toEqual(1);
        predicate = paths[0].pathSegments[1].predicates[0];
        expect(predicate.left).toBeInstanceOf(PathExpression);
        expect((predicate.left as PathExpression).pathSegments[0].name).toEqual('item');
        expect((predicate.left as PathExpression).pathSegments[0].isAttribute).toBeTruthy();
        expect(predicate.right).toEqual('some');
      });

      it('for as an attribute', () => {
        const paths = XPathService.extractFieldPaths('/items/@for');
        expect(paths.length).toEqual(1);
        expect(paths[0].pathSegments.length).toEqual(2);
        expect(paths[0].pathSegments[0].name).toEqual('items');
        expect(paths[0].pathSegments[1].name).toEqual('for');
        expect(paths[0].pathSegments[1].isAttribute).toBeTruthy();
      });

      it('multiple', () => {
        const paths = XPathService.extractFieldPaths('$item/items/item/node');
        expect(paths.length).toEqual(1);
        expect(paths[0].documentReferenceName).toEqual('item');
        expect(paths[0].pathSegments.length).toEqual(3);
        expect(paths[0].pathSegments[0].name).toEqual('items');
        expect(paths[0].pathSegments[1].name).toEqual('item');
        expect(paths[0].pathSegments[2].name).toEqual('node');
      });
    });
  });

  it('getXPathFunctionDefinitions()', () => {
    const functionDefs = XPathService.getXPathFunctionDefinitions();
    expect(Object.keys(functionDefs).length).toBeGreaterThan(9);
  });

  it('getXPathFunctionNames()', () => {
    const functionDefs = XPathService.getXPathFunctionDefinitions();
    const flattened = Object.keys(functionDefs).reduce((acc, value) => {
      acc.push(...functionDefs[value as FunctionGroup]);
      return acc;
    }, [] as IFunctionDefinition[]);
    const functionNames = XPathService.getXPathFunctionNames();
    expect(functionNames.length).toEqual(flattened.length);
  });

  it('getMonacoXPathLanguageMetadata()', () => {
    const metadata = XPathService.getMonacoXPathLanguageMetadata();
    expect(metadata.id).toEqual('xpath');
  });

  it('getAllTokens()', () => {
    const tokens = XPathService.getAllTokens();
    expect(tokens.length).toEqual(86);
    ['If', 'Then', 'Else'].forEach((targetTokenName) => tokens.find((token) => token.name === targetTokenName));
  });

  it('toXPathString()', () => {
    const pe = new PathExpression();
    pe.documentReferenceName = 'Account-x';
    const xpath = XPathService.toXPathString(pe);
    expect(xpath).toEqual('$Account-x');
  });
});
