import { ITile } from './Catalog.models';

/** Tags to keep from overflowing. */
const additionalPriorityTags = ['database', 'cloud'];

/** The number of tags to start using priority and filter tags to calculate overflowing index. */
const overflowThreshold = 0;

/**
 * Extract all tags from tiles and sort it alphabetically as well as to pull prioritized tags and
 * {@link filterTags} up.
 * As a result, the prioritized tags and the ones in the filter are always shown. If the added number of
 * prioritized tags and {@link filterTags} exceeds {@link overflowThreshold}, all other tags overflow
 * behind the "N more" label, Otherwise the {@link overflowThreshold} number of tags are shown and kept
 * from overflowing.
 * The prioritized tags are either (1) the tags assigned to processors other than "eip", or
 * (2) {@link additionalPriorityTags}.
 */
export const sortTags = (allTiles: ITile[], filterTags: string[]): { sortedTags: string[]; overflowIndex: number } => {
  const priorityTags = [...additionalPriorityTags];
  const sortedTags = allTiles
    .reduce((acc, tile) => {
      tile.tags.forEach((tag) => {
        !acc.includes(tag) && acc.push(tag);
        tile.type === 'processor' && tag !== 'eip' && !priorityTags.includes(tag) && priorityTags.push(tag);
      });
      return acc;
    }, [] as string[])
    .sort((a, b) => {
      if (filterTags.includes(a) && !filterTags.includes(b)) return -1;
      if (filterTags.includes(b) && !filterTags.includes(a)) return 1;
      if (priorityTags.includes(a) && !priorityTags.includes(b)) return -1;
      if (priorityTags.includes(b) && !priorityTags.includes(a)) return 1;

      const lowerA = a.toLowerCase();
      const lowerB = b.toLowerCase();
      if (lowerA < lowerB) return -1;
      if (lowerA > lowerB) return 1;
      return 0;
    });
  const num = sortedTags.filter((tag) => filterTags.includes(tag) || priorityTags.includes(tag)).length;
  const overflowIndex = num > overflowThreshold ? num : overflowThreshold;
  return { sortedTags, overflowIndex };
};
