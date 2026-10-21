import { useEffect, useMemo, useState } from 'react';

import { DynamicCatalogRegistry } from '../../../../../../dynamic-catalog/dynamic-catalog-registry';
import { CatalogKind, ICitrusComponentDefinition } from '../../../../../../models';
import { InfraServiceCatalogEntry, parseInfraCatalog } from './InfraServiceField';

export function useInfraCatalog(): InfraServiceCatalogEntry[] {
  const [infraCatalog, setInfraCatalog] = useState<Record<string, ICitrusComponentDefinition>>({});

  useEffect(() => {
    DynamicCatalogRegistry.get()
      .getCatalog(CatalogKind.TestInfraService)
      ?.getAll()
      .then((catalog) => {
        if (catalog) setInfraCatalog(catalog);
      })
      .catch((error: unknown) => {
        console.error('Failed to load Citrus infra services catalog', error);
      });
  }, []);

  return useMemo(() => parseInfraCatalog(infraCatalog), [infraCatalog]);
}
