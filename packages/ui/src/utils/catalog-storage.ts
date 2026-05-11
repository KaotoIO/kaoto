import { CatalogLibraryEntry } from '@kaoto/camel-catalog/types';

import { SourceSchemaType } from '../models/camel';
import { LocalStorageKeys } from '../models/local-storage-keys';

export type CatalogMap = Partial<Record<SourceSchemaType, CatalogLibraryEntry>>;

const isLegacyEntry = (value: unknown): boolean => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.name === 'string' && typeof candidate.version === 'string';
};

export const readCatalogMap = (): CatalogMap => {
  const raw = localStorage.getItem(LocalStorageKeys.SelectedCatalog);
  if (raw === null) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }

  if (typeof parsed !== 'object' || parsed === null) return {};
  if (isLegacyEntry(parsed)) return {};

  return parsed as CatalogMap;
};

export const getPersistedCatalog = (sourceType: SourceSchemaType): CatalogLibraryEntry | undefined => {
  return readCatalogMap()[sourceType];
};

export const writeCatalogMap = (map: CatalogMap): void => {
  localStorage.setItem(LocalStorageKeys.SelectedCatalog, JSON.stringify(map));
};

export const setPersistedCatalog = (sourceType: SourceSchemaType, entry: CatalogLibraryEntry): void => {
  const current = readCatalogMap();
  writeCatalogMap({ ...current, [sourceType]: entry });
};
