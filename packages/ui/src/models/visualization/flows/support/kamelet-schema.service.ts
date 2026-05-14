import { DynamicCatalogRegistry } from '../../../../dynamic-catalog/dynamic-catalog-registry';
import { IKameletDefinition } from '../../../camel/kamelets-catalog';
import { CatalogKind } from '../../../catalog-kind';
import { KameletBindingStep, PipeStep } from '../../../entities';

export class KameletSchemaService {
  static async getKameletCatalogEntry(step?: KameletBindingStep): Promise<IKameletDefinition | undefined> {
    const stepName = step?.ref?.name;
    if (!stepName) return undefined;

    return await DynamicCatalogRegistry.get().getEntity(CatalogKind.Kamelet, stepName);
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
}
