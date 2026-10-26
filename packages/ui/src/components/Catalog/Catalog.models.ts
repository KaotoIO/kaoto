export interface ITile {
  type: string;
  name: string;
  title: string;
  description?: string;
  headerTags?: string[];
  tags: string[];
  version?: string;
  provider?: string;
  iconUrl: string;
}

export type TileFilter = (item: ITile) => boolean;

/**
 * Unique identity of a tile, since the same name can exist across different tile types (e.g. component and processor).
 * The result is also used as a DOM id and referenced from `aria-labelledby`, so whitespace is encoded to keep it a
 * single id token, since names can come from user provided resources such as Kamelets.
 */
export const getTileKey = (tile: Pick<ITile, 'name' | 'type'>): string =>
  `${encodeURIComponent(tile.name)}-${encodeURIComponent(tile.type)}`;

export const enum CatalogLayout {
  Gallery = 'Gallery',
  List = 'List',
}
