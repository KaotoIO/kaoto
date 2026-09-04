import { DynamicCatalogRegistry } from '../../dynamic-catalog/dynamic-catalog-registry';
import { CatalogKind } from '../../models/catalog-kind';
import { KaotoSchemaDefinition } from '../../models/kaoto-schema';
import { MetadataService } from './metadata.service';

describe('MetadataService.getMetadataSchema', () => {
  afterEach(() => {
    DynamicCatalogRegistry.get().clearRegistry();
  });

  it('returns undefined when no Entity catalog is registered', async () => {
    const schema = await MetadataService.getMetadataSchema();

    expect(schema).toBeUndefined();
  });

  it('returns undefined when the ObjectMeta entity has no propertiesSchema', async () => {
    DynamicCatalogRegistry.get().setCatalog(CatalogKind.Entity, {
      get: vi.fn().mockResolvedValue({ name: 'ObjectMeta' }),
      getAll: vi.fn(),
      clearCache: vi.fn(),
    });

    const schema = await MetadataService.getMetadataSchema();

    expect(schema).toBeUndefined();
  });

  it('returns propertiesSchema from the ObjectMeta entity unchanged', async () => {
    const propertiesSchema: KaotoSchemaDefinition['schema'] = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        annotations: { type: 'object' },
        labels: { type: 'object' },
        name: { type: 'string' },
        namespace: { type: 'string' },
      },
    };

    DynamicCatalogRegistry.get().setCatalog(CatalogKind.Entity, {
      get: vi.fn().mockResolvedValue({ propertiesSchema }),
      getAll: vi.fn(),
      clearCache: vi.fn(),
    });

    const schema = await MetadataService.getMetadataSchema();

    expect(schema).toBe(propertiesSchema); // same reference — no copy, no mutation
  });
});
