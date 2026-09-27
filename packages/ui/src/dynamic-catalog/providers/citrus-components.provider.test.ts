import { stringify } from 'yaml';

import { CatalogKind, FileTypes } from '../../models';
import { DynamicCatalog } from '../dynamic-catalog';
import { CitrusTestActionTemplatesProvider } from './citrus-components.provider';

describe('CitrusTestActionTemplatesProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns no templates without a host callback', async () => {
    await expect(new CitrusTestActionTemplatesProvider().fetchAll()).resolves.toEqual({});
  });

  it('extracts metadata and explicit ordered scalar parameters without copying actions', async () => {
    const parameters = [
      { name: 'region', value: '${region}' },
      { name: 'attempts', value: 0 },
      { name: 'enabled', value: false },
      { name: 'optional', value: null },
    ];
    const client = vi.fn().mockResolvedValue([
      {
        filename: 'prepare-order.citrus.yaml',
        content: stringify({
          name: 'prepare-order',
          description: 'Prepare an order',
          parameters,
          actions: [{ print: { message: '${undeclared}' } }],
        }),
      },
    ]);
    const provider = new CitrusTestActionTemplatesProvider(client);

    await expect(provider.fetchAll()).resolves.toEqual({
      'prepare-order': {
        kind: CatalogKind.TestActionTemplate,
        name: 'prepare-order',
        description: 'Prepare an order',
        parameters,
      },
    });
    expect(client).toHaveBeenCalledWith(FileTypes.CitrusTemplates);
  });

  it.each([
    ': invalid: yaml: {[',
    'null',
    'name: 123',
    "name: ''",
    'name: demo\ndescription: true',
    'name: demo\nparameters: {}',
    'name: demo\nparameters: [{name: input}]',
    'name: demo\nparameters: [{name: input, value: {nested: object}}]',
  ])('skips malformed templates and still reads valid documents: %s', async (content) => {
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {});
    const provider = new CitrusTestActionTemplatesProvider(async () => [
      { filename: 'bad.citrus.yaml', content },
      { filename: 'valid.citrus.yaml', content: 'name: valid\nactions: []' },
    ]);

    await expect(provider.fetchAll()).resolves.toEqual({
      valid: { kind: CatalogKind.TestActionTemplate, name: 'valid' },
    });
    expect(diagnostic).toHaveBeenCalledWith('Error parsing Citrus template bad.citrus.yaml', expect.any(Error));
  });

  it('uses the last document when names are duplicated', async () => {
    const provider = new CitrusTestActionTemplatesProvider(async () => [
      { filename: 'first.yaml', content: 'name: demo\ndescription: First' },
      { filename: 'last.yaml', content: 'name: demo\ndescription: Last' },
    ]);

    await expect(provider.fetch('demo')).resolves.toEqual({
      kind: CatalogKind.TestActionTemplate,
      name: 'demo',
      description: 'Last',
    });
    await expect(provider.fetch('missing')).resolves.toBeUndefined();
  });

  it('refreshes changed templates and removes deleted templates', async () => {
    const client = vi
      .fn()
      .mockResolvedValueOnce([{ filename: 'demo.yaml', content: 'name: demo\ndescription: First' }])
      .mockResolvedValueOnce([{ filename: 'demo.yaml', content: 'name: demo\ndescription: Updated' }])
      .mockResolvedValue([]);
    const catalog = new DynamicCatalog(new CitrusTestActionTemplatesProvider(client));

    await expect(catalog.getAll()).resolves.toHaveProperty('demo.description', 'First');
    await expect(catalog.get('demo', { forceFresh: true })).resolves.toHaveProperty('description', 'Updated');
    await expect(catalog.getAll({ forceFresh: true })).resolves.toEqual({});
    await expect(catalog.get('demo')).resolves.toBeUndefined();
  });

  it.each(['constructor', '__proto__'])(
    'does not return inherited entries for a removed template named %s',
    async (name) => {
      const client = vi
        .fn()
        .mockResolvedValueOnce([{ filename: 'template.yaml', content: stringify({ name }) }])
        .mockResolvedValue([]);
      const catalog = new DynamicCatalog(new CitrusTestActionTemplatesProvider(client));

      await expect(catalog.get(name)).resolves.toEqual({ kind: CatalogKind.TestActionTemplate, name });
      await expect(catalog.get(name, { forceFresh: true })).resolves.toBeUndefined();
      await expect(catalog.get(name)).resolves.toBeUndefined();
    },
  );

  it('propagates host errors so a failed fresh lookup cannot return a stale template', async () => {
    const error = new Error('Host unavailable');
    const client = vi.fn().mockRejectedValue(error);

    await expect(new CitrusTestActionTemplatesProvider(client).fetch('demo')).rejects.toThrow(error);
  });
});
