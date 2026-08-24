import { StarterTemplatesProvider } from './starter-templates.provider';

const EMBEDDED: Record<string, string> = {
  'camel-route-yaml': 'route: yaml template __KAOTO_ID__',
  'pipe-yaml': 'pipe: template __KAOTO_ID__',
};

describe('StarterTemplatesProvider', () => {
  let provider: StarterTemplatesProvider;

  beforeEach(() => {
    provider = new StarterTemplatesProvider(EMBEDDED);
  });

  it('has a stable id', () => {
    expect(provider.id).toBe('starter-templates-provider');
  });

  it('fetch returns the raw string for a known key', async () => {
    const result = await provider.fetch('camel-route-yaml');
    expect(result).toBe('route: yaml template __KAOTO_ID__');
  });

  it('fetch returns undefined for an unknown key', async () => {
    const result = await provider.fetch('does-not-exist');
    expect(result).toBeUndefined();
  });

  it('fetchAll returns all embedded templates', async () => {
    const result = await provider.fetchAll();
    expect(result).toEqual(EMBEDDED);
  });

  it('fetchAll returns empty object when constructed with no args', async () => {
    const empty = new StarterTemplatesProvider();
    const result = await empty.fetchAll();
    expect(result).toEqual({});
  });
});
