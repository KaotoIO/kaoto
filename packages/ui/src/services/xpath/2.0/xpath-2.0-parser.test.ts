import { XPath2Parser } from './xpath-2.0-parser';

describe('XPath 2.0 parser', () => {
  describe('Lexer', () => {
    it('should tokenize', () => {
      let tokens = XPath2Parser.lexer.tokenize('/shiporder/orderperson');
      expect(tokens.errors.length).toEqual(0);
      expect(tokens.tokens.length).toEqual(4);
      tokens = XPath2Parser.lexer.tokenize('/shiporder/orderperson/');
      expect(tokens.errors.length).toEqual(0);
      expect(tokens.tokens.length).toEqual(5);
      tokens = XPath2Parser.lexer.tokenize('/from/me/to/you');
      expect(tokens.errors.length).toEqual(0);
      expect(tokens.tokens.length).toEqual(8);
    });
  });

  describe('Parser', () => {
    it('should parse', () => {
      const parser = new XPath2Parser();
      let result = parser.parseXPath('/shiporder/orderperson');
      expect(result.lexErrors.length).toEqual(0);
      expect(result.parseErrors.length).toEqual(0);
      result = parser.parseXPath('/shiporder/orderperson/');
      expect(result.lexErrors.length).toEqual(0);
      expect(result.parseErrors.length).toEqual(0);
      result = parser.parseXPath('/from/me/to/you');
      expect(result.lexErrors.length).toEqual(0);
      expect(result.parseErrors.length).toEqual(0);
    });
  });
});
