import { YamlCamelResourceSerializer } from './yaml-camel-resource-serializer';
import { camelRouteJson, camelRouteYaml } from '../stubs';
import { CamelRouteResource } from '../models/camel';

describe('YamlCamelResourceSerializer', () => {
  let serializer: YamlCamelResourceSerializer;

  beforeEach(() => {
    serializer = new YamlCamelResourceSerializer();
  });

  it('parses YAML code into JSON object', () => {
    const result = serializer.parse(camelRouteYaml);
    expect(result).toEqual([camelRouteJson]);
  });

  it('returns empty array for empty or non-string input in parse', () => {
    expect(serializer.parse('')).toEqual([]);
    expect(serializer.parse(null as unknown as string)).toEqual([]);
    expect(serializer.parse(123 as unknown as string)).toEqual([]);
  });

  it('includes comments in serialized YAML string', () => {
    const entities = serializer.parse('# comment1\n' + camelRouteYaml);
    console.log(serializer.comments);
    expect(serializer.comments.includes('# comment1')).toBeTruthy();

    serializer.comments.push('# Comment2');
    const result = serializer.serialize(new CamelRouteResource(entities));
    expect(result).toContain('# Comment2');
  });
});
