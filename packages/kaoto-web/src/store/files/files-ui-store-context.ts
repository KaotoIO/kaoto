import { createContext } from 'react';

import { FilesUiStoreApi } from './files-ui-store';

/** The files UI store of the open project */
export const FilesUiStoreContext = createContext<FilesUiStoreApi | undefined>(undefined);
