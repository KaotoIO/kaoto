export interface ITile {
  type: string;
  name: string;
  title: string;
  description?: string;
  headerTags?: string[];
  tags: string[];
  version?: string;
  /** @deprecated Please relay on name property instead */
  rawObject?: unknown;
}

export const enum CatalogLayout {
  Gallery = 'Gallery',
  List = 'List',
}
