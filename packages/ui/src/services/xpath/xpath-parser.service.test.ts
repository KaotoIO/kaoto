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
      const result = XPathParserService.parse('aaa/bbb/ccc instance of element()');
      expect(result.cst).toBeDefined();
    });
  });
});
