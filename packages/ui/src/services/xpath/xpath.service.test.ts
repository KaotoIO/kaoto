import { XPathService } from './xpath.service';
import { createSyntaxDiagramsCode } from 'chevrotain';
import * as fs from 'fs';
import { IFunctionDefinition } from '../../models/datamapper/mapping';
import { FunctionGroup } from './xpath-parser';

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
});
