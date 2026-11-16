import { fetchStarterTemplate, resolveStarterTemplate } from './starter-templates';

const ROUTE = `- route:
    id: route-__KAOTO_ID__
    from:
      id: from-__KAOTO_ID__
      uri: timer:yaml
`;

const KAMELET = `apiVersion: camel.apache.org/v1
kind: Kamelet
metadata:
  name: kamelet-source-__KAOTO_ID__
spec:
  template:
    from:
      uri: timer:tick
`;

/** Makes `crypto.getRandomValues` fill a Uint32Array with the given values */
const stubRandomValues = (next: () => number) => {
  vi.stubGlobal('crypto', {
    getRandomValues: (array: Uint32Array) => array.fill(next()),
  });
};

describe('resolveStarterTemplate', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('gives every placeholder an id of its own', () => {
    const ids = [1234, 5678];
    stubRandomValues(() => ids.shift()!);

    expect(resolveStarterTemplate(ROUTE, 'my-route.camel.yaml')).toBe(`- route:
    id: route-1234
    from:
      id: from-5678
      uri: timer:yaml
`);
  });

  it('pads the ids to four digits', () => {
    stubRandomValues(() => 10_007);

    expect(resolveStarterTemplate('id: __KAOTO_ID__', 'a.camel.yaml')).toBe('id: 0007');
  });

  it('names a Kamelet after its file', () => {
    const resolved = resolveStarterTemplate(KAMELET, 'my-source.kamelet.yaml');

    expect(resolved).toContain('metadata:\n  name: my-source\n');
    expect(resolved).not.toContain('__KAOTO_ID__');
  });

  it('does not rename a nested name', () => {
    const resolved = resolveStarterTemplate('spec:\n  ref:\n    name: ref-__KAOTO_ID__\n', 'a.pipe.yaml');

    expect(resolved).not.toContain('name: a\n');
    expect(resolved).toMatch(/name: ref-\d{4}/);
  });
});

describe('fetchStarterTemplate', () => {
  const responses = new Map<string, Response>();
  const fetchMock = vi.fn((input: URL) =>
    Promise.resolve(responses.get(input.href) ?? new Response(null, { status: 404 })),
  );

  beforeEach(() => {
    responses.clear();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const serve = (path: string, body: unknown) => {
    const url = new URL(path, globalThis.location.href).href;
    responses.set(url, new Response(typeof body === 'string' ? body : JSON.stringify(body)));
  };

  it('follows the catalog index and the templates manifest to the template file', async () => {
    serve('/camel-catalog/index.json', { starterTemplates: 'starter-templates/index-1.json' });
    serve('/camel-catalog/starter-templates/index-1.json', {
      catalogs: { 'pipe-yaml': { file: 'pipe-pipe-2.yaml' } },
    });
    serve('/camel-catalog/starter-templates/pipe-pipe-2.yaml', 'kind: Pipe\n');

    expect(await fetchStarterTemplate('/camel-catalog/index.json', 'pipe-yaml')).toBe('kind: Pipe\n');
  });

  it('rejects when the catalog has no starter templates', async () => {
    serve('/camel-catalog/index.json', {});

    await expect(fetchStarterTemplate('/camel-catalog/index.json', 'pipe-yaml')).rejects.toThrow(
      'The catalog has no starter templates',
    );
  });

  it('rejects when the manifest has no such template', async () => {
    serve('/camel-catalog/index.json', { starterTemplates: 'starter-templates/index-1.json' });
    serve('/camel-catalog/starter-templates/index-1.json', { catalogs: {} });

    await expect(fetchStarterTemplate('/camel-catalog/index.json', 'pipe-yaml')).rejects.toThrow(
      'The catalog has no starter template pipe-yaml',
    );
  });

  it('rejects when the server answers with the page of the app', async () => {
    serve('/camel-catalog/index.json', { starterTemplates: 'starter-templates/index-1.json' });
    serve('/camel-catalog/starter-templates/index-1.json', {
      catalogs: { 'pipe-yaml': { file: 'pipe-pipe-2.yaml' } },
    });
    responses.set(
      new URL('/camel-catalog/starter-templates/pipe-pipe-2.yaml', globalThis.location.href).href,
      new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } }),
    );

    await expect(fetchStarterTemplate('/camel-catalog/index.json', 'pipe-yaml')).rejects.toThrow(
      'Could not load /camel-catalog/starter-templates/pipe-pipe-2.yaml (not found)',
    );
  });

  it('rejects when a file cannot be loaded', async () => {
    await expect(fetchStarterTemplate('/camel-catalog/index.json', 'pipe-yaml')).rejects.toThrow(
      'Could not load /camel-catalog/index.json (404)',
    );
  });
});
