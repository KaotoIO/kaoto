import { KameletBindingStep, PipeStep } from '../../../camel/entities';
import { CatalogKind } from '../../../catalog-kind';
import { IKameletDefinition } from '../../../kamelets-catalog';
import { VisualComponentSchema } from '../../base-visual-entity';
import { CamelCatalogService } from '../camel-catalog.service';
import { JSONSchemaType } from 'ajv';

export class KameletSchemaService {
  static getVisualComponentSchema(stepModel?: PipeStep): VisualComponentSchema | undefined {
    if (stepModel === undefined) {
      return undefined;
    }

    const definition = this.getKameletDefinition(stepModel);

    return {
      title: definition?.metadata.name || '',
      schema: definition?.propertiesSchema || ({} as JSONSchemaType<unknown>),
      definition: stepModel?.ref?.properties || {},
    };
  }

  static getKameletDefinition(step?: KameletBindingStep): IKameletDefinition | undefined {
    const stepName = step?.ref?.name;

    return CamelCatalogService.getComponent(CatalogKind.Kamelet, stepName);
  }

  static getNodeLabel(step: PipeStep, path: string): string {
    return step?.ref?.name ?? `${path}: Unknown`;
  }

  static getTooltipContent(step: PipeStep, path: string): string {
    const schema = this.getKameletDefinition(step)?.propertiesSchema;
    if (schema !== undefined && schema.description !== undefined) {
      return schema.description;
    }

    return step?.ref?.name ?? `${path}: Unknown`;
  }
}
