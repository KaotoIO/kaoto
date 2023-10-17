import { mountStoreDevtool } from 'simple-zustand-devtools';
import { useCatalogStore } from './catalog.store';
import { useSchemasStore } from './schemas.store';

let isDevMode = true;
try {
  isDevMode = NODE_ENV === 'development';
} catch (error) {
  console.warn('NODE_ENV is not defined');
}

if (isDevMode) {
  mountStoreDevtool('Catalog Store', useCatalogStore);
  mountStoreDevtool('Schemas Store', useSchemasStore);
}

export * from './catalog.store';
export * from './schemas.store';
