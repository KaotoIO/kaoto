import { mountStoreDevtool } from 'simple-zustand-devtools';
import { useSchemasStore } from './schemas.store';
import { useCatalogStore } from './catalog.store';
import { useFlowsStore } from './flows.store';

let isDevMode = true;
try {
  isDevMode = NODE_ENV === 'development';
} catch (error) {
  console.info('NODE_ENV is not defined');
}

if (isDevMode) {
  mountStoreDevtool('Catalog Store', useCatalogStore);
  mountStoreDevtool('Flows Store', useFlowsStore);
  mountStoreDevtool('Schemas Store', useSchemasStore);
}

export * from './catalog.store';
export * from './flows.store';
export * from './schemas.store';
