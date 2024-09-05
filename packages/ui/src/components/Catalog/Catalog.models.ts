export interface ITile {
  type: string;
  name: string;
  title: string;
  description?: string;
  headerTags?: string[];
  tags: string[];
  version?: string;
  provider?: string;
}

export type TileFilter = (item: ITile) => boolean;

export const enum CatalogLayout {
  Gallery = 'Gallery',
  List = 'List',
}
