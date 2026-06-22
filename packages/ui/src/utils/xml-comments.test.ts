import { insertXmlComments, parseXmlComments } from './xml-comments';

describe('xml-comments', () => {
  describe('parseXmlComments', () => {
    it('extracts leading XML comments and returns their trimmed inner text', () => {
      const xml = '<!-- first comment -->\n<!-- second comment -->\n<routes/>';
      expect(parseXmlComments(xml)).toEqual(['first comment', 'second comment']);
    });

    it('stops at the first non-whitespace, non-comment content', () => {
      const xml = '<!-- leading -->\n<routes/>\n<!-- not leading -->';
      expect(parseXmlComments(xml)).toEqual(['leading']);
    });

    it('returns an empty array when there are no leading comments', () => {
      expect(parseXmlComments('<routes/>')).toEqual([]);
    });

    it('ignores whitespace-only content between leading comments', () => {
      const xml = '<!-- a -->\n\n   \n<!-- b -->\n<routes/>';
      expect(parseXmlComments(xml)).toEqual(['a', 'b']);
    });
  });

  describe('insertXmlComments', () => {
    it('prepends comments as XML comment nodes above the XML string', () => {
      const result = insertXmlComments('<routes/>', ['hello world']);
      expect(result).toBe('<!-- hello world -->\n<routes/>');
    });

    it('returns the original XML unchanged when comments array is empty', () => {
      expect(insertXmlComments('<routes/>', [])).toBe('<routes/>');
    });

    it('joins multiple comments with newlines', () => {
      const result = insertXmlComments('<routes/>', ['first', 'second']);
      expect(result).toBe('<!-- first -->\n<!-- second -->\n<routes/>');
    });
  });
});
