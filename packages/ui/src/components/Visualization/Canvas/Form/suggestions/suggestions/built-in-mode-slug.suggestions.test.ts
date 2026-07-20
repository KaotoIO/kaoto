import { builtInModeSlugSuggestionProvider } from './built-in-mode-slug.suggestions';

const CONTEXT = { inputValue: '', cursorPosition: 0, propertyName: '' };

describe('Built-in Mode Slug Suggestions', () => {
  describe('appliesTo', () => {
    it.each([
      { propertyName: '#.mode_id', schema: { type: 'string' }, expected: true },
      { propertyName: '#.mode', schema: { type: 'string' }, expected: true },
      { propertyName: 'mode_id', schema: { type: 'string' }, expected: false },
      { propertyName: 'mode', schema: { type: 'string' }, expected: false },
      { propertyName: '#.mode_id', schema: { type: 'number' }, expected: false },
      { propertyName: '#.mode', schema: { type: 'object' }, expected: false },
      { propertyName: '#.parameters.query', schema: { type: 'string' }, expected: false },
    ] as const)('$propertyName + type:$schema.type → $expected', ({ propertyName, schema, expected }) => {
      expect(builtInModeSlugSuggestionProvider.appliesTo(propertyName, schema)).toBe(expected);
    });
  });

  describe('getSuggestions', () => {
    it('returns all three built-in modes when word is empty', async () => {
      const suggestions = await builtInModeSlugSuggestionProvider.getSuggestions('', CONTEXT);

      expect(suggestions).toMatchSnapshot();
      expect(suggestions).toHaveLength(3);
    });

    it('filters by typed word prefix (case-insensitive)', async () => {
      const suggestions = await builtInModeSlugSuggestionProvider.getSuggestions('ag', CONTEXT);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].value).toBe('agent');
    });

    it('returns empty array when no built-in matches', async () => {
      const suggestions = await builtInModeSlugSuggestionProvider.getSuggestions('xyz', CONTEXT);

      expect(suggestions).toHaveLength(0);
    });

    it('uses Built-in Modes group', async () => {
      const suggestions = await builtInModeSlugSuggestionProvider.getSuggestions('', CONTEXT);

      expect(suggestions.every((s) => s.group === 'Built-in Modes')).toBe(true);
    });

    it('includes correct description for each built-in mode', async () => {
      const suggestions = await builtInModeSlugSuggestionProvider.getSuggestions('', CONTEXT);
      const bySlug = Object.fromEntries(suggestions.map((s) => [s.value, s.description]));

      expect(bySlug['agent']).toBeTruthy();
      expect(bySlug['plan']).toBeTruthy();
      expect(bySlug['ask']).toBeTruthy();
    });
  });
});
