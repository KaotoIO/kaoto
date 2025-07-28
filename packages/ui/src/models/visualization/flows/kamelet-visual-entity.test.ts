import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { camelFromJson } from '../../../stubs/camel-from';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { SourceSchemaType } from '../../camel';
import { ICamelProcessorDefinition } from '../../camel-processors-catalog';
import { CatalogKind } from '../../catalog-kind';
import { IKameletDefinition, IKameletMetadata, IKameletSpecProperty } from '../../kamelets-catalog';
import { NodeLabelType } from '../../settings';
import { AbstractCamelVisualEntity } from './abstract-camel-visual-entity';
import { CamelCatalogService } from './camel-catalog.service';
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
          from: camelFromJson.from,
        },
        dependencies: [],
      },
    };
  });

  it('should create an instance', () => {
    expect(new KameletVisualEntity(kameletDef)).toBeTruthy();
  });

  it('should set the id to the name if provided', () => {
    const kameletVisualEntity = new KameletVisualEntity(kameletDef);
    expect(kameletVisualEntity.id).toEqual('My Kamelet');
    expect(kameletVisualEntity.kamelet.metadata.name).toEqual('My Kamelet');
  });

  it('should set a random id if the kamelet name is not provided', () => {
    kameletDef.metadata.name = undefined as unknown as IKameletMetadata['name'];
    const kameletVisualEntity = new KameletVisualEntity(kameletDef);
    expect(kameletVisualEntity.id).toEqual('kamelet-1234');
    expect(kameletVisualEntity.kamelet.metadata.name).toEqual('kamelet-1234');
  });

  it('should set the id', () => {
    const kameletVisualEntity = new KameletVisualEntity(kameletDef);
    kameletVisualEntity.setId('new-id');
    expect(kameletVisualEntity.id).toEqual('new-id');
    expect(kameletVisualEntity.kamelet.metadata.name).toEqual('new-id');
  });

  describe('getNodeLabel', () => {
    it('should return the ID as node label when querying the ROOT_PATH by default', () => {
      const kamelet = new KameletVisualEntity(kameletDef);
      expect(kamelet.getNodeLabel(KameletVisualEntity.ROOT_PATH)).toEqual('My Kamelet');
    });

    it('should return the description as node label when querying the ROOT_PATH', () => {
      const kamelet = new KameletVisualEntity(kameletDef);
      expect(kamelet.getNodeLabel(KameletVisualEntity.ROOT_PATH, NodeLabelType.Description)).toEqual(
        'My Kamelet Description',
      );
    });

    it('should fallback to the id as node label when there is no description available', () => {
      kameletDef.spec.definition.description = undefined;
      const kamelet = new KameletVisualEntity(kameletDef);
      expect(kamelet.getNodeLabel(KameletVisualEntity.ROOT_PATH, NodeLabelType.Description)).toEqual('My Kamelet');
    });

    it('should return the node label when querying a different path', () => {
      const kamelet = new KameletVisualEntity(kameletDef);
      expect(kamelet.getNodeLabel('template.from')).toEqual('timer');
    });
  });

  describe('getComponentSchema when querying the ROOT_PATH', () => {
    let entityCatalogMap: Record<string, ICamelProcessorDefinition>;
    beforeEach(async () => {
      const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
      entityCatalogMap = catalogsMap.entitiesCatalog;
      CamelCatalogService.setCatalogKey(CatalogKind.Entity, entityCatalogMap);
    });

    afterEach(() => {
      CamelCatalogService.clearCatalogs();
    });

    it('should return the kamelet root schema when querying the ROOT_PATH', () => {
      const kamelet = new KameletVisualEntity(kameletDef);
      expect(kamelet.getComponentSchema(KameletVisualEntity.ROOT_PATH)?.schema).toEqual(
        entityCatalogMap.KameletConfiguration.propertiesSchema,
      );
    });
  });

  it('getComponentSchema should return the component schema from the underlying AbstractCamelVisualEntity', () => {
    const getComponentSchemaSpy = jest.spyOn(AbstractCamelVisualEntity.prototype, 'getComponentSchema');

    const kamelet = new KameletVisualEntity(kameletDef);
    kamelet.getComponentSchema('test-path');

    expect(getComponentSchemaSpy).toHaveBeenCalledWith('test-path');
  });

  it('should return the root uri', () => {
    class KameletVisualEntityTest extends KameletVisualEntity {
      getRootUri(): string | undefined {
        return super.getRootUri();
      }
    }
    const kamelet = new KameletVisualEntityTest(kameletDef);
    expect(kamelet.getRootUri()).toEqual('timer');
  });

  describe('toVizNode', () => {
    it('should delegate to the super class toVizNode', () => {
      const toVizNodeSpy = jest.spyOn(AbstractCamelVisualEntity.prototype, 'toVizNode');
      const kamelet = new KameletVisualEntity(kameletDef);
      kamelet.toVizNode().nodes[0];

      expect(toVizNodeSpy).toHaveBeenCalled();
    });

    it('should return a visualization node with title Kamelet', () => {
      const kamelet = new KameletVisualEntity(kameletDef);
      const vizNode = kamelet.toVizNode().nodes[0];

      expect(vizNode.getNodeTitle()).toEqual('Kamelet');
    });
  });
});
