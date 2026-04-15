import { CatalogLibraryEntry } from '@kaoto/camel-catalog/types';

import { SourceSchemaType } from '../models/camel';
import { LocalStorageKeys } from '../models/local-storage-keys';
import { getPersistedCatalog, readCatalogMap, setPersistedCatalog, writeCatalogMap } from './catalog-storage';

const camelEntry: CatalogLibraryEntry = {
  name: 'Camel Main 1.0.0',
  runtime: 'Main',
  version: '1.0.0',
  fileName: 'camel-main/index.js',
};

const citrusEntry: CatalogLibraryEntry = {
  name: 'Citrus 1.0.0',
  runtime: 'Citrus',
  version: '1.0.0',
  fileName: 'citrus/index.js',
};

describe('catalog-storage — readCatalogMap', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns an empty map when localStorage is empty', () => {
    expect(readCatalogMap()).toEqual({});
  });

  it('returns an empty map when the stored JSON is malformed', () => {
    localStorage.setItem(LocalStorageKeys.SelectedCatalog, '{not-json');
    expect(readCatalogMap()).toEqual({});
  });

  it('returns an empty map when the stored value is the legacy single-entry shape', () => {
    localStorage.setItem(LocalStorageKeys.SelectedCatalog, JSON.stringify(camelEntry));
    expect(readCatalogMap()).toEqual({});
  });

  it('returns the stored map when the value is the new shape', () => {
    const stored = {
      [SourceSchemaType.Route]: camelEntry,
      [SourceSchemaType.Test]: citrusEntry,
    };
    localStorage.setItem(LocalStorageKeys.SelectedCatalog, JSON.stringify(stored));
    expect(readCatalogMap()).toEqual(stored);
  });
});

describe('catalog-storage — getPersistedCatalog', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns undefined when no entry exists for the requested type', () => {
    expect(getPersistedCatalog(SourceSchemaType.Route)).toBeUndefined();
  });

  it('returns the stored entry for the requested type', () => {
    localStorage.setItem(LocalStorageKeys.SelectedCatalog, JSON.stringify({ [SourceSchemaType.Test]: citrusEntry }));
    expect(getPersistedCatalog(SourceSchemaType.Test)).toEqual(citrusEntry);
  });

  it('returns undefined when the legacy single-entry shape is stored', () => {
    localStorage.setItem(LocalStorageKeys.SelectedCatalog, JSON.stringify(camelEntry));
    expect(getPersistedCatalog(SourceSchemaType.Route)).toBeUndefined();
  });
});

describe('catalog-storage — writeCatalogMap', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('serializes the map to localStorage', () => {
    writeCatalogMap({ [SourceSchemaType.Route]: camelEntry });
    expect(localStorage.getItem(LocalStorageKeys.SelectedCatalog)).toEqual(
      JSON.stringify({ [SourceSchemaType.Route]: camelEntry }),
    );
  });
});

describe('catalog-storage — setPersistedCatalog', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates the map when none exists', () => {
    setPersistedCatalog(SourceSchemaType.Route, camelEntry);
    expect(readCatalogMap()).toEqual({ [SourceSchemaType.Route]: camelEntry });
  });

  it('merges into the existing map without clobbering other keys', () => {
    setPersistedCatalog(SourceSchemaType.Route, camelEntry);
    setPersistedCatalog(SourceSchemaType.Test, citrusEntry);
    expect(readCatalogMap()).toEqual({
      [SourceSchemaType.Route]: camelEntry,
      [SourceSchemaType.Test]: citrusEntry,
    });
  });

  it('overwrites an existing entry for the same type', () => {
    const olderCamel: CatalogLibraryEntry = { ...camelEntry, version: '0.9.0', name: 'Camel Main 0.9.0' };
    setPersistedCatalog(SourceSchemaType.Route, olderCamel);
    setPersistedCatalog(SourceSchemaType.Route, camelEntry);
    expect(readCatalogMap()).toEqual({ [SourceSchemaType.Route]: camelEntry });
  });

  it('overwrites the legacy single-entry shape when writing a new entry', () => {
    localStorage.setItem(LocalStorageKeys.SelectedCatalog, JSON.stringify(camelEntry));
    setPersistedCatalog(SourceSchemaType.Route, camelEntry);
    expect(readCatalogMap()).toEqual({ [SourceSchemaType.Route]: camelEntry });
  });
});
