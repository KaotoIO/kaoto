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

    it.each([
      ['$_foo/_a/@_c', ['$', '_foo', '/', '_a', '/', '@', '_c']],
      ['$param\u1F62dee/a', ['$', 'param\u1F62dee', '/', 'a']],
      ['/\u{10000}a', ['/', '\u{10000}a']],
      ['$caf\u00E9', ['$', 'caf\u00E9']],
      ['/\u6570\u91CF/a', ['/', '\u6570\u91CF', '/', 'a']],
      ['@\u03B1\u03B2', ['@', '\u03B1\u03B2']],
      ['$in\u00E9', ['$', 'in\u00E9']],
      ['$\u{EFFFF}x', ['$', '\u{EFFFF}x']],
      ['/\uFEFFa', ['/', '\uFEFFa']],
      ['/\u1680a', ['/', '\u1680a']],
    ])('should read %s with the XML Names name rule', (expression, images) => {
      const result = XPath2Parser.lexer.tokenize(expression);
      expect(result.errors).toHaveLength(0);
      expect(result.tokens.map((token) => token.image)).toEqual(images);
    });

    it.each([
      ['$a\u00B7b', ['$', 'a\u00B7b']],
      ['$a\u0301b', ['$', 'a\u0301b']],
      ['$a\u203Fb', ['$', 'a\u203Fb']],
    ])('should keep reading %s as one name', (expression, images) => {
      const result = XPath2Parser.lexer.tokenize(expression);
      expect(result.errors).toHaveLength(0);
      expect(result.tokens.map((token) => token.image)).toEqual(images);
    });

    it('should not read a name starting with a character above U+EFFFF', () => {
      expect(XPath2Parser.lexer.tokenize('$\u{F0000}x').errors.length).toBeGreaterThan(0);
    });

    it('should skip only XML whitespace between tokens', () => {
      const result = XPath2Parser.lexer.tokenize('/a \t\r\nor /b');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens.map((token) => token.image)).toEqual(['/', 'a', 'or', '/', 'b']);
      expect(XPath2Parser.lexer.tokenize('/a\u00A0or /b').errors.length).toBeGreaterThan(0);
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

    it.each(['/_a/@_b', '/ns0:_a/@_id', '_p:a', '_f(1)', '$_'])('should parse %s', (expression) => {
      const result = new XPath2Parser().parseXPath(expression);
      expect(result.lexErrors).toHaveLength(0);
      expect(result.parseErrors).toHaveLength(0);
    });

    it.each(['$1a', '$-a', '$.a', '/\u00B7a'])('should reject %s', (expression) => {
      const result = new XPath2Parser().parseXPath(expression);
      expect(result.lexErrors.length + result.parseErrors.length).toBeGreaterThan(0);
    });
  });
});
