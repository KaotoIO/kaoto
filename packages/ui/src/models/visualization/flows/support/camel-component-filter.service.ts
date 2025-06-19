import { ITile, TileFilter } from '../../../../components/Catalog/Catalog.models';
import { CatalogKind } from '../../../catalog-kind';
import { AddStepMode } from '../../base-visual-entity';
import { CamelRouteVisualEntityData } from './camel-component-types';

export class CamelComponentFilterService {
  static readonly REST_DSL_METHODS = ['delete', 'get', 'head', 'patch', 'post', 'put'];
  static readonly SPECIAL_PROCESSORS = [
    'onFallback',
    'when',
    'otherwise',
    'doCatch',
    'doFinally',
    'intercept',
    'interceptFrom',
    'interceptSendToEndpoint',
    'onException',
    'onCompletion',
    ...this.REST_DSL_METHODS,
  ];
  /**
   * specialChildren is a map of processor names and their special children.
   */
  static readonly SPECIAL_PROCESSORS_PARENTS_MAP = {
    circuitBreaker: ['onFallback'],
    choice: ['when', 'otherwise'],
    doTry: ['doCatch', 'doFinally'],
    routeConfiguration: ['intercept', 'interceptFrom', 'interceptSendToEndpoint', 'onException', 'onCompletion'],
    rest: this.REST_DSL_METHODS,
  };

  static getCamelCompatibleComponents(
    mode: AddStepMode,
    visualEntityData: CamelRouteVisualEntityData,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    definition?: any,
  ): TileFilter {
    if (
      mode === AddStepMode.ReplaceStep &&
      (visualEntityData.path === 'route.from' || visualEntityData.path === 'template.from')
    ) {
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
      const { processorName } = visualEntityData;
      if (!(processorName in this.SPECIAL_PROCESSORS_PARENTS_MAP)) {
        return () => false;
      }

      let childrenLookup: string[] =
        this.SPECIAL_PROCESSORS_PARENTS_MAP[processorName as keyof typeof this.SPECIAL_PROCESSORS_PARENTS_MAP];
      /** If an `otherwise` or a `doFinally` already exists, we shouldn't offer it in the catalog */
      const definitionKeys = Object.keys(definition ?? {});
      if (processorName === 'circuitBreaker' && definitionKeys.includes('onFallback')) {
        childrenLookup = childrenLookup.filter((child) => child !== 'onFallback');
      }
      if (processorName === 'choice' && definitionKeys.includes('otherwise')) {
        childrenLookup = childrenLookup.filter((child) => child !== 'otherwise');
      }
      if (processorName === 'doTry' && definitionKeys.includes('doFinally')) {
        childrenLookup = childrenLookup.filter((child) => child !== 'doFinally');
      }

      /**
       * For special child steps, we need to check which type of processor it is, in order to determine
       * what kind of components we want to show.
       */
      return (item: ITile) => {
        return childrenLookup.includes(item.name);
      };
    }

    /**
     * For the rest, we want to filter out components that are `consumerOnly`,
     * as this mean that they can be used only as a consumer.
     */
    return (item: ITile) => {
      return (
        (item.type === CatalogKind.Processor && !this.SPECIAL_PROCESSORS.includes(item.name)) ||
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
    if (mode === AddStepMode.ReplaceStep && visualEntityData.path === 'template.from') {
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
