import { extractGroup } from './get-tagged-field-from-string';

describe('getTaggedFieldFromString', () => {
  it.each([
    ['producer', 'group:producer', 'group'],
    ['consumer', 'group:consumer', 'group'],
    ['common', 'group:common', 'group'],
    ['consumer (advanced)', 'group:consumer (advanced)', 'group'],
    ['java.util.List<String>', 'bean:java.util.List<String>', 'bean'],
    ['String', 'bean:String', 'bean'],
    ['common', 'group:common|bean:String', 'group'],
    ['common (advanced)', 'group:common (advanced)|bean:String', 'group'],
    ['String', 'group:common|bean:String', 'bean'],
    ['String', 'group:common (advanced)|bean:String', 'bean'],
  ])('should return `%s` from `%s` string, when requesting `%s`', (expected, input, tag) => {
    const result = extractGroup(tag, input);

    expect(result).toEqual(expected);
  });
});
