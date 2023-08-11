import { mountStoreDevtool } from 'simple-zustand-devtools';
import { useCatalogStore } from './catalog.store';

let isDevMode = true;
try {
  isDevMode = NODE_ENV === 'development';
} catch (error) {
  console.info('NODE_ENV is not defined');
}

if (isDevMode) {
  mountStoreDevtool('CatalogStore', useCatalogStore);
}

export * from './catalog.store';
