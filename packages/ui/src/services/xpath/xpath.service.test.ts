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
  });

  describe('validate()', () => {
    it('should detect parse error', () => {
      const result = XPathService.validate('((');
      expect(result.hasErrors()).toBeTruthy();
    });

    it('should validate with empty string literal', () => {
      const result = XPathService.validate("/ns0:ShipOrder/ns0:OrderPerson != ''");
      // TODO parser error says it's redundant, possibly a bug in the parser
      expect(result.hasErrors()).toBeTruthy();
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
      expect(paths[0]).toEqual('/aaa/bbb/ccc');
    });

    it('extract param field', () => {
      const paths = XPathService.extractFieldPaths('$param1/aaa/bbb/ccc');
      expect(paths.length).toEqual(1);
      expect(paths[0]).toEqual('$param1/aaa/bbb/ccc');
    });

    it('extract fields from function calls', () => {
      const paths = XPathService.extractFieldPaths(
        'concatenate(/aaa/bbb/ccc, upper-case(aaa/bbb/ddd), lower-case($param1/eee/fff))',
      );
      expect(paths.length).toEqual(3);
      expect(paths[0]).toEqual('/aaa/bbb/ccc');
      expect(paths[1]).toEqual('aaa/bbb/ddd');
      expect(paths[2]).toEqual('$param1/eee/fff');
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
});
