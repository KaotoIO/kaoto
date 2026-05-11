import { SourceSchemaType } from './source-schema-type';

/**
 * Registry mapping each resource schema type to the catalog runtimes it is
 * compatible with. This is the single source of truth for the "which catalog
 * goes with which resource" decision.
 *
 * Runtime strings match `CatalogLibraryEntry.runtime` values used by the
 * catalog library index.
 */
export const COMPATIBLE_RUNTIMES_BY_SCHEMA_TYPE: Record<SourceSchemaType, readonly string[]> = {
  [SourceSchemaType.Route]: ['Main', 'Quarkus', 'Spring Boot'],
  [SourceSchemaType.Integration]: ['Main', 'Quarkus', 'Spring Boot'],
  [SourceSchemaType.Kamelet]: ['Main', 'Quarkus', 'Spring Boot'],
  [SourceSchemaType.Pipe]: ['Main', 'Quarkus', 'Spring Boot'],
  [SourceSchemaType.KameletBinding]: ['Main', 'Quarkus', 'Spring Boot'],
  [SourceSchemaType.Test]: ['Citrus'],
};
