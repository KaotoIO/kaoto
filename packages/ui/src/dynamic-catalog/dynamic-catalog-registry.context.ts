import { createContext } from 'react';

import { DynamicCatalogRegistry } from './dynamic-catalog-registry';
import { IDynamicCatalogRegistry } from './models';

export const DynamicCatalogRegistryContext = createContext<IDynamicCatalogRegistry>(DynamicCatalogRegistry.get());
