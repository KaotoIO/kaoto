import { DynamicCatalogRegistry } from '../../../../../../dynamic-catalog/dynamic-catalog-registry';
import { ICamelProcessorDefinition } from '../../../../../camel/camel-processors-catalog';
import { CatalogKind } from '../../../../../catalog-kind';
import { PROCESSOR_ICON_PREFIXES } from '../../../../../special-processors.constants';

/**
 * Service for resolving processor icon overlay tooltips from the catalog.
 * Resolves tooltips from the Camel catalog for processor names.
 */
export class ProcessorIconTooltipResolver {
  /**
   * Get tooltip for processor icon overlay from the catalog
   * @param processorName - The processor name (e.g., 'from', 'to', 'toD', 'poll')
   * @returns Promise resolving to formatted tooltip or undefined if not found
   */
  static async getProcessorIconTooltip(processorName: string): Promise<string | undefined> {
    try {
      const definition = await DynamicCatalogRegistry.get().getEntity(CatalogKind.Pattern, processorName);

      if (definition && this.isProcessorDefinition(definition)) {
        const description = definition.model?.description;
        if (description) {
          const prefix = this.getPrefix(processorName);
          return `${prefix}: ${description}`;
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch processor icon tooltip for ${processorName}`, error);
    }

    return undefined;
  }

  private static isProcessorDefinition(def: unknown): def is ICamelProcessorDefinition {
    return typeof def === 'object' && def !== null && 'model' in def;
  }

  private static getPrefix(processorName: string): string {
    return PROCESSOR_ICON_PREFIXES[processorName as keyof typeof PROCESSOR_ICON_PREFIXES] || processorName;
  }
}
