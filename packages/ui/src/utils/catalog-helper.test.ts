import { CatalogLibrary, CatalogLibraryEntry } from '@kaoto/camel-catalog/types';

import { SourceSchemaType } from '../models/camel';
import { SettingsModel } from '../models/settings/settings.model';
import {
  findCatalog,
  normalizeSettingsForCustomCatalog,
  requiresCatalogChange,
  resolveSettingsForCatalogUrl,
} from './catalog-helper';
import { CatalogSchemaLoader } from './catalog-schema-loader';

describe('catalog-helper', () => {
  let catalogLibrary: CatalogLibrary;
  let defaultSettings: SettingsModel;

  beforeEach(() => {
    defaultSettings = new SettingsModel();
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

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ['returns false when catalog is undefined', SourceSchemaType.Route, undefined, false],
    ['returns false when catalog runtime is missing', SourceSchemaType.Route, {} as CatalogLibraryEntry, false],
    [
      'returns true when switching from Camel to Test',
      SourceSchemaType.Test,
      { runtime: 'Main' } as CatalogLibraryEntry,
      true,
    ],
    [
      'returns true when switching from Test to Camel',
      SourceSchemaType.Route,
      { runtime: 'Citrus' } as CatalogLibraryEntry,
      true,
    ],
    [
      'returns false when staying in Camel runtime',
      SourceSchemaType.Route,
      { runtime: 'Quarkus' } as CatalogLibraryEntry,
      false,
    ],
    [
      'returns false when staying in Test runtime',
      SourceSchemaType.Test,
      { runtime: 'Citrus' } as CatalogLibraryEntry,
      false,
    ],
  ])('requiresCatalogChange %s', (_description, schemaType, catalog, expected) => {
    expect(requiresCatalogChange(schemaType, catalog)).toBe(expected);
  });

  it('findCatalog returns matching catalog based on settings', () => {
    const camelCatalog = { version: '1.0.0', runtime: 'Main' };
    const entry = findCatalog(SourceSchemaType.Route, catalogLibrary, camelCatalog, defaultSettings.testingCatalog);
    expect(entry?.name).toEqual('Camel Main 1.0.0');
  });

  it('findCatalog falls back to runtime match when exact version is missing', () => {
    catalogLibrary.definitions.push({
      name: 'Camel Main 2.0.0',
      runtime: 'Main',
      version: '2.0.0',
      fileName: 'camel-main/2.0.0/index.js',
    });

    const camelCatalog = { version: '9.9.9', runtime: 'Main' };
    const entry = findCatalog(SourceSchemaType.Route, catalogLibrary, camelCatalog, defaultSettings.testingCatalog);
    expect(entry?.runtime).toEqual('Main');
    expect(entry?.version).toEqual('2.0.0'); // Should pick highest version
  });

  it('findCatalog finds catalog by runtime when version is empty', () => {
    const camelCatalog = { version: '', runtime: 'Quarkus' };
    const entry = findCatalog(SourceSchemaType.Route, catalogLibrary, camelCatalog, defaultSettings.testingCatalog);
    expect(entry?.name).toEqual('Camel Quarkus 1.0.0');
  });

  it('findCatalog prioritizes Red Hat Main catalog when version is empty', () => {
    catalogLibrary.definitions.push(
      {
        name: 'Camel Main 2.0.0',
        runtime: 'Main',
        version: '2.0.0',
        fileName: 'camel-main/2.0.0/index.js',
      },
      {
        name: 'Camel Main 1.5.0.redhat-00001',
        runtime: 'Main',
        version: '1.5.0.redhat-00001',
        fileName: 'camel-main/1.5.0.redhat-00001/index.js',
      },
    );

    const camelCatalog = { version: '', runtime: 'Main' };
    const entry = findCatalog(SourceSchemaType.Route, catalogLibrary, camelCatalog, defaultSettings.testingCatalog);
    // Should return the Red Hat version even though 2.0.0 is higher
    expect(entry?.version).toEqual('1.5.0.redhat-00001');
  });

  it('findCatalog falls back to community Main catalog when no Red Hat version exists', () => {
    catalogLibrary.definitions.push({
      name: 'Camel Main 2.0.0',
      runtime: 'Main',
      version: '2.0.0',
      fileName: 'camel-main/2.0.0/index.js',
    });

    const camelCatalog = { version: '', runtime: 'Main' };
    const entry = findCatalog(SourceSchemaType.Route, catalogLibrary, camelCatalog, defaultSettings.testingCatalog);
    expect(entry?.version).toEqual('2.0.0');
  });

  it('findCatalog finds Citrus catalog based on settings', () => {
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

    const testingCatalog = { version: '1.0.3', runtime: 'Citrus' };
    const entry = findCatalog(SourceSchemaType.Test, catalogLibrary, defaultSettings.camelCatalog, testingCatalog);
    expect(entry?.name).toEqual('Citrus 1.0.3');
  });

  it('findCatalog returns undefined when catalogLibrary is undefined', () => {
    const entry = findCatalog(SourceSchemaType.Route, undefined, defaultSettings.camelCatalog);
    expect(entry).toBeUndefined();
  });

  it('findCatalog returns highest catalog when no settings match', () => {
    catalogLibrary.definitions.push({
      name: 'Camel Main 2.0.0',
      runtime: 'Main',
      version: '2.0.0',
      fileName: 'camel-main/2.0.0/index.js',
    });

    const entry = findCatalog(SourceSchemaType.Route, catalogLibrary);
    expect(entry?.version).toEqual('2.0.0');
  });

  it.each([
    [
      'updates both camel and testing catalogs from a custom library',
      { version: '0.0.1', runtime: 'Citrus' },
      [
        { name: 'Camel Quarkus 4.18.1', runtime: 'Quarkus', version: '4.18.1' },
        { name: 'Citrus 4.10.2', runtime: 'Citrus', version: '4.10.2' },
      ],
      { version: '4.10.2', runtime: 'Citrus' },
    ],
    [
      'preserves testing catalog when no testing entries exist',
      { version: '4.10.1', runtime: 'Citrus' },
      [{ name: 'Camel Quarkus 4.18.1', runtime: 'Quarkus', version: '4.18.1' }],
      { version: '4.10.1', runtime: 'Citrus' },
    ],
  ])(
    'normalizeSettingsForCustomCatalog %s',
    (_description, initialTestingCatalog, catalogDefinitions, expectedTestingCatalog) => {
      const settings = new SettingsModel({
        catalogUrl: 'http://example.com/custom.json',
        camelCatalog: { version: '0.0.1', runtime: 'Quarkus' },
        testingCatalog: initialTestingCatalog,
      });

      const normalized = normalizeSettingsForCustomCatalog(settings, {
        name: 'Custom Catalog',
        version: 1,
        definitions: catalogDefinitions as CatalogLibrary['definitions'],
      });

      expect(normalized.camelCatalog).toEqual({ version: '4.18.1', runtime: 'Quarkus' });
      expect(normalized.testingCatalog).toEqual(expectedTestingCatalog);
    },
  );

  it('normalizeSettingsForCustomCatalog falls back to highest catalog when no Main runtime exists', () => {
    const settings = new SettingsModel({
      catalogUrl: 'http://example.com/custom.json',
      camelCatalog: { version: '0.0.1', runtime: 'Main' },
    });

    const normalized = normalizeSettingsForCustomCatalog(settings, {
      name: 'Custom Catalog',
      version: 1,
      definitions: [
        { name: 'Camel Quarkus 4.18.1', runtime: 'Quarkus', version: '4.18.1' },
        { name: 'Camel Spring Boot 3.20.0', runtime: 'Spring Boot', version: '3.20.0' },
      ] as CatalogLibrary['definitions'],
    });

    // Should pick the highest version when Main runtime doesn't exist
    expect(normalized.camelCatalog.runtime).toBe('Quarkus');
    expect(normalized.camelCatalog.version).toBe('4.18.1');
  });

  it('normalizeSettingsForCustomCatalog selects highest testing catalog when available', () => {
    const settings = new SettingsModel({
      catalogUrl: 'http://example.com/custom.json',
      testingCatalog: { version: '0.0.1', runtime: 'Citrus' },
    });

    const normalized = normalizeSettingsForCustomCatalog(settings, {
      name: 'Custom Catalog',
      version: 1,
      definitions: [
        { name: 'Camel Main 4.18.1', runtime: 'Main', version: '4.18.1' },
        { name: 'Citrus 1.0.0', runtime: 'Citrus', version: '1.0.0' },
        { name: 'Citrus 1.0.3', runtime: 'Citrus', version: '1.0.3' },
      ] as CatalogLibrary['definitions'],
    });

    expect(normalized.testingCatalog).toEqual({ version: '1.0.3', runtime: 'Citrus' });
  });

  it('normalizeSettingsForCustomCatalog preserves catalogs when custom library has empty definitions', () => {
    const settings = new SettingsModel({
      catalogUrl: 'http://example.com/custom.json',
      camelCatalog: { version: '4.0.0', runtime: 'Main' },
      testingCatalog: { version: '1.0.0', runtime: 'Citrus' },
    });

    const normalized = normalizeSettingsForCustomCatalog(settings, {
      name: 'Custom Catalog',
      version: 1,
      definitions: [] as CatalogLibrary['definitions'],
    });

    // Should preserve original settings when no catalogs available
    expect(normalized.camelCatalog).toEqual({ version: '4.0.0', runtime: 'Main' });
    expect(normalized.testingCatalog).toEqual({ version: '1.0.0', runtime: 'Citrus' });
  });

  it('normalizeSettingsForCustomCatalog uses highest testing catalog when no runtime match', () => {
    // Create settings with a non-existent testing runtime
    const settings = new SettingsModel({
      catalogUrl: 'http://example.com/custom.json',
      testingCatalog: { version: '1.0.0', runtime: 'NonExistentRuntime' },
    });

    const normalized = normalizeSettingsForCustomCatalog(settings, {
      name: 'Custom Catalog',
      version: 1,
      definitions: [
        { name: 'Camel Main 4.18.1', runtime: 'Main', version: '4.18.1' },
        { name: 'Citrus 1.0.0', runtime: 'Citrus', version: '1.0.0' },
        { name: 'Citrus 1.0.5', runtime: 'Citrus', version: '1.0.5' },
      ] as CatalogLibrary['definitions'],
    });

    // Should fall back to highest testing catalog when runtime doesn't match
    expect(normalized.testingCatalog).toEqual({ version: '1.0.5', runtime: 'Citrus' });
  });

  it('normalizeSettingsForCustomCatalog falls back to highest when no Main runtime', () => {
    const settings = new SettingsModel({
      catalogUrl: 'http://example.com/custom.json',
      camelCatalog: { version: '', runtime: 'Main' },
    });

    const normalized = normalizeSettingsForCustomCatalog(settings, {
      name: 'Custom Catalog',
      version: 1,
      definitions: [
        { name: 'Camel Quarkus 3.0.0', runtime: 'Quarkus', version: '3.0.0' },
        { name: 'Camel Spring Boot 4.0.0', runtime: 'Spring Boot', version: '4.0.0' },
      ] as CatalogLibrary['definitions'],
    });

    // Should select highest Camel catalog when Main runtime doesn't exist
    expect(normalized.camelCatalog.version).toBe('4.0.0');
    expect(normalized.camelCatalog.runtime).toBe('Spring Boot');
  });

  it('normalizeSettingsForCustomCatalog handles catalog library with undefined definitions', () => {
    const settings = new SettingsModel({
      catalogUrl: 'http://example.com/custom.json',
      camelCatalog: { version: '4.0.0', runtime: 'Main' },
    });

    const catalogLibrary = {
      name: 'Custom Catalog',
      version: 1,
    } as CatalogLibrary;

    const normalized = normalizeSettingsForCustomCatalog(settings, catalogLibrary);

    // Should preserve original settings when definitions is undefined
    expect(normalized.camelCatalog).toEqual({ version: '4.0.0', runtime: 'Main' });
  });

  it('resolveSettingsForCatalogUrl returns settings unchanged for embedded catalog url', async () => {
    const settings = new SettingsModel({
      catalogUrl: CatalogSchemaLoader.DEFAULT_CATALOG_PATH,
    });

    const fetchSpy = jest.spyOn(globalThis, 'fetch');

    const resolved = await resolveSettingsForCatalogUrl(settings);

    expect(resolved).toEqual(new SettingsModel(settings));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('resolveSettingsForCatalogUrl fetches and normalizes custom catalog settings', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      json: async () => ({
        name: 'Custom Catalog',
        version: 1,
        definitions: [
          {
            name: 'Camel Quarkus 4.18.1',
            runtime: 'Quarkus',
            version: '4.18.1',
          },
          {
            name: 'Citrus 4.10.2',
            runtime: 'Citrus',
            version: '4.10.2',
          },
        ] as CatalogLibrary['definitions'],
      }),
    } as unknown as Response);

    const settings = new SettingsModel({
      catalogUrl: 'http://example.com/custom.json',
      camelCatalog: { version: '0.0.1', runtime: 'Quarkus' },
      testingCatalog: { version: '0.0.1', runtime: 'Citrus' },
    });

    const resolved = await resolveSettingsForCatalogUrl(settings);

    expect(resolved.camelCatalog).toEqual({ version: '4.18.1', runtime: 'Quarkus' });
    expect(resolved.testingCatalog).toEqual({ version: '4.10.2', runtime: 'Citrus' });
  });
});
