import { SuggestionProvider } from '@kaoto/forms';

/** Property names that hold a Bob mode ID (slug) reference. */
const CUSTOM_MODE_SLUG_FIELDS = new Set(['#.mode_id', '#.mode']);

/** Built-in Bob mode definitions. */
const BUILT_IN_MODES: { slug: string; description: string }[] = [
  { slug: 'agent', description: 'Write, modify, and refactor code across any language or framework' },
  { slug: 'plan', description: 'Plan, design, and strategise before implementation' },
  { slug: 'ask', description: 'Get explanations, documentation, or answers without making changes' },
];

/**
 * Static suggestion provider for the built-in Bob modes (agent, plan, ask).
 *
 * Activated on the same fields as the custom-mode slug provider:
 *  - `#.mode_id`  — the switch_mode tool parameter
 *  - `#.mode`     — the start_subtask tool parameter
 */
export const builtInModeSlugSuggestionProvider: SuggestionProvider = {
  id: 'built-in-mode-slug-suggestion-provider',
  appliesTo: (propName, schema) => CUSTOM_MODE_SLUG_FIELDS.has(propName) && schema.type === 'string',
  getSuggestions: async (word, _context) => {
    const normalizedWord = word.toLowerCase();
    const filtered =
      normalizedWord === '' ? BUILT_IN_MODES : BUILT_IN_MODES.filter(({ slug }) => slug.startsWith(normalizedWord));

    return filtered.map(({ slug, description }) => ({
      value: slug,
      description,
      group: 'Built-in Modes',
    }));
  },
};
