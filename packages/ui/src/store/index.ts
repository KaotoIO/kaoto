import { mountStoreDevtool } from 'simple-zustand-devtools';
import { useSchemasStore } from './schemas.store';
import { useSourceCodeStore } from './sourcecode.store';

let isDevMode = true;
try {
  isDevMode = NODE_ENV === 'development';
} catch (error) {
  console.warn('NODE_ENV is not defined');
}

if (isDevMode) {
  mountStoreDevtool('Schemas Store', useSchemasStore);
  mountStoreDevtool('SourceCode Store', useSourceCodeStore);
}

export * from './schemas.store';
export * from './sourcecode.store';
