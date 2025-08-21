import { CatalogDefinitionEntry } from '@kaoto/camel-catalog/types';
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

    it('should handle XSD files by returning text content', async () => {
      const xmlContent = '<?xml version="1.0"?><schema>content</schema>';
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          text: () => Promise.resolve(xmlContent),
          url: 'http://localhost/schema.xsd',
        } as unknown as Response),
      );

      const result = await CatalogSchemaLoader.fetchFile('schema.xsd');

      expect(result).toEqual({
        body: xmlContent,
        uri: 'http://localhost/schema.xsd',
      });
    });

    it('should handle fetch errors', async () => {
      const fetchError = new Error('Network error');
      fetchMock.mockRejectedValueOnce(fetchError);

      await expect(CatalogSchemaLoader.fetchFile('file.json')).rejects.toThrow('Network error');
    });

    it('should handle JSON parsing errors', async () => {
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          json: () => Promise.reject(new Error('Invalid JSON')),
          url: 'http://localhost/invalid.json',
        } as unknown as Response),
      );

      await expect(CatalogSchemaLoader.fetchFile('invalid.json')).rejects.toThrow('Invalid JSON');
    });

    it('should handle text parsing errors for XSD files', async () => {
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          text: () => Promise.reject(new Error('Text parsing failed')),
          url: 'http://localhost/invalid.xsd',
        } as unknown as Response),
      );

      await expect(CatalogSchemaLoader.fetchFile('invalid.xsd')).rejects.toThrow('Text parsing failed');
    });
  });

  describe('getSchemasFiles', () => {
    const schemasEntries: Record<string, CatalogDefinitionEntry> = {
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

  describe('getRelativeBasePath', () => {
    it('should extract the base path from a catalog index file path', () => {
      const result = CatalogSchemaLoader.getRelativeBasePath('http://localhost/camel-catalog/index.json');
      expect(result).toBe('http://localhost/camel-catalog');
    });

    it('should handle paths with multiple directories', () => {
      const result = CatalogSchemaLoader.getRelativeBasePath('/deep/nested/path/to/catalog/index.json');
      expect(result).toBe('/deep/nested/path/to/catalog');
    });

    it('should handle single directory paths', () => {
      const result = CatalogSchemaLoader.getRelativeBasePath('./catalog/index.json');
      expect(result).toBe('./catalog');
    });

    it('should handle root level files', () => {
      const result = CatalogSchemaLoader.getRelativeBasePath('index.json');
      expect(result).toBe('');
    });
  });
});
