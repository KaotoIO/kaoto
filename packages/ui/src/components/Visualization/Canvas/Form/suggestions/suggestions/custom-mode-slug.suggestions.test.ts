import { EntityType } from '../../../../../../models/entities';
import { BaseVisualEntity } from '../../../../../../models/visualization/base-visual-entity';
import { getCustomModeSlugSuggestionProvider } from './custom-mode-slug.suggestions';

const CONTEXT = { inputValue: '', cursorPosition: 0, propertyName: '' };

/** Build a minimal fake CustomMode visual entity. */
const fakeMode = (slug: string) => ({ type: EntityType.CustomMode, id: slug }) as unknown as BaseVisualEntity;

describe('Custom Mode Slug Suggestions', () => {
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
      expect(getCustomModeSlugSuggestionProvider().appliesTo(propertyName, schema)).toBe(expected);
    });
  });

  describe('getSuggestions — no modes defined', () => {
    it('returns a placeholder hint when word is empty', async () => {
      const suggestions = await getCustomModeSlugSuggestionProvider(() => []).getSuggestions('', CONTEXT);
      expect(suggestions).toEqual([
        { value: 'my-mode', description: 'Mode slug — define modes in your custom_modes.yaml' },
      ]);
    });

    it('uses the typed word as placeholder value', async () => {
      const suggestions = await getCustomModeSlugSuggestionProvider(() => []).getSuggestions('custom', CONTEXT);
      expect(suggestions).toEqual([
        { value: 'custom', description: 'Mode slug — define modes in your custom_modes.yaml' },
      ]);
    });
  });

  describe('getSuggestions — with modes', () => {
    it('returns all slugs when word is empty', async () => {
      const entities = [fakeMode('new-mode-1'), fakeMode('review-mode'), fakeMode('doc-writer')];
      const suggestions = await getCustomModeSlugSuggestionProvider(() => entities).getSuggestions('', CONTEXT);

      expect(suggestions).toMatchSnapshot();
      expect(suggestions).toHaveLength(3);
    });

    it('filters slugs by typed word prefix (case-insensitive)', async () => {
      const entities = [
        fakeMode('new-mode-1'),
        fakeMode('review-mode'),
        fakeMode('doc-writer'),
        fakeMode('new-mode-2'),
      ];
      const suggestions = await getCustomModeSlugSuggestionProvider(() => entities).getSuggestions('new', CONTEXT);

      expect(suggestions).toHaveLength(2);
      expect(suggestions[0].value).toBe('new-mode-1');
      expect(suggestions[1].value).toBe('new-mode-2');
    });

    it('returns empty array when no slug matches', async () => {
      const entities = [fakeMode('new-mode-1'), fakeMode('review-mode')];
      const suggestions = await getCustomModeSlugSuggestionProvider(() => entities).getSuggestions('xyz', CONTEXT);

      expect(suggestions).toHaveLength(0);
    });

    it('ignores non-CustomMode entities', async () => {
      const entities = [fakeMode('new-mode-1'), { type: 'Route', id: 'some-route' } as unknown as BaseVisualEntity];
      const suggestions = await getCustomModeSlugSuggestionProvider(() => entities).getSuggestions('', CONTEXT);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].value).toBe('new-mode-1');
    });

    it('uses Custom Modes group and correct description', async () => {
      const suggestions = await getCustomModeSlugSuggestionProvider(() => [fakeMode('new-mode-1')]).getSuggestions(
        '',
        CONTEXT,
      );

      expect(suggestions[0]).toEqual({
        value: 'new-mode-1',
        description: "Switch to the 'new-mode-1' mode",
        group: 'Custom Modes',
      });
    });
  });
});
