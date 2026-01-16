import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { SourceSchemaType } from '../models/camel';
import { findCatalog } from './catalog-helper';

describe('CatalogHelper', () => {
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
    } as CatalogLibrary;
  });

  it('should handle no matching Camel catalog', () => {
    const entry = findCatalog(SourceSchemaType.Route, catalogLibrary);
    expect(entry).toBeUndefined();
  });

  it('should find matching Camel catalog', () => {
    catalogLibrary.definitions.push({
      name: 'Camel Main 1.0.0.redhat-00001',
      runtime: 'Main',
      version: '1.0.0.redhat-00001',
      fileName: 'camel-main-redhat/index.js',
    });

    const entry = findCatalog(SourceSchemaType.Route, catalogLibrary);
    expect(entry).toBeDefined();
    expect(entry?.name).toEqual('Camel Main 1.0.0.redhat-00001');
    expect(entry?.runtime).toEqual('Main');
  });

  it('should find matching Camel catalog latest version', () => {
    catalogLibrary.definitions.push({
      name: 'Camel Main 1.0.2.redhat-00002',
      runtime: 'Main',
      version: '1.0.2.redhat-00002',
      fileName: 'camel-main-redhat/index.js',
    });

    catalogLibrary.definitions.push({
      name: 'Camel Main 1.0.3.redhat-00003',
      runtime: 'Main',
      version: '1.0.3.redhat-00003',
      fileName: 'camel-main-redhat/index.js',
    });

    const entry = findCatalog(SourceSchemaType.Route, catalogLibrary);
    expect(entry).toBeDefined();
    expect(entry?.name).toEqual('Camel Main 1.0.3.redhat-00003');
    expect(entry?.runtime).toEqual('Main');
  });

  it('should find Citrus catalog', () => {
    const entry = findCatalog(SourceSchemaType.Test, catalogLibrary);
    expect(entry).toBeDefined();
    expect(entry?.name).toEqual('Citrus 1.0.0');
    expect(entry?.runtime).toEqual('Citrus');
  });

  it('should find matching Citrus catalog latest version', () => {
    catalogLibrary.definitions.push({
      name: 'Citrus 1.0.2',
      runtime: 'Citrus',
      version: '1.0.2',
      fileName: 'citrus/1.0.2/index.js',
    });

    catalogLibrary.definitions.push({
      name: 'Citrus 1.0.3',
      runtime: 'Citrus',
      version: '1.0.3',
      fileName: 'citrus/1.0.3/index.js',
    });

    const entry = findCatalog(SourceSchemaType.Test, catalogLibrary);
    expect(entry).toBeDefined();
    expect(entry?.name).toEqual('Citrus 1.0.3');
    expect(entry?.runtime).toEqual('Citrus');
  });
});
