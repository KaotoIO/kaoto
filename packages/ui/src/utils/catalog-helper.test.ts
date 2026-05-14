import { CatalogLibrary, CatalogLibraryEntry } from '@kaoto/camel-catalog/types';

import { SourceSchemaType } from '../models/camel';
import { findCatalog, requiresCatalogChange } from './catalog-helper';

describe('catalog-helper', () => {
  let catalogLibrary: CatalogLibrary;

  beforeEach(() => {
    catalogLibrary = {
      name: 'Catalog',
      version: 1,
      definitions: [
        {
          name: 'Camel Main 1.0.0',
          runtime: 'Main',
          version: '1.0.0',
          fileName: 'camel-main/index.js',
        },
        {
          name: 'Camel Quarkus 1.0.0',
          runtime: 'Quarkus',
          version: '1.0.0',
          fileName: 'camel-quarkus/index.js',
        },
        {
          name: 'Citrus 1.0.0',
          runtime: 'Citrus',
          version: '1.0.0',
          fileName: 'citrus/1.0.0/index.js',
        },
      ],
    };
  });

  it('requiresCatalogChange returns false when catalog is undefined or missing runtime', () => {
    expect(requiresCatalogChange(SourceSchemaType.Route)).toBe(false);
    expect(requiresCatalogChange(SourceSchemaType.Route, {} as CatalogLibraryEntry)).toBe(false);
  });

  it('requiresCatalogChange returns true when switching from Camel to Test', () => {
    const camelCatalog = { runtime: 'Main' } as CatalogLibraryEntry;
    expect(requiresCatalogChange(SourceSchemaType.Test, camelCatalog)).toBe(true);
  });

  it('requiresCatalogChange returns true when switching from Test to Camel', () => {
    const testCatalog = { runtime: 'Citrus' } as CatalogLibraryEntry;
    expect(requiresCatalogChange(SourceSchemaType.Route, testCatalog)).toBe(true);
  });

  it('requiresCatalogChange returns false when staying in Camel runtime', () => {
    const camelCatalog = { runtime: 'Quarkus' } as CatalogLibraryEntry;
    expect(requiresCatalogChange(SourceSchemaType.Route, camelCatalog)).toBe(false);
  });

  it('requiresCatalogChange returns false when staying in Test runtime', () => {
    const testCatalog = { runtime: 'Citrus' } as CatalogLibraryEntry;
    expect(requiresCatalogChange(SourceSchemaType.Test, testCatalog)).toBe(false);
  });

  it('findCatalog handles no matching Camel catalog', () => {
    const entry = findCatalog(SourceSchemaType.Route, catalogLibrary);
    expect(entry).toBeUndefined();
  });

  it('findCatalog finds latest Camel catalog version', () => {
    catalogLibrary.definitions.push(
      {
        name: 'Camel Main 1.0.2.redhat-00002',
        runtime: 'Main',
        version: '1.0.2.redhat-00002',
        fileName: 'camel-main-redhat/index.js',
      },
      {
        name: 'Camel Main 1.0.3.redhat-00003',
        runtime: 'Main',
        version: '1.0.3.redhat-00003',
        fileName: 'camel-main-redhat/index.js',
      },
    );

    const entry = findCatalog(SourceSchemaType.Route, catalogLibrary);
    expect(entry?.name).toEqual('Camel Main 1.0.3.redhat-00003');
  });

  it('findCatalog finds latest Citrus catalog version', () => {
    catalogLibrary.definitions.push(
      {
        name: 'Citrus 1.0.2',
        runtime: 'Citrus',
        version: '1.0.2',
        fileName: 'citrus/1.0.2/index.js',
      },
      {
        name: 'Citrus 1.0.3',
        runtime: 'Citrus',
        version: '1.0.3',
        fileName: 'citrus/1.0.3/index.js',
      },
    );

    const entry = findCatalog(SourceSchemaType.Test, catalogLibrary);
    expect(entry?.name).toEqual('Citrus 1.0.3');
  });
});
