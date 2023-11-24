import { ITile, TileFilter } from '../../../../components/Catalog/Catalog.models';
import { CatalogKind } from '../../../catalog-kind';
import { AddStepMode } from '../../base-visual-entity';
import { CamelRouteVisualEntityData } from './camel-component-types';

export class CamelComponentFilterService {
  static getCompatibleComponents(
    mode: AddStepMode,
    visualEntityData: CamelRouteVisualEntityData,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    definition?: any,
  ): TileFilter {
    if (mode === AddStepMode.ReplaceStep && visualEntityData.path === 'from') {
      /**
       * For the `from` step we want to show only components which are not `producerOnly`,
       * as this mean that they can be used only as a consumer.
       */
      return (item: ITile) => {
        return (
          (item.type === CatalogKind.Component && !item.tags.includes('producerOnly')) ||
          (item.type === CatalogKind.Kamelet && item.tags.includes('source'))
        );
      };
    }

    if (mode === AddStepMode.InsertSpecialChildStep) {
      /**
       * specialChildren is a map of processor names and their special children.
       */
      const specialChildren: Record<string, string[]> = {
        choice: ['when'],
        doTry: ['doCatch'],
      };

      /** If an `otherwise` or a `doFinally` already exists, we shouldn't offer it in the catalog */
      const definitionKeys = Object.keys(definition ?? {});
      if (!definitionKeys.includes('otherwise')) {
        specialChildren.choice.push('otherwise');
      }
      if (!definitionKeys.includes('doFinally')) {
        specialChildren.doTry.push('doFinally');
      }

      /**
       * For special child steps, we need to check which type of processor it is, in order to determine
       * what kind of components we want to show.
       */
      return (item: ITile) => {
        if (item.type !== CatalogKind.Processor || specialChildren[visualEntityData.processorName] === undefined) {
          return false;
        }

        return specialChildren[visualEntityData.processorName].includes(item.name);
      };
    }

    /**
     * For the rest, we want to filter out components that are `consumerOnly`,
     * as this mean that they can be used only as a consumer.
     */
    return (item: ITile) => {
      return (
        (item.type !== CatalogKind.Kamelet && !item.tags.includes('consumerOnly')) ||
        (item.type === CatalogKind.Kamelet && !item.tags.includes('source'))
      );
    };
  }
}
