import { DefaultURIResolver } from './DefaultURIResolver';

describe('DefaultURIResolver', () => {
  describe('without file map', () => {
    it('should throw error when resolving entity without file map', () => {
      const resolver = new DefaultURIResolver();

      expect(() => {
        resolver.resolveEntity(null, 'schema.xsd', null);
      }).toThrow('XML schema External entity resolution is not yet supported');
    });

    it('should allow adding files after construction', () => {
      const resolver = new DefaultURIResolver();

      resolver.addFiles({ 'schema.xsd': '<schema>schema</schema>' });

      expect(resolver.resolveEntity(null, 'schema.xsd', null)).toBe('<schema>schema</schema>');
    });
  });

  describe('with file map', () => {
    describe('resolveEntity', () => {
      it('should resolve exact filename match', () => {
        const definitionFiles = {
          'main.xsd': '<schema>main</schema>',
          'common.xsd': '<schema>common</schema>',
        };
        const resolver = new DefaultURIResolver(definitionFiles);

        const result = resolver.resolveEntity(null, 'common.xsd', null);

        expect(result).toBe('<schema>common</schema>');
      });

      it('should resolve relative path with ./ prefix', () => {
        const definitionFiles = {
          'schemas/main.xsd': '<schema>main</schema>',
          'schemas/common.xsd': '<schema>common</schema>',
        };
        const resolver = new DefaultURIResolver(definitionFiles);

        const result = resolver.resolveEntity(null, './common.xsd', 'schemas/main.xsd');

        expect(result).toBe('<schema>common</schema>');
      });

      it('should resolve relative path with baseUri', () => {
        const definitionFiles = {
          'schemas/main.xsd': '<schema>main</schema>',
          'schemas/common.xsd': '<schema>common</schema>',
        };
        const resolver = new DefaultURIResolver(definitionFiles);

        const result = resolver.resolveEntity(null, 'common.xsd', 'schemas/main.xsd');

        expect(result).toBe('<schema>common</schema>');
      });

      it('should normalize ./ in schemaLocation', () => {
        const definitionFiles = {
          'schemas/types/base.xsd': '<schema>base</schema>',
        };
        const resolver = new DefaultURIResolver(definitionFiles);

        const result = resolver.resolveEntity(null, './types/./base.xsd', 'schemas/main.xsd');

        expect(result).toBe('<schema>base</schema>');
      });

      it('should resolve ../ in schemaLocation', () => {
        const definitionFiles = {
          'schemas/main.xsd': '<schema>main</schema>',
          'common.xsd': '<schema>common</schema>',
        };
        const resolver = new DefaultURIResolver(definitionFiles);

        const result = resolver.resolveEntity(null, '../common.xsd', 'schemas/main.xsd');

        expect(result).toBe('<schema>common</schema>');
      });

      it('should resolve nested relative paths (../../common.xsd)', () => {
        const definitionFiles = {
          'schemas/types/nested/specific.xsd': '<schema>specific</schema>',
          'schemas/common.xsd': '<schema>common</schema>',
        };
        const resolver = new DefaultURIResolver(definitionFiles);

        const result = resolver.resolveEntity(null, '../../common.xsd', 'schemas/types/nested/specific.xsd');

        expect(result).toBe('<schema>common</schema>');
      });

      it('should fallback to filename-only match when unique', () => {
        const definitionFiles = {
          'schemas/main.xsd': '<schema>main</schema>',
          'schemas/types/common.xsd': '<schema>common</schema>',
        };
        const resolver = new DefaultURIResolver(definitionFiles);

        const result = resolver.resolveEntity(null, 'common.xsd', null);

        expect(result).toBe('<schema>common</schema>');
      });

      it('should throw error when filename match is ambiguous', () => {
        const definitionFiles = {
          'schemas/common.xsd': '<schema>common1</schema>',
          'types/common.xsd': '<schema>common2</schema>',
        };
        const resolver = new DefaultURIResolver(definitionFiles);

        expect(() => {
          resolver.resolveEntity(null, 'common.xsd', null);
        }).toThrow('Ambiguous filename match for "common.xsd"');
      });

      it('should throw error when schema not found', () => {
        const definitionFiles = {
          'main.xsd': '<schema>main</schema>',
          'common.xsd': '<schema>common</schema>',
        };
        const resolver = new DefaultURIResolver(definitionFiles);

        expect(() => {
          resolver.resolveEntity(null, 'missing.xsd', null);
        }).toThrow('Schema not found: schemaLocation="missing.xsd"');
      });

      it('should include available files in error message', () => {
        const definitionFiles = {
          'main.xsd': '<schema>main</schema>',
          'common.xsd': '<schema>common</schema>',
        };
        const resolver = new DefaultURIResolver(definitionFiles);

        expect(() => {
          resolver.resolveEntity(null, 'missing.xsd', null);
        }).toThrow('Available files: [main.xsd, common.xsd]');
      });

      it('should handle absolute paths', () => {
        const definitionFiles = {
          '/schemas/main.xsd': '<schema>main</schema>',
          '/schemas/common.xsd': '<schema>common</schema>',
        };
        const resolver = new DefaultURIResolver(definitionFiles);

        const result = resolver.resolveEntity(null, '/schemas/common.xsd', null);

        expect(result).toBe('<schema>common</schema>');
      });

      it('should resolve with absolute schemaLocation ignoring baseUri', () => {
        const definitionFiles = {
          'schemas/main.xsd': '<schema>main</schema>',
          '/absolute/common.xsd': '<schema>common</schema>',
        };
        const resolver = new DefaultURIResolver(definitionFiles);

        const result = resolver.resolveEntity(null, '/absolute/common.xsd', 'schemas/main.xsd');

        expect(result).toBe('<schema>common</schema>');
      });

      it('should resolve with normalized path when it differs from original', () => {
        const definitionFiles = {
          'schemas/types/common.xsd': '<schema>common</schema>',
        };
        const resolver = new DefaultURIResolver(definitionFiles);

        const result = resolver.resolveEntity(null, 'schemas/./types/./common.xsd', null);

        expect(result).toBe('<schema>common</schema>');
      });

      it('should handle baseUri without directory separator when no exact match', () => {
        const definitionFiles = {
          'main.xsd': '<schema>main</schema>',
          'common.xsd': '<schema>common</schema>',
        };
        const resolver = new DefaultURIResolver(definitionFiles);

        const result = resolver.resolveEntity(null, './common.xsd', 'main.xsd');

        expect(result).toBe('<schema>common</schema>');
      });

      it('should handle ../ at the beginning of path', () => {
        const definitionFiles = {
          'common.xsd': '<schema>common</schema>',
        };
        const resolver = new DefaultURIResolver(definitionFiles);

        const result = resolver.resolveEntity(null, '../common.xsd', null);

        expect(result).toBe('<schema>common</schema>');
      });
    });

    describe('CollectionURIResolver interface', () => {
      it('should get and set collection base URI', () => {
        const resolver = new DefaultURIResolver({});

        expect(resolver.getCollectionBaseURI()).toBeUndefined();

        resolver.setCollectionBaseURI('http://example.com/schemas');

        expect(resolver.getCollectionBaseURI()).toBe('http://example.com/schemas');
      });

      it('should store collectionBaseUri independently', () => {
        const resolver = new DefaultURIResolver({});

        resolver.setCollectionBaseURI('http://example.com/schemas');

        expect(resolver.getCollectionBaseURI()).toBe('http://example.com/schemas');

        resolver.setCollectionBaseURI('http://example.com/types');

        expect(resolver.getCollectionBaseURI()).toBe('http://example.com/types');
      });
    });

    describe('addFiles', () => {
      it('should add new files to existing definition files', () => {
        const initialFiles = {
          'main.xsd': '<schema>main</schema>',
          'common.xsd': '<schema>common</schema>',
        };
        const resolver = new DefaultURIResolver(initialFiles);

        const additionalFiles = {
          'types.xsd': '<schema>types</schema>',
          'enums.xsd': '<schema>enums</schema>',
        };
        resolver.addFiles(additionalFiles);

        expect(resolver.resolveEntity(null, 'types.xsd', null)).toBe('<schema>types</schema>');
        expect(resolver.resolveEntity(null, 'enums.xsd', null)).toBe('<schema>enums</schema>');
        expect(resolver.resolveEntity(null, 'common.xsd', null)).toBe('<schema>common</schema>');
      });

      it('should overwrite existing files with same path', () => {
        const initialFiles = {
          'main.xsd': '<schema>main original</schema>',
          'common.xsd': '<schema>common</schema>',
        };
        const resolver = new DefaultURIResolver(initialFiles);

        const updatedFiles = {
          'main.xsd': '<schema>main updated</schema>',
        };
        resolver.addFiles(updatedFiles);

        expect(resolver.resolveEntity(null, 'main.xsd', null)).toBe('<schema>main updated</schema>');
        expect(resolver.resolveEntity(null, 'common.xsd', null)).toBe('<schema>common</schema>');
      });

      it('should handle adding files to initially empty resolver', () => {
        const resolver = new DefaultURIResolver({});

        const newFiles = {
          'schema.xsd': '<schema>schema</schema>',
        };
        resolver.addFiles(newFiles);

        expect(resolver.resolveEntity(null, 'schema.xsd', null)).toBe('<schema>schema</schema>');
      });

      it('should allow resolution of newly added file imports', () => {
        const initialFiles = {
          'main.xsd': '<schema>main</schema>',
        };
        const resolver = new DefaultURIResolver(initialFiles);

        const additionalFiles = {
          'imported.xsd': '<schema>imported</schema>',
        };
        resolver.addFiles(additionalFiles);

        const result = resolver.resolveEntity(null, 'imported.xsd', 'main.xsd');

        expect(result).toBe('<schema>imported</schema>');
      });
    });
  });
});
