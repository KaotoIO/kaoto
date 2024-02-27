import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { ROOT_PATH, setValue } from '../../../utils';
import { EntityType } from '../../camel/entities';
import { IKameletDefinition, IKameletMetadata, IKameletSpec } from '../../kamelets-catalog';
import { KaotoSchemaDefinition } from '../../kaoto-schema';
import { VisualComponentSchema } from '../base-visual-entity';
import { AbstractCamelVisualEntity } from './abstract-camel-visual-entity';
import { CamelCatalogService } from './camel-catalog.service';
import { CatalogKind } from '../../catalog-kind';

export class KameletVisualEntity extends AbstractCamelVisualEntity {
  id: string;
  readonly type = EntityType.Kamelet;
  spec: IKameletSpec;
  metadata: IKameletMetadata;

  constructor(kamelet: IKameletDefinition) {
    super({ id: kamelet.metadata?.name, from: kamelet?.spec.template.from });
    this.id = (kamelet?.metadata?.name as string) ?? getCamelRandomId('kamelet');
    this.metadata = kamelet?.metadata ?? { name: this.id };
    this.metadata.name = kamelet?.metadata.name ?? this.id;
    this.spec = kamelet.spec;
  }

  /** Internal API methods */
  setId(routeId: string): void {
    this.id = routeId;
    this.metadata.name = this.id;
  }

  getId(): string {
    return this.metadata.name;
  }

  getComponentSchema(path?: string | undefined): VisualComponentSchema | undefined {
    if (path === ROOT_PATH) {
      const customSchema = {
        name: this.metadata.name,
        title: this.spec.definition.title,
        description: this.spec.definition.description,
        type: this.metadata.labels['camel.apache.org/kamelet.type'],
        icon: this.metadata.annotations['camel.apache.org/kamelet.icon'],
        supportLevel: this.metadata.annotations['camel.apache.org/kamelet.support.level'],
        catalogVersion: this.metadata.annotations['camel.apache.org/catalog.version'],
        provider: this.metadata.annotations['camel.apache.org/provider'],
        group: this.metadata.annotations['camel.apache.org/kamelet.group'],
        namespace: this.metadata.annotations['camel.apache.org/kamelet.namespace'],
      };

      const labels: { [key: string]: string } = {};
      if (this.metadata.labels && Object.keys(this.metadata.labels).length > 0) {
        for (const [labelKey, labelValue] of Object.entries(this.metadata.labels)) {
          switch (labelKey) {
            case 'camel.apache.org/kamelet.type':
              break;
            default:
              labels[labelKey] = labelValue;
          }
        }
      }
      setValue(customSchema, 'labels', labels);

      const annotations: { [key: string]: string } = {};
      if (this.metadata.annotations && Object.keys(this.metadata.annotations).length > 0) {
        for (const [annotationKey, annotationValue] of Object.entries(this.metadata.annotations)) {
          switch (annotationKey) {
            case 'camel.apache.org/kamelet.icon':
            case 'camel.apache.org/kamelet.support.level':
            case 'camel.apache.org/catalog.version':
            case 'camel.apache.org/provider':
            case 'camel.apache.org/kamelet.group':
            case 'camel.apache.org/kamelet.namespace':
              break;
            default:
              annotations[annotationKey] = annotationValue;
          }
        }
      }
      setValue(customSchema, 'annotations', annotations);

      return {
        title: 'Kamelet',
        schema: this.getRootKameletSchema(),
        definition: customSchema,
      };
    }

    return super.getComponentSchema(path);
  }

  updateModel(path: string | undefined, value: Record<string, unknown>): void {
    if (!path) return;

    if (path === ROOT_PATH) {
      this.metadata.name = value.name as string;
      this.spec.definition.title = value.title as string;
      this.spec.definition.description = value.description as string;

      const customAnnotations = {
        'camel.apache.org/kamelet.icon': value.icon,
        'camel.apache.org/kamelet.support.level': value.supportLevel,
        'camel.apache.org/catalog.version': value.catalogVersion,
        'camel.apache.org/provider': value.provider,
        'camel.apache.org/kamelet.group': value.group,
        'camel.apache.org/kamelet.namespace': value.namespace,
      };

      setValue(this.metadata, 'labels', { ...value.labels, 'camel.apache.org/kamelet.type': value.type });
      setValue(this.metadata, 'annotations', { ...value.annotations, ...customAnnotations });

      return;
    }

    super.updateModel(path, value);
  }

  private getRootKameletSchema(): KaotoSchemaDefinition['schema'] {
    const rootKameletDefinition = CamelCatalogService.getComponent(CatalogKind.Entity, 'KameletConfiguration');

    if (rootKameletDefinition === undefined) return {} as unknown as KaotoSchemaDefinition['schema'];

    let schema = {} as unknown as KaotoSchemaDefinition['schema'];
    if (rootKameletDefinition.propertiesSchema !== undefined) {
      schema = rootKameletDefinition.propertiesSchema;
    }

    return schema;
  }

  protected getRootUri(): string | undefined {
    return this.spec.template.from?.uri;
  }
}
