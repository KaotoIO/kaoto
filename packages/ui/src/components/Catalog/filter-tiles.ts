import { ITile } from './Catalog.models';

const checkThatArrayContainsAllTags = (tileTags: string[], searchTags: string[]) =>
  searchTags.every((v) => tileTags.includes(v));

export const filterTiles = (
  tiles: ITile[],
  options?: { searchTerm?: string; searchTags?: string[]; selectedProviders?: string[] },
): ITile[] => {
  const { searchTerm = '', searchTags = [], selectedProviders = [] } = options ?? {};
  const searchTermLowercase = searchTerm.toLowerCase();

  // Step 1: Score each tile based on how well it matches the search term
  const scoredTiles = tiles.map((tile) => {
    let score = 0;

    // Score based on name
    const nameLower = tile.name.toLowerCase();
    if (nameLower.startsWith(searchTermLowercase)) {
      score += 100;
    } else if (nameLower.includes(searchTermLowercase)) {
      score += 40;
    }

    // Score based on title
    if (tile.title?.toLowerCase().includes(searchTermLowercase)) {
      score += 40;
    }

    // Score based on description
    if (tile.description?.toLowerCase().includes(searchTermLowercase)) {
      score += 10;
    }

    return { tile, score };
  });

  // Step 2: Filter tiles based on score, tags, and providers
  const filteredTiles = scoredTiles.filter(({ tile, score }) => {
    // Exclude tiles with no match
    if (score <= 0) return false;

    // Filter by selected tags
    const doesTagsMatch = searchTags.length ? checkThatArrayContainsAllTags(tile.tags, searchTags) : true;

    // Filter by selected providers
    let doesProviderMatch = true;
    if (selectedProviders.length) {
      doesProviderMatch =
        tile.provider === undefined
          ? selectedProviders.includes('Community')
          : selectedProviders.includes(tile.provider);
    }

    return doesTagsMatch && doesProviderMatch;
  });

  // Step 3: Sort the filtered tiles by score in descending order
  const tilesResult: ITile[] = filteredTiles.sort((a, b) => b.score - a.score).map(({ tile }) => tile);

  return tilesResult;
};
