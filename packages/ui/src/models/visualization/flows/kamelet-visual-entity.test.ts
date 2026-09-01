import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary, RouteDefinition } from '@kaoto/camel-catalog/types';
import { cloneDeep } from 'lodash';

import { DynamicCatalogRegistry } from '../../../dynamic-catalog/dynamic-catalog-registry';
import { mockRandomValues } from '../../../stubs';
import { camelFromJson } from '../../../stubs/camel-from';
import { getFirstCatalogMap, setupDynamicCatalogRegistry } from '../../../stubs/test-load-catalog';
import { SourceSchemaType } from '../../camel';
import { IKameletDefinition, IKameletMetadata, IKameletSpecProperty } from '../../camel/kamelets-catalog';
import { CatalogKind } from '../../catalog-kind';
import { NodeLabelType } from '../../settings';
import { AbstractCamelVisualEntity } from './abstract-camel-visual-entity';
import { KameletVisualEntity } from './kamelet-visual-entity';

describe('KameletVisualEntity', () => {
  let kameletDef: IKameletDefinition;

  beforeEach(() => {
    kameletDef = {
      kind: SourceSchemaType.Kamelet,
      metadata: {
        name: 'My Kamelet',
        labels: {
          'camel.apache.org/kamelet.type': '',
        },
        annotations: {
          'camel.apache.org/kamelet.support.level': '',
          'camel.apache.org/catalog.version': '',
          'camel.apache.org/kamelet.icon': '',
          'camel.apache.org/provider': '',
          'camel.apache.org/kamelet.group': '',
          'camel.apache.org/kamelet.namespace': '',
        },
      },
      spec: {
        definition: {
          title: 'My Kamelet',
          description: 'My Kamelet Description',
          required: ['schedule'],
          properties: {
            schedule: {
              title: 'Cron Schedule',
              description: 'A cron example',
              type: 'number',
            },
            message: {
              title: 'Message',
              description: 'The message to generate',
              default: 'hello',
              type: 'string',
              example: 'secretsmanager.amazonaws.com',
            },
          } as Record<string, IKameletSpecProperty>,
          type: 'source',
        },
        template: {
          route: {
            from: camelFromJson.from,
          },
        },
        dependencies: [],
      },
    };
  });

  it('should create an instance', () => {
    expect(new KameletVisualEntity(kameletDef)).toBeTruthy();
  });

  it('should normalize template.from to template.route.from and remove template.from', () => {
    const kameletDefWithFrom = cloneDeep(kameletDef);
    kameletDefWithFrom.spec.template.from = kameletDefWithFrom.spec.template.route.from;
    kameletDefWithFrom.spec.template.route = undefined as unknown as RouteDefinition;

    const kameletVisualEntity = new KameletVisualEntity(kameletDefWithFrom);
    expect(kameletVisualEntity.kamelet.spec.template.from).toBeUndefined();
    expect(kameletVisualEntity.kamelet.spec.template.route?.from).toEqual(camelFromJson.from);
  });

  it('should set the id to the name if provided', () => {
    const kameletVisualEntity = new KameletVisualEntity(kameletDef);
    expect(kameletVisualEntity.id).toBe('My Kamelet');
    expect(kameletVisualEntity.kamelet.metadata.name).toBe('My Kamelet');
  });

  it('should set a random id if the kamelet name is not provided', () => {
    mockRandomValues();

    kameletDef.metadata.name = undefined as unknown as IKameletMetadata['name'];
    const kameletVisualEntity = new KameletVisualEntity(kameletDef);
    expect(kameletVisualEntity.id).toBe('kamelet-1234');
    expect(kameletVisualEntity.kamelet.metadata.name).toBe('kamelet-1234');
  });

  it('should set the id', () => {
    const kameletVisualEntity = new KameletVisualEntity(kameletDef);
    kameletVisualEntity.setId('new-id');
    expect(kameletVisualEntity.id).toBe('new-id');
    expect(kameletVisualEntity.kamelet.metadata.name).toBe('new-id');
  });

  describe('getNodeLabel', () => {
    it('should return the ID as node label when querying the ROOT_PATH by default', () => {
      const kamelet = new KameletVisualEntity(kameletDef);
      expect(kamelet.getNodeLabel(KameletVisualEntity.ROOT_PATH)).toBe('My Kamelet');
    });

    it('should return the description as node label when querying the ROOT_PATH', () => {
      const kamelet = new KameletVisualEntity(kameletDef);
      expect(kamelet.getNodeLabel(KameletVisualEntity.ROOT_PATH, NodeLabelType.Description)).toBe(
        'My Kamelet Description',
      );
    });

    it('should fallback to the id as node label when there is no description available', () => {
      kameletDef.spec.definition.description = undefined;
      const kamelet = new KameletVisualEntity(kameletDef);
      expect(kamelet.getNodeLabel(KameletVisualEntity.ROOT_PATH, NodeLabelType.Description)).toBe('My Kamelet');
    });

    it('should return empty string when querying a non-root path without ids', () => {
      const kamelet = new KameletVisualEntity(kameletDef);
      expect(kamelet.getNodeLabel('template.from')).toBe('');
    });
  });

  describe('fetchNodeDefinition', () => {
    it('should return the custom schema (with kameletProperties) when querying ROOT_PATH', async () => {
      const kamelet = new KameletVisualEntity(kameletDef);
      const result = await kamelet.fetchNodeDefinition(KameletVisualEntity.ROOT_PATH);

      expect(result).toMatchObject({
        name: 'My Kamelet',
        title: 'My Kamelet',
        kameletProperties: expect.arrayContaining([
          expect.objectContaining({ name: 'schedule' }),
          expect.objectContaining({ name: 'message' }),
        ]),
      });
    });

    it('should delegate to AbstractCamelVisualEntity for non-root paths', async () => {
      const superSpy = vi.spyOn(AbstractCamelVisualEntity.prototype, 'fetchNodeDefinition');
      const kamelet = new KameletVisualEntity(kameletDef);
      await kamelet.fetchNodeDefinition('template.from');

      expect(superSpy).toHaveBeenCalledWith('template.from', undefined);
    });
  });

  it('should return the kamelet root schema when querying with KameletConfiguration primaryNodeId', async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    setupDynamicCatalogRegistry(catalogsMap);
    const kamelet = new KameletVisualEntity(kameletDef);

    const result = await kamelet.fetchNodeSchema({
      primaryNodeId: { name: 'KameletConfiguration', catalogKind: CatalogKind.Entity },
    });

    const kameletConfigEntry = await DynamicCatalogRegistry.get().getEntity(CatalogKind.Entity, 'KameletConfiguration');
    expect(result).toEqual(kameletConfigEntry?.propertiesSchema);
  });

  it('fetchNodeSchema should delegate to the underlying AbstractCamelVisualEntity for nested nodes', async () => {
    const fetchNodeSchemaSpy = vi.spyOn(AbstractCamelVisualEntity.prototype, 'fetchNodeSchema');

    const kamelet = new KameletVisualEntity(kameletDef);
    const ids = {
      primaryNodeId: { name: 'from', catalogKind: CatalogKind.Entity },
      secondaryNodeId: { name: 'timer', catalogKind: CatalogKind.Component },
    };
    await kamelet.fetchNodeSchema(ids);

    expect(fetchNodeSchemaSpy).toHaveBeenCalledWith(ids);
  });

  it('should return the root uri when using template.from (short syntax)', () => {
    class KameletVisualEntityTest extends KameletVisualEntity {
      getRootUri(): string | undefined {
        return super.getRootUri();
      }
    }
    const kamelet = new KameletVisualEntityTest(kameletDef);
    expect(kamelet.getRootUri()).toBe('timer');
  });

  it('should return the root uri when using template.route.from', () => {
    class KameletVisualEntityTest extends KameletVisualEntity {
      getRootUri(): string | undefined {
        return super.getRootUri();
      }
    }
    kameletDef.spec.template = {
      route: {
        from: camelFromJson.from,
      },
    };
    const kamelet = new KameletVisualEntityTest(kameletDef);
    expect(kamelet.getRootUri()).toBe('timer');
  });

  describe('toVizNode', () => {
    it('should delegate to the super class toVizNode', async () => {
      const toVizNodeSpy = vi.spyOn(AbstractCamelVisualEntity.prototype, 'toVizNode');
      const kamelet = new KameletVisualEntity(kameletDef);
      await kamelet.toVizNode();

      expect(toVizNodeSpy).toHaveBeenCalled();
    });

    it('should return a visualization node with title Kamelet', async () => {
      const kamelet = new KameletVisualEntity(kameletDef);
      const vizNode = await kamelet.toVizNode();

      expect(vizNode.getNodeTitle()).toBe('Kamelet');
    });
  });
});
