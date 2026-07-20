import { SuggestionProvider } from '@kaoto/forms';

import { CustomModeVisualEntity } from '../../../../../../models/custom-mode/custom-mode-visual-entity';
import { EntityType } from '../../../../../../models/entities';
import { BaseVisualEntity } from '../../../../../../models/visualization/base-visual-entity';

/** Property names that hold a Bob mode ID (slug) reference. */
const CUSTOM_MODE_SLUG_FIELDS = new Set(['#.mode_id', '#.mode']);

export type GetVisualEntities = () => BaseVisualEntity[];

/**
 * Suggestion provider that suggests mode slugs (IDs) from the currently open custom_modes.yaml.
 *
 * Activated on:
 *  - `#.mode_id`  — the switch_mode tool parameter
 *  - `#.mode`     — the start_subtask tool parameter
 *
 * Slugs are read live via `getVisualEntities()` so the suggestions always reflect
 * the current state of the resource without going through an external API.
 */
export const getCustomModeSlugSuggestionProvider = (
  getVisualEntities: GetVisualEntities = () => [],
): SuggestionProvider => {
  return {
    id: 'custom-mode-slug-suggestion-provider',
    appliesTo: (propName, schema) => CUSTOM_MODE_SLUG_FIELDS.has(propName) && schema.type === 'string',
    getSuggestions: async (word, _context) => {
      const slugs = getVisualEntities()
        .filter((e): e is CustomModeVisualEntity => e.type === EntityType.CustomMode)
        .map((e) => e.id);

      if (slugs.length === 0) {
        return [
          {
            value: word === '' ? 'my-mode' : word,
            description: 'Mode slug — define modes in your custom_modes.yaml',
          },
        ];
      }

      const normalizedWord = word.toLowerCase();
      const filtered =
        normalizedWord === '' ? slugs : slugs.filter((slug) => slug.toLowerCase().startsWith(normalizedWord));

      return filtered.map((slug) => ({
        value: slug,
        description: `Switch to the '${slug}' mode`,
        group: 'Custom Modes',
      }));
    },
  };
};
