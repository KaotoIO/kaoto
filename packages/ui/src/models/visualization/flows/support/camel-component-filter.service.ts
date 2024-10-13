import { ITile, TileFilter } from '../../../../components/Catalog/Catalog.models';
import { CatalogKind } from '../../../catalog-kind';
import { AddStepMode } from '../../base-visual-entity';
import { CamelRouteVisualEntityData } from './camel-component-types';

export class CamelComponentFilterService {
  private static SPECIAL_CHILDREN = [
    'when',
    'otherwise',
    'doCatch',
    'doFinally',
    'intercept',
    'interceptFrom',
    'interceptSendToEndpoint',
    'onException',
    'onCompletion',
    'get',
    'post',
    'put',
    'patch',
    'head',
  ];

  static getCamelCompatibleComponents(
    mode: AddStepMode,
    visualEntityData: CamelRouteVisualEntityData,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    definition?: any,
  ): TileFilter {
    if (mode === AddStepMode.ReplaceStep && visualEntityData.path === 'from') {
      /**
       * For the `from` step we want to show only components which are not `producerOnly`,
       * as this mean that they can be used only as a producer.
       */
      return (item: ITile) => {
        return (
          (item.type === CatalogKind.Component && !item.tags.includes('producerOnly')) ||
          (item.type === CatalogKind.Kamelet && item.tags.includes('source') && item.name !== 'source')
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
        routeConfiguration: ['intercept', 'interceptFrom', 'interceptSendToEndpoint', 'onException', 'onCompletion'],
        route: ['get', 'post', 'put', 'delete', 'patch', 'head'],
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
        (item.type === CatalogKind.Processor && !this.SPECIAL_CHILDREN.includes(item.name)) ||
        (item.type === CatalogKind.Component && !item.tags.includes('consumerOnly')) ||
        (item.type === CatalogKind.Kamelet && !item.tags.includes('source') && item.name !== 'sink')
      );
    };
  }

  static getKameletCompatibleComponents(
    mode: AddStepMode,
    visualEntityData: CamelRouteVisualEntityData,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    definition?: any,
  ): TileFilter {
    const camelComponentFilter = this.getCamelCompatibleComponents(mode, visualEntityData, definition);

    /** For the `from` step we want to add kamelet:source and leverage the existing getCamelCompatibleComponents method */
    if (mode === AddStepMode.ReplaceStep && visualEntityData.path === 'from') {
      return (item: ITile) => {
        return (item.type === CatalogKind.Kamelet && item.name === 'source') || camelComponentFilter(item);
      };
    }

    if (mode === AddStepMode.InsertSpecialChildStep) {
      return camelComponentFilter;
    }

    /** For the rest, we add kamelet:sink and leverage the existing getCamelCompatibleComponents method */
    return (item: ITile) => {
      return (item.type === CatalogKind.Kamelet && item.name === 'sink') || camelComponentFilter(item);
    };
  }
}
