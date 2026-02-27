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
    ['my.camel.xml', SourceSchemaType.Route],
    ['camel.xml', SourceSchemaType.Route],
    ['my.yaml', SourceSchemaType.Route],
    ['.yaml', SourceSchemaType.Route],
    ['my.citrus.test.yaml', SourceSchemaType.Test],
    ['my-test.citrus.yaml', SourceSchemaType.Test],
    ['my-test.citrus.yml', SourceSchemaType.Test],
    ['my.citrus.test.xml', SourceSchemaType.Test],
    ['my-test.citrus.xml', SourceSchemaType.Test],
    ['my.citrus.it.yaml', SourceSchemaType.Test],
    ['my.citrus.it.yml', SourceSchemaType.Test],
    ['my-it.citrus.yaml', SourceSchemaType.Test],
    ['my-it.citrus.yml', SourceSchemaType.Test],
    ['my.citrus.it.xml', SourceSchemaType.Test],
    ['my-it.citrus.xml', SourceSchemaType.Test],
    ['yaml', undefined],
    ['yml', undefined],
    ['my.json', undefined],
    ['my.txt', undefined],
  ];

  it.each(cases)('receving %s should return %s', (path, expected) => {
    expect(getResourceTypeFromPath(path)).toEqual(expected);
  });
});
