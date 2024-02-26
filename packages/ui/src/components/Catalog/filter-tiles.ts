import { ITile } from './Catalog.models';

const checkThatArrayContainsAllTags = (tileTags: string[], searchTags: string[]) =>
  searchTags.every((v) => tileTags.includes(v));

export const filterTiles = (
  tiles: ITile[],
  options?: { searchTerm?: string; searchTags?: string[] },
): Record<string, ITile[]> => {
  const { searchTerm = '', searchTags = [] } = options ?? {};
  const searchTermLowercase = searchTerm.toLowerCase();

  return tiles.reduce(
    (acc, tile) => {
      /** Filter by selected tags */
      const doesTagsMatches = searchTags.length ? checkThatArrayContainsAllTags(tile.tags, searchTags) : true;

      /** Determine whether the tile should be included in the filtered list */
      const shouldInclude =
        doesTagsMatches &&
        (!searchTermLowercase ||
          tile.name.toLowerCase().includes(searchTermLowercase) ||
          tile.title.toLowerCase().includes(searchTermLowercase) ||
          tile.description?.toLowerCase().includes(searchTermLowercase) ||
          tile.tags.some((tag) => tag.toLowerCase().includes(searchTermLowercase)));

      acc[tile.type] = acc[tile.type] ?? [];
      if (shouldInclude) {
        acc[tile.type].push(tile);
      }

      return acc;
    },
    {} as Record<ITile['type'], ITile[]>,
  );
};
