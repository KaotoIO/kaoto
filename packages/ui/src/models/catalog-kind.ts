export const enum CatalogKind {
  Component = 'component',
  Processor = 'model',
  Kamelet = 'kamelet',
}

export interface CatalogFilter {
  kinds?: CatalogKind[];
  names?: string[];
}
