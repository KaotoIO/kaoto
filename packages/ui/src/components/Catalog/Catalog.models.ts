export interface ITile<T = unknown> {
  type: string;
  name: string;
  title: string;
  description?: string;
  headerTags?: string[];
  tags: string[];
  version?: string;
  rawObject: T;
}

export const enum CatalogLayout {
  Gallery = 'Gallery',
  List = 'List',
}
