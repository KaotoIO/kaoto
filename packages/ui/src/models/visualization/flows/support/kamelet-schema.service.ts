import { KameletBindingStep, PipeStep } from '../../../camel/entities';
import { CatalogKind } from '../../../catalog-kind';
import { IKameletDefinition } from '../../../kamelets-catalog';
import { VisualComponentSchema } from '../../base-visual-entity';
import { CamelCatalogService } from '../camel-catalog.service';
import { NodeDefinitionService } from './node-definition.service';

export class KameletSchemaService {
  static getVisualComponentSchema(stepModel?: PipeStep): VisualComponentSchema | undefined {
    if (stepModel === undefined) {
      return undefined;
    }

    const definition = this.getKameletDefinition(stepModel);

    return {
      title: definition?.metadata.name || '',
      schema: NodeDefinitionService.getSchemaFromKameletDefinition(definition),
      definition: stepModel?.ref?.properties || {},
    };
  }

  static getKameletDefinition(step?: KameletBindingStep): IKameletDefinition | undefined {
    const stepName = step?.ref?.name;

    return CamelCatalogService.getComponent(CatalogKind.Kamelet, stepName);
  }
}
