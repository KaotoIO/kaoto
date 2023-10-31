import { ITile } from '../components/Catalog/Catalog.models';
import { CatalogKind } from './catalog-kind';

export interface CatalogFilter {
  kinds?: CatalogKind[];
  names?: string[];
  filterFunction?: (item: ITile) => boolean;
}
