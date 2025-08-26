import { getResourceTypeFromPath, SourceSchemaType } from './source-schema-type';

describe('getResourceTypeFromPath', () => {
  const cases: [string, SourceSchemaType | undefined][] = [
    ['my.integration.yaml', SourceSchemaType.Integration],
    ['my.integration.yml', SourceSchemaType.Integration],
    ['integration.yml', SourceSchemaType.Integration],
    ['my.kamelet-binding.yaml', SourceSchemaType.KameletBinding],
    ['my.kamelet-binding.yml', SourceSchemaType.KameletBinding],
    ['kamelet-binding.yml', SourceSchemaType.KameletBinding],
    ['my.kamelet.yaml', SourceSchemaType.Kamelet],
    ['my.kamelet.yml', SourceSchemaType.Kamelet],
    ['kamelet.yml', SourceSchemaType.Kamelet],
    ['my.pipe.yaml', SourceSchemaType.Pipe],
    ['my.pipe.yml', SourceSchemaType.Pipe],
    ['pipe.yaml', SourceSchemaType.Pipe],
    ['my.camel.xml', SourceSchemaType.RouteYAML],
    ['camel.xml', SourceSchemaType.RouteYAML],
    ['my.yaml', SourceSchemaType.RouteYAML],
    ['.yaml', SourceSchemaType.RouteYAML],
    ['yaml', undefined],
    ['yml', undefined],
    ['my.json', undefined],
    ['my.txt', undefined],
  ];

  it.each(cases)('receving %s should return %s', (path, expected) => {
    expect(getResourceTypeFromPath(path)).toEqual(expected);
  });
});
