import { XPath2Parser } from './xpath-2.0-parser';

describe('XPath 2.0 parser', () => {
  describe('Lexer', () => {
    it('should tokenize', () => {
      let tokens = XPath2Parser.lexer.tokenize('/shiporder/orderperson');
      expect(tokens.errors).toHaveLength(0);
      expect(tokens.tokens).toHaveLength(4);
      tokens = XPath2Parser.lexer.tokenize('/shiporder/orderperson/');
      expect(tokens.errors).toHaveLength(0);
      expect(tokens.tokens).toHaveLength(5);
      tokens = XPath2Parser.lexer.tokenize('/from/me/to/you');
      expect(tokens.errors).toHaveLength(0);
      expect(tokens.tokens).toHaveLength(8);
    });
  });

  describe('Parser', () => {
    it('should parse', () => {
      const parser = new XPath2Parser();
      let result = parser.parseXPath('/shiporder/orderperson');
      expect(result.lexErrors).toHaveLength(0);
      expect(result.parseErrors).toHaveLength(0);
      result = parser.parseXPath('/shiporder/orderperson/');
      expect(result.lexErrors).toHaveLength(0);
      expect(result.parseErrors).toHaveLength(0);
      result = parser.parseXPath('/from/me/to/you');
      expect(result.lexErrors).toHaveLength(0);
      expect(result.parseErrors).toHaveLength(0);
    });
  });
});
