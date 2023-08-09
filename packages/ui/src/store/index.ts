import { mountStoreDevtool } from 'simple-zustand-devtools';
import { useComponentsCatalogStore } from './components-catalog.store';

let isDevMode = true;
try {
  isDevMode = NODE_ENV === 'development';
} catch (error) {
  console.info('NODE_ENV is not defined');
}

if (isDevMode) {
  mountStoreDevtool('ComponentsCatalogStore', useComponentsCatalogStore);
}

export * from './components-catalog.store';
