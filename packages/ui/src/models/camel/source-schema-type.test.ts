import { getResourceTypeFromPath, SourceSchemaType } from './source-schema-type';

describe('getResourceTypeFromPath', () => {
  const cases: [string, SourceSchemaType][] = [
    ['my.integration.yaml', SourceSchemaType.Integration],
    ['my.kamelet-binding.yaml', SourceSchemaType.KameletBinding],
    ['my.kamelet.yaml', SourceSchemaType.Kamelet],
    ['my.pipe.yaml', SourceSchemaType.Pipe],
    ['my.camel.xml', SourceSchemaType.Route],
    ['my.yaml', SourceSchemaType.Route],
    ['my.json', SourceSchemaType.Route],
    ['my.txt', SourceSchemaType.Route],
  ];

  it.each(cases)('should return %s for %s', (path, expected) => {
    expect(getResourceTypeFromPath(path)).toEqual(expected);
  });
});
