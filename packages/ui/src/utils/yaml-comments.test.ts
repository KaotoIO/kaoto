import { insertYamlComments, parseYamlComments } from './yaml-comments';

describe('yaml-comments', () => {
  it('parses leading comment lines and stops at the first non-comment line', () => {
    const code = ['# first', '  # indented', '', 'route:', '# not-leading'].join('\n');
    expect(parseYamlComments(code)).toEqual(['# first', '  # indented', '']);
  });

  it('re-inserts comments above the document', () => {
    const result = insertYamlComments('route: {}\n', ['# hello']);
    expect(result).toBe('# hello\nroute: {}\n');
  });

  it('preserves multi-hash prefixes during round-trip', () => {
    const code = ['## heading', '# normal', '', 'route: {}'].join('\n');
    const comments = parseYamlComments(code);
    expect(comments).toEqual(['## heading', '# normal', '']);
    const restored = insertYamlComments('route: {}', comments);
    expect(restored).toBe('## heading\n# normal\n\nroute: {}');
  });

  it('preserves empty lines between leading comments during round-trip', () => {
    const code = ['# top', '', '# bottom', '', 'route: {}'].join('\n');
    const comments = parseYamlComments(code);
    expect(comments).toEqual(['# top', '', '# bottom', '']);
    const restored = insertYamlComments('route: {}', comments);
    expect(restored).toBe('# top\n\n# bottom\n\nroute: {}');
  });
});
