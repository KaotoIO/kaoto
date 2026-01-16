import { CatalogLibrary, CatalogLibraryEntry } from '@kaoto/camel-catalog/types';

import { SourceSchemaType } from '../models/camel';
import { versionCompare } from './version-compare';

export const findCatalog = (sourceType: SourceSchemaType, catalogLibrary?: CatalogLibrary) => {
  if (!catalogLibrary) {
    return undefined;
  }

  if (sourceType === SourceSchemaType.Test) {
    return catalogLibrary?.definitions.find((catalog) => {
      return catalog.runtime === 'Citrus';
    });
  } else {
    const redhatMainCatalogs = catalogLibrary.definitions
      .filter((c: CatalogLibraryEntry) => c.runtime === 'Main' && c.name.includes('redhat'))
      .sort((c1: CatalogLibraryEntry, c2: CatalogLibraryEntry) =>
        versionCompare(c1.version.split('.redhat')[0], c2.version.split('.redhat')[0]),
      );

    return redhatMainCatalogs.length > 0 ? redhatMainCatalogs[0] : undefined;
  }
};

export const requiresCatalogChange = (sourceType: SourceSchemaType, catalog?: CatalogLibraryEntry) => {
  return catalog?.runtime === 'Citrus' ? sourceType !== SourceSchemaType.Test : sourceType === SourceSchemaType.Test;
};
