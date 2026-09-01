import { CamelResourceFactory } from '../../models/camel/camel-resource-factory';
import { CatalogKind } from '../../models/catalog-kind';
import { KaotoResource } from '../../models/kaoto-resource';
import { CamelRestConfigurationVisualEntity } from '../../models/visualization/flows/camel-rest-configuration-visual-entity';
import { CamelRestVisualEntity } from '../../models/visualization/flows/camel-rest-visual-entity';
import { RestEntity } from '../../models/visualization/flows/rest-entity';
import { restToTree, RestTreeNode } from './rest-to-tree';

/** Helper to get REST-related entities (non-visual after refactor) */
const getRestEntities = (camelResource: KaotoResource): RestEntity[] =>
  camelResource
    .getEntities()
    .filter(
      (e) => e instanceof CamelRestVisualEntity || e instanceof CamelRestConfigurationVisualEntity,
    ) as RestEntity[];

describe('restToTree', () => {
  let camelResource: KaotoResource;

  beforeEach(async () => {
    camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-3496
    get:
      - id: rest-1816
        path: aaa
        to:
          uri: direct:rest-1816
      - id: rest-1996
        path: bbb
        to:
          uri: direct:rest-1996
    delete:
      - id: rest-3315
        path: ddd
        to:
          uri: direct:rest-3315
      - id: rest-5678
        path: ddd
        to:
          uri: direct:rest-3315
    head:
      - id: rest-1370
        path: ssss
        to:
          uri: direct:rest-1370

- restConfiguration:
    host: localhost
    port: "8080"
    `);
    await camelResource.initialize();
  });

  it('should convert rest to tree', () => {
    const treeNodes = restToTree(getRestEntities(camelResource));

    const expectedTreeNodes: RestTreeNode[] = [
      {
        id: expect.any(String),
        entityId: expect.any(String),
        type: 'restConfiguration',
        label: 'Rest configuration',
        modelPath: 'restConfiguration',
        primaryNodeId: {
          name: 'restConfiguration',
          catalogKind: CatalogKind.Entity,
        },
      },
      {
        id: 'rest-3496',
        entityId: 'rest-3496',
        type: 'rest',
        label: 'Rest',
        modelPath: 'rest',
        primaryNodeId: {
          name: 'rest',
          catalogKind: CatalogKind.Entity,
        },
        children: [
          {
            id: 'rest-1816',
            entityId: 'rest-3496',
            type: 'get',
            label: 'aaa',
            modelPath: 'rest.get.0',
            primaryNodeId: {
              name: 'get',
              catalogKind: CatalogKind.Pattern,
            },
          },
          {
            id: 'rest-1996',
            entityId: 'rest-3496',
            type: 'get',
            label: 'bbb',
            modelPath: 'rest.get.1',
            primaryNodeId: {
              name: 'get',
              catalogKind: CatalogKind.Pattern,
            },
          },
          {
            id: 'rest-3315',
            entityId: 'rest-3496',
            type: 'delete',
            label: 'ddd',
            modelPath: 'rest.delete.0',
            primaryNodeId: {
              name: 'delete',
              catalogKind: CatalogKind.Pattern,
            },
          },
          {
            id: 'rest-5678',
            entityId: 'rest-3496',
            type: 'delete',
            label: 'ddd',
            modelPath: 'rest.delete.1',
            primaryNodeId: {
              name: 'delete',
              catalogKind: CatalogKind.Pattern,
            },
          },
          {
            id: 'rest-1370',
            entityId: 'rest-3496',
            type: 'head',
            label: 'ssss',
            modelPath: 'rest.head.0',
            primaryNodeId: {
              name: 'head',
              catalogKind: CatalogKind.Pattern,
            },
          },
        ],
      },
    ];

    expect(treeNodes).toEqual(expectedTreeNodes);
  });

  it('should handle rest entity with method without id', async () => {
    camelResource = CamelResourceFactory.createCamelResource(`
- rest:
    id: rest-9999
    post:
      - path: /create
        to:
          uri: direct:create
    `);
    await camelResource.initialize();

    const treeNodes = restToTree(getRestEntities(camelResource));

    expect(treeNodes).toHaveLength(1);
    expect(treeNodes[0].children).toHaveLength(1);
    // When methodDef.id is undefined, it should generate an id
    expect(treeNodes[0].children![0].id).toBe('rest-9999-post-0');
    expect(treeNodes[0].children![0].label).toBe('/create');
  });
});
