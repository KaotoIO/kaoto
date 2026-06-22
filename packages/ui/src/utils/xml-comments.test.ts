import { insertXmlComments, parseXmlComments } from './xml-comments';

describe('xml-comments', () => {
  describe('parseXmlComments', () => {
    it('extracts leading XML comments and returns their full <!-- ... --> strings', () => {
      const xml = '<!-- first comment -->\n<!-- second comment -->\n<routes/>';
      expect(parseXmlComments(xml)).toEqual(['<!-- first comment -->', '<!-- second comment -->']);
    });

    it('stops at the first non-whitespace, non-comment content', () => {
      const xml = '<!-- leading -->\n<routes/>\n<!-- not leading -->';
      expect(parseXmlComments(xml)).toEqual(['<!-- leading -->']);
    });

    it('returns an empty array when there are no leading comments', () => {
      expect(parseXmlComments('<routes/>')).toEqual([]);
    });

    it('preserves empty lines between leading comments as empty-string entries', () => {
      const xml = '<!-- a -->\n\n   \n<!-- b -->\n<routes/>';
      expect(parseXmlComments(xml)).toEqual(['<!-- a -->', '', '<!-- b -->']);
    });

    it('preserves empty lines between leading comments during round-trip', () => {
      const xml = '<!-- first -->\n\n<!-- second -->\n<routes/>';
      const comments = parseXmlComments(xml);
      expect(comments).toEqual(['<!-- first -->', '', '<!-- second -->']);
      const restored = insertXmlComments('<routes/>', comments);
      expect(restored).toBe('<!-- first -->\n\n<!-- second -->\n<routes/>');
    });

    it('preserves a multiline comment as a single entry with its full delimiters', () => {
      const xml = '<!-- line1\nline2\nline3 -->\n<routes/>';
      expect(parseXmlComments(xml)).toEqual(['<!-- line1\nline2\nline3 -->']);
    });

    it('round-trips a multiline comment unchanged', () => {
      const xml = '<!-- line1\nline2 -->\n<routes/>';
      const comments = parseXmlComments(xml);
      const restored = insertXmlComments('<routes/>', comments);
      expect(restored).toBe(xml);
    });

    it('round-trips multiline and single-line comments mixed with blank separators', () => {
      const xml = '<!-- multi\nline -->\n\n<!-- single -->\n<routes/>';
      const comments = parseXmlComments(xml);
      expect(comments).toEqual(['<!-- multi\nline -->', '', '<!-- single -->']);
      const restored = insertXmlComments('<routes/>', comments);
      expect(restored).toBe(xml);
    });
  });

  describe('insertXmlComments', () => {
    it('prepends comments verbatim above the XML string', () => {
      const result = insertXmlComments('<routes/>', ['<!-- hello world -->']);
      expect(result).toBe('<!-- hello world -->\n<routes/>');
    });

    it('returns the original XML unchanged when comments array is empty', () => {
      expect(insertXmlComments('<routes/>', [])).toBe('<routes/>');
    });

    it('joins multiple comments with newlines', () => {
      const result = insertXmlComments('<routes/>', ['<!-- first -->', '<!-- second -->']);
      expect(result).toBe('<!-- first -->\n<!-- second -->\n<routes/>');
    });

    it('emits empty lines for empty-string entries', () => {
      const result = insertXmlComments('<routes/>', ['<!-- first -->', '', '<!-- second -->']);
      expect(result).toBe('<!-- first -->\n\n<!-- second -->\n<routes/>');
    });

    it('inserts a multiline comment verbatim', () => {
      const result = insertXmlComments('<routes/>', ['<!-- line1\nline2 -->']);
      expect(result).toBe('<!-- line1\nline2 -->\n<routes/>');
    });
  });
});
