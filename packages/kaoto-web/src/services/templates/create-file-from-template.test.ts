import { NewFile, StoredFile } from '../files/stored-file';
import { createFileFromTemplate } from './create-file-from-template';

const CATALOG_URL = '/camel-catalog/index.json';

const KAMELET = `apiVersion: camel.apache.org/v1
kind: Kamelet
metadata:
  name: kamelet-source-__KAOTO_ID__
`;

describe('createFileFromTemplate', () => {
  const responses = new Map<string, Response>();
  const createFile = vi.fn(
    (file: NewFile): Promise<StoredFile> => Promise.resolve({ id: 'new-id', createdAt: 1, updatedAt: 1, ...file }),
  );

  const serve = (path: string, body: unknown) => {
    const url = new URL(path, globalThis.location.href).href;
    responses.set(url, new Response(typeof body === 'string' ? body : JSON.stringify(body)));
  };

  beforeEach(() => {
    createFile.mockClear();
    responses.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn((input: URL) => Promise.resolve(responses.get(input.href) ?? new Response(null, { status: 404 }))),
    );
    serve(CATALOG_URL, { starterTemplates: 'starter-templates/index-1.json' });
    serve('/camel-catalog/starter-templates/index-1.json', {
      catalogs: { 'kamelet-source-yaml': { file: 'kamelet-1.yaml' } },
    });
    serve('/camel-catalog/starter-templates/kamelet-1.yaml', KAMELET);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stores the file with the template filled in for its file name, not its folder', async () => {
    const created = await createFileFromTemplate({
      catalogUrl: CATALOG_URL,
      template: 'kamelet-source-yaml',
      path: 'kamelets/orders/my-source.kamelet.yaml',
      createFile,
    });

    const content = KAMELET.replace('kamelet-source-__KAOTO_ID__', 'my-source');
    expect(createFile).toHaveBeenCalledWith({ path: 'kamelets/orders/my-source.kamelet.yaml', content });
    expect(created).toMatchObject({ id: 'new-id', path: 'kamelets/orders/my-source.kamelet.yaml', content });
  });

  it('takes the whole path as the file name of a file in the root', async () => {
    await createFileFromTemplate({
      catalogUrl: CATALOG_URL,
      template: 'kamelet-source-yaml',
      path: 'timer.kamelet.yaml',
      createFile,
    });

    expect(createFile).toHaveBeenCalledWith({
      path: 'timer.kamelet.yaml',
      content: KAMELET.replace('kamelet-source-__KAOTO_ID__', 'timer'),
    });
  });

  it('stores nothing when it was cancelled while the template was loading', async () => {
    const controller = new AbortController();
    const creating = createFileFromTemplate({
      catalogUrl: CATALOG_URL,
      template: 'kamelet-source-yaml',
      path: 'timer.kamelet.yaml',
      createFile,
      signal: controller.signal,
    });

    controller.abort();

    expect(await creating).toBeUndefined();
    expect(createFile).not.toHaveBeenCalled();
  });

  it('rejects and stores nothing when the template cannot be loaded', async () => {
    await expect(
      createFileFromTemplate({ catalogUrl: CATALOG_URL, template: 'citrus-yaml', path: 'a.citrus.yaml', createFile }),
    ).rejects.toThrow('The catalog has no starter template citrus-yaml');
    expect(createFile).not.toHaveBeenCalled();
  });

  it('rejects when the file cannot be stored', async () => {
    createFile.mockRejectedValueOnce(new Error('The path is taken'));

    await expect(
      createFileFromTemplate({
        catalogUrl: CATALOG_URL,
        template: 'kamelet-source-yaml',
        path: 'timer.kamelet.yaml',
        createFile,
      }),
    ).rejects.toThrow('The path is taken');
  });
});
