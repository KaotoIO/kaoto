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
