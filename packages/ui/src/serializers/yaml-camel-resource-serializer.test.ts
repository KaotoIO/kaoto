import { CamelYamlDsl } from '@kaoto/camel-catalog/types';

import { CamelRouteResource } from '../models/camel';
import { camelRouteJson, camelRouteYaml } from '../stubs';
import { YamlCamelResourceSerializer } from './yaml-camel-resource-serializer';

describe('YamlCamelResourceSerializer', () => {
  let serializer: YamlCamelResourceSerializer;

  beforeEach(() => {
    serializer = new YamlCamelResourceSerializer();
  });

  it('parses YAML code into JSON object', async () => {
    const result = await serializer.parse(camelRouteYaml);
    expect(result).toEqual([camelRouteJson]);
  });

  it('returns empty array for empty or non-string input in parse', async () => {
    expect(await serializer.parse('')).toEqual([]);
    expect(await serializer.parse(null as unknown as string)).toEqual([]);
    expect(await serializer.parse(123 as unknown as string)).toEqual([]);
  });

  it('includes comments in serialized YAML string', async () => {
    const entities = await serializer.parse('# comment1\n' + camelRouteYaml);
    expect(serializer.comments.includes(' comment1')).toBeTruthy();

    serializer.comments.push('Comment2');
    const result = serializer.serialize(new CamelRouteResource(entities as CamelYamlDsl));
    expect(result).toContain('#Comment2');
  });

  it('includes comments in  YAML string', async () => {
    const entities = await serializer.parse('# comment1\n' + camelRouteYaml);
    expect(serializer.comments.includes(' comment1')).toBeTruthy();

    serializer.comments.push('# Comment2');
    const result = serializer.serialize(new CamelRouteResource(entities as CamelYamlDsl));
    expect(result.includes(' Comment2')).toBeTruthy();
    expect(result.includes('comment1')).toBeTruthy();
  });
});
