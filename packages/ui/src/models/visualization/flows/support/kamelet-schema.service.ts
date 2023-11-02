import { JSONSchemaType } from 'ajv';
import { KameletBindingStep, PipeStep } from '../../../camel/entities';
import { CatalogKind } from '../../../catalog-kind';
import { IKameletDefinition } from '../../../kamelets-catalog';
import { VisualComponentSchema } from '../../base-visual-entity';
import { CamelCatalogService } from '../camel-catalog.service';

export class KameletSchemaService {
  static getVisualComponentSchema(stepModel: PipeStep): VisualComponentSchema | undefined {
    if (stepModel === undefined) {
      return undefined;
    }
    const definition = KameletSchemaService.getKameletDefinition(stepModel);
    return {
      title: definition?.metadata.name || '',
      schema: KameletSchemaService.getSchemaFromKameletDefinition(definition),
      definition: stepModel?.ref?.properties || {},
    };
  }

  private static getSchemaFromKameletDefinition(definition: IKameletDefinition | undefined): JSONSchemaType<unknown> {
    const required: string[] = [];
    const schema = {
      type: 'object',
      properties: {},
      required,
    } as unknown as JSONSchemaType<unknown>;
    const properties = definition?.spec.definition.properties;
    if (!properties) {
      return schema;
    }

    Object.keys(properties).forEach((propertyName) => {
      const property = properties[propertyName];
      const propertySchema = {
        type: property.type,
        title: property.title,
        description: property.description,
      } as unknown as JSONSchemaType<unknown>;

      schema.properties[propertyName] = propertySchema;
    });

    if (definition.spec.definition.required) {
      required.push(...definition.spec.definition.required);
    }

    return schema;
  }

  static getKameletDefinition(step?: KameletBindingStep): IKameletDefinition | undefined {
    const stepName = step?.ref?.name;

    return CamelCatalogService.getComponent(CatalogKind.Kamelet, stepName);
  }
}
