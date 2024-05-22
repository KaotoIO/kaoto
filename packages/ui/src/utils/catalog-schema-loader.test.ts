import { Entry } from '@kaoto/camel-catalog/types';
import { CatalogSchemaLoader } from './catalog-schema-loader';

describe('CatalogSchemaLoader', () => {
  Object.defineProperty(window, 'fetch', {
    writable: true,
    value: jest.fn(),
  });

  const fetchMock = jest.spyOn(window, 'fetch');

  beforeEach(() => {
    fetchMock.mockImplementation((file) =>
      Promise.resolve({
        json: () => ({ content: 'file-content' }),
        url: `http://localhost/${file}`,
      } as unknown as Response),
    );
  });

  describe('fetchFile', () => {
    it('should fetch the file', async () => {
      await CatalogSchemaLoader.fetchFile('file.json');

      expect(fetchMock).toHaveBeenCalledWith('file.json');
    });

    it('should return the body and the uri', async () => {
      const result = await CatalogSchemaLoader.fetchFile('file.json');

      expect(result).toEqual({
        body: {
          content: 'file-content',
        },
        uri: 'http://localhost/file.json',
      });
    });
  });

  describe('getSchemasFiles', () => {
    const schemasEntries: Record<string, Entry> = {
      rest: {
        description: 'description-1',
        file: 'file-1.json',
        name: 'name-1',
        version: '1.0.0',
      },
      Integration: {
        description: 'description-2',
        file: 'file-2.json',
        name: 'name-2',
        version: '1.0.0',
      },
      route: {
        description: 'description-3',
        file: 'file-3.json',
        name: 'name-3',
        version: '1.0.0',
      },
    };

    beforeEach(() => {
      jest.spyOn(CatalogSchemaLoader, 'fetchFile').mockResolvedValue({
        body: {
          content: 'file-content',
        },
        uri: 'http://localhost/file.json',
      });
    });

    it('should return the schemas files', async () => {
      const schemaPromises = CatalogSchemaLoader.getSchemasFiles('http://localhost', schemasEntries);

      const result = await Promise.all(schemaPromises);

      expect(result).toEqual([
        {
          name: 'rest',
          tags: [],
          uri: 'http://localhost/file.json',
          version: '1.0.0',
          schema: {
            content: 'file-content',
          },
        },
        {
          name: 'Integration',
          tags: ['visualization'],
          uri: 'http://localhost/file.json',
          version: '1.0.0',
          schema: {
            content: 'file-content',
          },
        },
        {
          name: 'route',
          tags: ['visualization'],
          uri: 'http://localhost/file.json',
          version: '1.0.0',
          schema: {
            content: 'file-content',
          },
        },
      ]);
    });
  });
});
