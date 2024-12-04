import { KameletBindingStep, PipeStep } from '../../../camel/entities';
import { CatalogKind } from '../../../catalog-kind';
import { IKameletDefinition } from '../../../kamelets-catalog';
import { KaotoSchemaDefinition } from '../../../kaoto-schema';
import { VisualComponentSchema } from '../../base-visual-entity';
import { CamelCatalogService } from '../camel-catalog.service';

export class KameletSchemaService {
  static getVisualComponentSchema(stepModel?: PipeStep): VisualComponentSchema | undefined {
    if (stepModel === undefined) {
      return undefined;
    }

    const definition = this.getKameletDefinition(stepModel);

    return {
      schema: definition?.propertiesSchema || ({} as KaotoSchemaDefinition['schema']),
      definition: stepModel?.properties || {},
    };
  }

  static getKameletDefinition(step?: KameletBindingStep): IKameletDefinition | undefined {
    const stepName = step?.ref?.name;

    return CamelCatalogService.getComponent(CatalogKind.Kamelet, stepName);
  }

  static getNodeLabel(step: PipeStep, path: string): string {
    const kameletName = step?.ref?.name;

    if (kameletName) {
      return kameletName;
    } else if (path === 'source' || path === 'sink') {
      return path;
    }

    return '';
  }

  static getTooltipContent(step: PipeStep, path: string): string {
    const schema = this.getKameletDefinition(step)?.propertiesSchema;
    if (schema?.description !== undefined) {
      return schema.description;
    }

    return step?.ref?.name ?? `${path}: Unknown`;
  }
}
