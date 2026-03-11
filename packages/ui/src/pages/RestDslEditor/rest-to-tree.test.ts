import { CamelResource } from '../../models/camel/camel-resource';
import { CamelResourceFactory } from '../../models/camel/camel-resource-factory';
import { restToTree, RestTreeNode } from './rest-to-tree';

describe('restToTree', () => {
  let camelResource: CamelResource;

  beforeEach(() => {
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
  });

  it('should convert rest to tree', () => {
    const treeNodes = restToTree(camelResource.getVisualEntities());

    const expectedTreeNodes: RestTreeNode[] = [
      {
        id: expect.any(String),
        entityId: expect.any(String),
        type: 'restConfiguration',
        label: 'Rest configuration',
        modelPath: 'restConfiguration',
      },
      {
        id: 'rest-3496',
        entityId: 'rest-3496',
        type: 'rest',
        label: 'Rest',
        modelPath: 'rest',
        children: [
          {
            id: 'rest-1816',
            entityId: 'rest-3496',
            type: 'get',
            label: 'aaa',
            modelPath: 'rest.get.0',
          },
          {
            id: 'rest-1996',
            entityId: 'rest-3496',
            type: 'get',
            label: 'bbb',
            modelPath: 'rest.get.1',
          },
          {
            id: 'rest-3315',
            entityId: 'rest-3496',
            type: 'delete',
            label: 'ddd',
            modelPath: 'rest.delete.0',
          },
          {
            id: 'rest-5678',
            entityId: 'rest-3496',
            type: 'delete',
            label: 'ddd',
            modelPath: 'rest.delete.1',
          },
          {
            id: 'rest-1370',
            entityId: 'rest-3496',
            type: 'head',
            label: 'ssss',
            modelPath: 'rest.head.0',
          },
        ],
      },
    ];

    expect(treeNodes).toEqual(expectedTreeNodes);
  });
});
