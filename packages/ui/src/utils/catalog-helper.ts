import { CatalogLibrary, CatalogLibraryEntry } from '@kaoto/camel-catalog/types';

import { SourceSchemaType } from '../models/camel';
import { CAMEL_MAIN_RUNTIME, CAMEL_RUNTIMES, TEST_RUNTIMES } from '../models/catalog-runtime-types';
import { CatalogVersion, ISettingsModel, SettingsModel } from '../models/settings/settings.model';
import { CatalogSchemaLoader } from './catalog-schema-loader';
import { versionCompare } from './version-compare';

/**
 * Check if a runtime is a Camel runtime (Main, Quarkus, Spring Boot)
 */
const isCamelRuntime = (runtime: string): boolean => {
  return (CAMEL_RUNTIMES as readonly string[]).includes(runtime);
};

/**
 * Check if a runtime is a test runtime (Citrus)
 */
export const isTestRuntime = (runtime: string): boolean => {
  return (TEST_RUNTIMES as readonly string[]).includes(runtime);
};

/**
 * Finds the appropriate catalog for a given source schema type based on user settings.
 *
 * For test source types (SourceSchemaType.Test), uses the testingCatalog settings.
 * For other source types, uses the camelCatalog settings.
 * Falls back to the highest available catalog of the appropriate runtime type if exact match not found.
 *
 * @param sourceType - The source schema type to find a catalog for
 * @param catalogLibrary - The catalog library containing available catalogs
 * @param camelCatalog - The user's preferred Camel catalog settings
 * @param testingCatalog - The user's preferred testing catalog settings
 * @returns The matching catalog entry or undefined if not found or library is unavailable
 */
const sortCatalogsByVersionDescending = (catalogs: CatalogLibraryEntry[]) =>
  [...catalogs].sort((c1: CatalogLibraryEntry, c2: CatalogLibraryEntry) => versionCompare(c1.version, c2.version));

const getHighestCatalog = (catalogs: CatalogLibraryEntry[]): CatalogLibraryEntry | undefined => {
  return sortCatalogsByVersionDescending(catalogs)[0];
};

const getHighestRuntimeCatalog = (
  catalogs: CatalogLibraryEntry[],
  runtime: string,
): CatalogLibraryEntry | undefined => {
  return getHighestCatalog(catalogs.filter((catalog) => catalog.runtime === runtime));
};

/**
 * Checks if a catalog is a Red Hat version.
 * Red Hat versions follow the pattern: x.y.z.redhat-nnnnn
 * Examples: "4.18.1.redhat-00001", "3.2.0.redhat-12345"
 */
const isRedHatCatalog = (catalog: CatalogLibraryEntry): boolean => {
  return /\.redhat-\d+$/.test(catalog.version);
};

/**
 * Gets the highest Red Hat catalog for a given runtime
 */
const getHighestRedHatRuntimeCatalog = (
  catalogs: CatalogLibraryEntry[],
  runtime: string,
): CatalogLibraryEntry | undefined => {
  const redHatCatalogs = catalogs.filter((c) => c.runtime === runtime && isRedHatCatalog(c));
  return getHighestCatalog(redHatCatalogs);
};

/**
 * Selects the default catalog for a given runtime.
 *
 * For Camel Main runtime, prioritizes Red Hat builds over community versions
 * to provide enterprise-friendly defaults. Falls back to community versions
 * if no Red Hat build is available.
 *
 * For other runtimes (Quarkus, Spring Boot, Citrus), returns the highest
 * version available.
 *
 * @param catalogs - Available catalog entries to select from
 * @param runtime - The target runtime (e.g., "Main", "Quarkus", "Spring Boot", "Citrus")
 * @returns The default catalog entry for the runtime, or undefined if no match found
 *
 * @example
 * // Returns Red Hat Main catalog if available
 * const catalog = selectDefaultCatalogForRuntime(allCatalogs, 'Main');
 * // catalog.version might be "4.18.1.redhat-00001"
 */
export const selectDefaultCatalogForRuntime = (
  catalogs: CatalogLibraryEntry[],
  runtime: string,
): CatalogLibraryEntry | undefined => {
  // For Camel Main runtime, prioritize Red Hat versions
  if (runtime === CAMEL_MAIN_RUNTIME) {
    const redHatMainCatalog = getHighestRedHatRuntimeCatalog(catalogs, runtime);
    if (redHatMainCatalog) {
      return redHatMainCatalog;
    }
    // Fall back to highest Main version (community) if no Red Hat version
    return getHighestRuntimeCatalog(catalogs, runtime);
  }

  // For other runtimes, return highest version
  return getHighestRuntimeCatalog(catalogs, runtime);
};

const selectCatalogBySettings = (
  catalogs: CatalogLibraryEntry[],
  settingsCatalog?: CatalogVersion,
): CatalogLibraryEntry | undefined => {
  if (!settingsCatalog || catalogs.length === 0) {
    return undefined;
  }

  // If version is empty, use default selection logic (prioritize Red Hat for Main runtime)
  if (settingsCatalog.version === '') {
    return selectDefaultCatalogForRuntime(catalogs, settingsCatalog.runtime);
  }

  // Try to find exact match by version and runtime
  const exactMatch = catalogs.find(
    (c) => c.version === settingsCatalog.version && c.runtime === settingsCatalog.runtime,
  );
  if (exactMatch) {
    return exactMatch;
  }

  // Fallback to default selection logic if exact version not found
  return selectDefaultCatalogForRuntime(catalogs, settingsCatalog.runtime);
};

const getCamelCatalogs = (catalogLibrary?: CatalogLibrary) =>
  (catalogLibrary?.definitions ?? []).filter((c: CatalogLibraryEntry) => isCamelRuntime(c.runtime));

const getTestingCatalogs = (catalogLibrary?: CatalogLibrary) =>
  (catalogLibrary?.definitions ?? []).filter((c: CatalogLibraryEntry) => isTestRuntime(c.runtime));

const isEmbeddedCatalogUrl = (catalogUrl: string) => {
  return catalogUrl === '' || catalogUrl === CatalogSchemaLoader.DEFAULT_CATALOG_PATH;
};

export const findCatalog = (
  sourceType: SourceSchemaType,
  catalogLibrary?: CatalogLibrary,
  camelCatalog?: CatalogVersion,
  testingCatalog?: CatalogVersion,
) => {
  if (!catalogLibrary) {
    return undefined;
  }

  const isTest = sourceType === SourceSchemaType.Test;
  const scopedCatalogs = isTest ? getTestingCatalogs(catalogLibrary) : getCamelCatalogs(catalogLibrary);
  const settingsCatalog = isTest ? testingCatalog : camelCatalog;

  const preferredCatalog = selectCatalogBySettings(scopedCatalogs, settingsCatalog);
  if (preferredCatalog) {
    return preferredCatalog;
  }

  return getHighestCatalog(scopedCatalogs);
};

const selectDefaultCamelCatalog = (catalogLibrary: CatalogLibrary): CatalogLibraryEntry | undefined => {
  const camelCatalogs = getCamelCatalogs(catalogLibrary);
  return selectDefaultCatalogForRuntime(camelCatalogs, CAMEL_MAIN_RUNTIME) ?? getHighestCatalog(camelCatalogs);
};

const selectHighestTestingCatalog = (catalogLibrary: CatalogLibrary): CatalogLibraryEntry | undefined => {
  return getHighestCatalog(getTestingCatalogs(catalogLibrary));
};

export const normalizeSettingsForCustomCatalog = (
  currentSettings: ISettingsModel,
  catalogLibrary: CatalogLibrary,
): ISettingsModel => {
  const normalizedSettings = new SettingsModel(currentSettings);

  const customCamelCatalogs = getCamelCatalogs(catalogLibrary);
  if (customCamelCatalogs.length > 0) {
    const preferredCamelCatalog =
      selectCatalogBySettings(customCamelCatalogs, currentSettings.camelCatalog) ??
      selectDefaultCamelCatalog(catalogLibrary);

    if (preferredCamelCatalog) {
      normalizedSettings.camelCatalog = {
        version: preferredCamelCatalog.version,
        runtime: preferredCamelCatalog.runtime,
      };
    }
  }

  const customTestingCatalogs = getTestingCatalogs(catalogLibrary);
  if (customTestingCatalogs.length > 0) {
    const preferredTestingCatalog =
      selectCatalogBySettings(customTestingCatalogs, currentSettings.testingCatalog) ??
      selectHighestTestingCatalog(catalogLibrary);

    if (preferredTestingCatalog) {
      normalizedSettings.testingCatalog = {
        version: preferredTestingCatalog.version,
        runtime: preferredTestingCatalog.runtime,
      };
    }
  }

  return normalizedSettings;
};

export const resolveSettingsForCatalogUrl = async (settings: ISettingsModel): Promise<ISettingsModel> => {
  if (isEmbeddedCatalogUrl(settings.catalogUrl)) {
    return new SettingsModel(settings);
  }

  const response = await fetch(settings.catalogUrl);
  const catalogLibrary = (await response.json()) as CatalogLibrary;

  return normalizeSettingsForCustomCatalog(settings, catalogLibrary);
};

/**
 * Determines if a catalog change is required based on the source type and current catalog.
 *
 * A catalog change is required when:
 * - The current catalog is a test runtime but the source type is not Test
 * - The current catalog is not a test runtime but the source type is Test
 *
 * @param sourceType - The source schema type being used
 * @param catalog - The currently active catalog
 * @returns True if a catalog change is required, false otherwise
 */
export const requiresCatalogChange = (sourceType: SourceSchemaType, catalog?: CatalogLibraryEntry) => {
  if (!catalog?.runtime) return false;

  const isTestCatalog = isTestRuntime(catalog.runtime);
  const isTestSource = sourceType === SourceSchemaType.Test;

  return isTestCatalog !== isTestSource;
};
