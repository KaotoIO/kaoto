import { mountStoreDevtool } from 'simple-zustand-devtools';
import { useSchemasStore } from './schemas.store';
import { useCatalogStore } from './catalog.store';
import { useCamelEntitiesStore } from './camel-entities.store';

let isDevMode = true;
try {
  isDevMode = NODE_ENV === 'development';
} catch (error) {
  console.info('NODE_ENV is not defined');
}

if (isDevMode) {
  mountStoreDevtool('Catalog Store', useCatalogStore);
  mountStoreDevtool('Camel entities Store', useCamelEntitiesStore);
  mountStoreDevtool('Schemas Store', useSchemasStore);
}

export * from './catalog.store';
export * from './camel-entities.store';
export * from './schemas.store';
