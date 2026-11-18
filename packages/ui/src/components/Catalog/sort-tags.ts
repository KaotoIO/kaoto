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
  const priorityTags = new Set(additionalPriorityTags);
  const uniqueTags = new Set<string>();
  for (const tile of allTiles) {
    for (const tag of tile.tags) {
      uniqueTags.add(tag);
      if (tile.type === 'processor' && tag !== 'eip') priorityTags.add(tag);
    }
  }

  const filterTagsSet = new Set(filterTags);
  const lowerCaseTags = new Map<string, string>();
  for (const tag of uniqueTags) {
    lowerCaseTags.set(tag, tag.toLowerCase());
  }

  const sortedTags = [...uniqueTags].sort((a, b) => {
    if (filterTagsSet.has(a) && !filterTagsSet.has(b)) return -1;
    if (filterTagsSet.has(b) && !filterTagsSet.has(a)) return 1;
    if (priorityTags.has(a) && !priorityTags.has(b)) return -1;
    if (priorityTags.has(b) && !priorityTags.has(a)) return 1;

    const lowerA = lowerCaseTags.get(a)!;
    const lowerB = lowerCaseTags.get(b)!;
    if (lowerA < lowerB) return -1;
    if (lowerA > lowerB) return 1;
    return 0;
  });
  const num = sortedTags.filter((tag) => filterTagsSet.has(tag) || priorityTags.has(tag)).length;
  const overflowIndex = Math.max(num, overflowThreshold);
  return { sortedTags, overflowIndex };
};
