import { mountStoreDevtool } from 'simple-zustand-devtools';

import { useDocumentTreeStore } from './document-tree.store';
import { useSchemasStore } from './schemas.store';
import { useSourceCodeStore } from './sourcecode.store';

const isDevMode = import.meta.env?.DEV === true && import.meta.env.MODE !== 'test';

if (isDevMode) {
  mountStoreDevtool('Schemas Store', useSchemasStore);
  mountStoreDevtool('SourceCode Store', useSourceCodeStore);
  mountStoreDevtool('Document Tree Store', useDocumentTreeStore);
}

export * from './document-tree.store';
export * from './schemas.store';
export * from './sourcecode.store';
