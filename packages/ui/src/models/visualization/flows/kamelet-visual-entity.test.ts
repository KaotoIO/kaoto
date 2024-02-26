import { camelFromJson } from '../../../stubs/camel-from';
import { ROOT_PATH } from '../../../utils';
import { SourceSchemaType } from '../../camel';
import { IKameletDefinition, IKameletMetadata, IKameletSpecProperty } from '../../kamelets-catalog';
import { AbstractCamelVisualEntity } from './abstract-camel-visual-entity';
import { KameletVisualEntity } from './kamelet-visual-entity';
import { CamelCatalogService } from './camel-catalog.service';
import { CatalogKind } from '../../catalog-kind';
import * as catalogIndex from '@kaoto-next/camel-catalog/index.json';
import { ICamelProcessorDefinition } from '../../camel-processors-catalog';

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
    const kamelet = new KameletVisualEntity(kameletDef);
    expect(kamelet.id).toEqual('My Kamelet');
    expect(kamelet.metadata.name).toEqual('My Kamelet');
  });

  it('should set a random id if the kamelet name is not provided', () => {
    kameletDef.metadata.name = undefined as unknown as IKameletMetadata['name'];
    const kamelet = new KameletVisualEntity(kameletDef);
    expect(kamelet.id).toEqual('kamelet-1234');
    expect(kamelet.metadata.name).toEqual('kamelet-1234');
  });

  it('should set the id', () => {
    const kamelet = new KameletVisualEntity(kameletDef);
    kamelet.setId('new-id');
    expect(kamelet.id).toEqual('new-id');
    expect(kamelet.metadata.name).toEqual('new-id');
  });

  describe('getComponentSchema when querying the ROOT_PATH', () => {
    let entityCatalogMap: Record<string, unknown>;
    beforeEach(async () => {
      entityCatalogMap = await import('@kaoto-next/camel-catalog/' + catalogIndex.catalogs.entities.file);
      CamelCatalogService.setCatalogKey(
        CatalogKind.Entity,
        entityCatalogMap as unknown as Record<string, ICamelProcessorDefinition>,
      );
    });

    afterEach(() => {
      CamelCatalogService.clearCatalogs();
    });

    it('should return the kamelet root schema when querying the ROOT_PATH', () => {
      const kamelet = new KameletVisualEntity(kameletDef);
      expect(kamelet.getComponentSchema(ROOT_PATH)).toEqual({
        title: 'Kamelet',
        schema: ((entityCatalogMap as Record<string, unknown>).KameletConfiguration as Record<string, unknown>)
          .propertiesSchema,
        definition: kamelet.route,
      });
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
    expect(kamelet.getRootUri()).toEqual('timer:tutorial');
  });
});
