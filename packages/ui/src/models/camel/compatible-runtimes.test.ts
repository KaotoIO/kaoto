import { COMPATIBLE_RUNTIMES_BY_SCHEMA_TYPE } from './compatible-runtimes';
import { SourceSchemaType } from './source-schema-type';

describe('COMPATIBLE_RUNTIMES_BY_SCHEMA_TYPE', () => {
  it('has a non-empty entry for every SourceSchemaType enum value', () => {
    for (const type of Object.values(SourceSchemaType)) {
      const entry = COMPATIBLE_RUNTIMES_BY_SCHEMA_TYPE[type];
      expect(entry).toBeDefined();
      expect(entry.length).toBeGreaterThan(0);
    }
  });

  it('maps Test to Citrus only', () => {
    expect(COMPATIBLE_RUNTIMES_BY_SCHEMA_TYPE[SourceSchemaType.Test]).toEqual(['Citrus']);
  });

  it('maps Camel-family types to the same set of runtimes', () => {
    const camelFamily = [
      SourceSchemaType.Route,
      SourceSchemaType.Integration,
      SourceSchemaType.Kamelet,
      SourceSchemaType.Pipe,
      SourceSchemaType.KameletBinding,
    ];
    const expected = ['Main', 'Quarkus', 'Spring Boot'];
    for (const type of camelFamily) {
      expect(COMPATIBLE_RUNTIMES_BY_SCHEMA_TYPE[type]).toEqual(expected);
    }
  });
});
