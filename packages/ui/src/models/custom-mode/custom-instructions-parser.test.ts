import { CustomInstructionsParser } from './custom-instructions-parser';

describe('CustomInstructionsParser (stub)', () => {
  describe('parse', () => {
    it('returns an empty array for any input', () => {
      expect(CustomInstructionsParser.parse('## Step 1\nsome content')).toEqual([]);
      expect(CustomInstructionsParser.parse('')).toEqual([]);
    });
  });

  describe('serialize', () => {
    it('returns an empty string for any input', () => {
      expect(CustomInstructionsParser.serialize([{ nodeType: 'section', rawContent: '## Step 1' }])).toBe('');
      expect(CustomInstructionsParser.serialize([])).toBe('');
    });
  });
});
