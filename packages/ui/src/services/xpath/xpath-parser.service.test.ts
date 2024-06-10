import { XPathParserService } from './xpath-parser.service';
import { createSyntaxDiagramsCode } from 'chevrotain';
import * as fs from 'fs';

describe('XPathParserService', () => {
  it('Generate Syntax Diagram', () => {
    const gastProd = XPathParserService.parser.getSerializedGastProductions();
    const html = createSyntaxDiagramsCode(gastProd);
    fs.writeFileSync('dist/syntax-diagram.html', html);
  });

  describe('parse()', () => {
    it('should parse a field path', () => {
      const result = XPathParserService.parse('/aaa/bbb/ccc');
      expect(result.cst).toBeDefined();
    });
  });

  describe('extractFieldPaths()', () => {
    it('extract field', () => {
      const paths = XPathParserService.extractFieldPaths('/aaa/bbb/ccc');
      expect(paths.length).toEqual(1);
      expect(paths[0]).toEqual('/aaa/bbb/ccc');
    });

    it('extract param field', () => {
      const paths = XPathParserService.extractFieldPaths('$param1/aaa/bbb/ccc');
      expect(paths.length).toEqual(1);
      expect(paths[0]).toEqual('$param1/aaa/bbb/ccc');
    });

    it('extract fields from function calls', () => {
      const paths = XPathParserService.extractFieldPaths(
        'concatenate(/aaa/bbb/ccc, upper-case(aaa/bbb/ddd), lower-case($param1/eee/fff))',
      );
      expect(paths.length).toEqual(3);
      expect(paths[0]).toEqual('/aaa/bbb/ccc');
      expect(paths[1]).toEqual('aaa/bbb/ddd');
      expect(paths[2]).toEqual('$param1/eee/fff');
    });
  });
});
