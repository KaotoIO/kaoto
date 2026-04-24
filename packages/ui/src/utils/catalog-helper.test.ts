import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { findCatalog, isCatalogCompatible } from './catalog-helper';

describe('CatalogHelper — findCatalog', () => {
  let catalogLibrary: CatalogLibrary;

  beforeEach(() => {
    catalogLibrary = {
      name: 'Catalog',
      version: 1,
      definitions: [
        { name: 'Camel Main 1.0.0', runtime: 'Main', version: '1.0.0', fileName: 'camel-main/index.js' },
        { name: 'Camel Quarkus 1.0.0', runtime: 'Quarkus', version: '1.0.0', fileName: 'camel-quarkus/index.js' },
        { name: 'Citrus 1.0.0', runtime: 'Citrus', version: '1.0.0', fileName: 'citrus/1.0.0/index.js' },
      ],
    } as CatalogLibrary;
  });

  it('returns undefined when catalogLibrary is missing', () => {
    expect(findCatalog(['Main'], undefined)).toBeUndefined();
  });

  it('returns undefined when no candidate matches the compatible runtimes', () => {
    expect(findCatalog(['Spring Boot'], catalogLibrary)).toBeUndefined();
  });

  it('finds a matching Camel catalog when a redhat build is present', () => {
    catalogLibrary.definitions.push({
      name: 'Camel Main 1.0.0.redhat-00001',
      runtime: 'Main',
      version: '1.0.0.redhat-00001',
      fileName: 'camel-main-redhat/index.js',
    });

    const entry = findCatalog(['Main', 'Quarkus', 'Spring Boot'], catalogLibrary);
    expect(entry?.name).toEqual('Camel Main 1.0.0.redhat-00001');
    expect(entry?.runtime).toEqual('Main');
  });

  it('prefers the latest version among redhat candidates', () => {
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

    const entry = findCatalog(['Main', 'Quarkus', 'Spring Boot'], catalogLibrary);
    expect(entry?.name).toEqual('Camel Main 1.0.3.redhat-00003');
  });

  it('falls back to non-redhat candidates when no redhat build exists for any compatible runtime', () => {
    const entry = findCatalog(['Quarkus'], catalogLibrary);
    expect(entry?.name).toEqual('Camel Quarkus 1.0.0');
    expect(entry?.runtime).toEqual('Quarkus');
  });

  it('finds a Citrus catalog via the Citrus runtime', () => {
    const entry = findCatalog(['Citrus'], catalogLibrary);
    expect(entry?.name).toEqual('Citrus 1.0.0');
    expect(entry?.runtime).toEqual('Citrus');
  });

  it('prefers the latest Citrus version', () => {
    catalogLibrary.definitions.push(
      { name: 'Citrus 1.0.2', runtime: 'Citrus', version: '1.0.2', fileName: 'citrus/1.0.2/index.js' },
      { name: 'Citrus 1.0.3', runtime: 'Citrus', version: '1.0.3', fileName: 'citrus/1.0.3/index.js' },
    );

    const entry = findCatalog(['Citrus'], catalogLibrary);
    expect(entry?.name).toEqual('Citrus 1.0.3');
  });
});

describe('CatalogHelper — isCatalogCompatible', () => {
  const camel = { runtime: 'Main' } as never;
  const citrus = { runtime: 'Citrus' } as never;

  it('returns false when the catalog is undefined', () => {
    expect(isCatalogCompatible(undefined, ['Main'])).toBe(false);
  });

  it('returns true when the catalog runtime is in the compatible list', () => {
    expect(isCatalogCompatible(camel, ['Main', 'Quarkus', 'Spring Boot'])).toBe(true);
  });

  it('returns false when the catalog runtime is not in the compatible list', () => {
    expect(isCatalogCompatible(citrus, ['Main', 'Quarkus', 'Spring Boot'])).toBe(false);
  });

  it('returns false when the compatible list is empty', () => {
    expect(isCatalogCompatible(camel, [])).toBe(false);
  });
});
