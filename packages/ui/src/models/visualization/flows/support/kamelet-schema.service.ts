import { IKameletDefinition } from '../../../camel/kamelets-catalog';
import { CatalogKind } from '../../../catalog-kind';
import { KameletBindingStep, PipeStep } from '../../../entities';
import { CamelCatalogService } from '../camel-catalog.service';

export class KameletSchemaService {
  static getKameletCatalogEntry(step?: KameletBindingStep): IKameletDefinition | undefined {
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

  static getNodeTitle(step?: PipeStep): string {
    const kameletDefinition = this.getKameletCatalogEntry(step);

    return kameletDefinition?.spec.definition.title ?? step?.ref?.name ?? '';
  }
}
