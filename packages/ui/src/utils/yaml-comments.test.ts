import { insertYamlComments, parseYamlComments } from './yaml-comments';

describe('yaml-comments', () => {
  it('parses leading comment lines and stops at the first non-comment line', () => {
    const code = ['# first', '  # indented', '', 'route:', '# not-leading'].join('\n');
    expect(parseYamlComments(code)).toEqual([' first', '   indented', '']);
  });

  it('re-inserts comments above the document', () => {
    const result = insertYamlComments('route: {}\n', [' hello']);
    expect(result).toBe('# hello\nroute: {}\n');
  });
});
