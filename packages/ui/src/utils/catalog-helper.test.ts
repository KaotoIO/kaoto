import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { SourceSchemaType } from '../models/camel';
import { findCatalog, getCatalogRuntimeForSourceType, requiresCatalogChange } from './catalog-helper';

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
        {
          name: 'Bob 1.0.0',
          runtime: 'Bob',
          version: '1.0.0',
          fileName: 'bob/1.0.0/index.js',
        },
      ],
    };
  });

  it('should handle no matching Camel catalog', () => {
    const entry = findCatalog(SourceSchemaType.Route, catalogLibrary);
    expect(entry).toEqual({
      fileName: 'camel-main/index.js',
      name: 'Camel Main 1.0.0',
      runtime: 'Main',
      version: '1.0.0',
    });
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
    expect(entry?.name).toBe('Camel Main 1.0.0.redhat-00001');
    expect(entry?.runtime).toBe('Main');
  });

  it('should find matching Camel catalog latest version', () => {
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
    expect(entry).toBeDefined();
    expect(entry?.name).toBe('Camel Main 1.0.3.redhat-00003');
    expect(entry?.runtime).toBe('Main');
  });

  it('should find Citrus catalog', () => {
    const entry = findCatalog(SourceSchemaType.Test, catalogLibrary);
    expect(entry).toBeDefined();
    expect(entry?.name).toBe('Citrus 1.0.0');
    expect(entry?.runtime).toBe('Citrus');
  });

  it('should find matching Citrus catalog latest version', () => {
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
    expect(entry).toBeDefined();
    expect(entry?.name).toBe('Citrus 1.0.3');
    expect(entry?.runtime).toBe('Citrus');
  });

  it('should find Bob catalog for Custom Mode', () => {
    const entry = findCatalog(SourceSchemaType.CustomMode, catalogLibrary);
    expect(entry).toBeDefined();
    expect(entry?.name).toBe('Bob 1.0.0');
    expect(entry?.runtime).toBe('Bob');
  });

  describe('getCatalogRuntimeForSourceType', () => {
    it('maps source types to catalog runtimes', () => {
      expect(getCatalogRuntimeForSourceType(SourceSchemaType.Test)).toBe('Citrus');
      expect(getCatalogRuntimeForSourceType(SourceSchemaType.CustomMode)).toBe('Bob');
      expect(getCatalogRuntimeForSourceType(SourceSchemaType.Route)).toBe('integration');
    });
  });

  describe('requiresCatalogChange', () => {
    const mainCatalog = { name: 'Camel Main 1.0.0', runtime: 'Main', version: '1.0.0', fileName: 'main.js' };
    const citrusCatalog = { name: 'Citrus 1.0.0', runtime: 'Citrus', version: '1.0.0', fileName: 'citrus.js' };
    const bobCatalog = { name: 'Bob 1.0.0', runtime: 'Bob', version: '1.0.0', fileName: 'bob.js' };

    it('requires change when switching between integration and Citrus', () => {
      expect(requiresCatalogChange(SourceSchemaType.Route, citrusCatalog)).toBe(true);
      expect(requiresCatalogChange(SourceSchemaType.Test, mainCatalog)).toBe(true);
    });

    it('requires change when switching between integration and Bob', () => {
      expect(requiresCatalogChange(SourceSchemaType.Route, bobCatalog)).toBe(true);
      expect(requiresCatalogChange(SourceSchemaType.CustomMode, mainCatalog)).toBe(true);
    });

    it('requires change when switching between Citrus and Bob', () => {
      expect(requiresCatalogChange(SourceSchemaType.CustomMode, citrusCatalog)).toBe(true);
      expect(requiresCatalogChange(SourceSchemaType.Test, bobCatalog)).toBe(true);
    });

    it('does not require change when catalog matches source type', () => {
      expect(requiresCatalogChange(SourceSchemaType.Route, mainCatalog)).toBe(false);
      expect(requiresCatalogChange(SourceSchemaType.Test, citrusCatalog)).toBe(false);
      expect(requiresCatalogChange(SourceSchemaType.CustomMode, bobCatalog)).toBe(false);
    });
  });
});
