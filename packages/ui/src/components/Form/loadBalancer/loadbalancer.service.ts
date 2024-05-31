import { CamelCatalogService } from '../../../models/visualization/flows';
import { ICamelLoadBalancerDefinition } from '../../../models/camel-loadbalancers-catalog';

export class LoadBalancerService {
  /**
   * Get the loadbalancer catalog map from the Camel catalog.
   */
  static getLoadBalancerMap(): Record<string, ICamelLoadBalancerDefinition> {
    return CamelCatalogService.getLoadBalancerMap();
  }

  /**
   * Get the LoadBalancer schema from the LoadBalancer catalog. LoadBalancer catalog has its properties schema in itself,
   * which is combined in @kaoto/camel-catalog.
   * @param loadBalancerCatalog The {@link ICamelLoadBalancerDefinition} object represents the LoadBalancer to get the schema.
   */
  static getLoadBalancerSchema(loadBalancerCatalog?: ICamelLoadBalancerDefinition) {
    return loadBalancerCatalog?.propertiesSchema;
  }

  /**
   * Parse the loadbalancer model from the parent step model object.
   * @param loadBalancerCatalogMap The loadbalancer catalog map to use as a dictionary.
   * @param parentModel The parent step model object which has loadbalancer as its parameter, i.e. `loadBalance` contents.
   * */
  static parseLoadBalancerModel(
    loadBalancerCatalogMap: Record<string, ICamelLoadBalancerDefinition>,
    parentModel: Record<string, unknown>,
  ): {
    loadBalancer: ICamelLoadBalancerDefinition | undefined;
    model: Record<string, unknown> | undefined;
  } {
    let loadBalancerModelName;
    let model = undefined;
    for (const loadBalancer of Object.values(loadBalancerCatalogMap)) {
      if (parentModel[loadBalancer.model.name]) {
        loadBalancerModelName = loadBalancer.model.name;
        model = LoadBalancerService.doParseLoadBalancerModel(parentModel, loadBalancer);
        break;
      }
    }
    if (!loadBalancerModelName) {
      return { loadBalancer: undefined, model };
    }
    if (!model) {
      model = {};
      (parentModel as Record<string, unknown>)[loadBalancerModelName] = model;
    }
    const loadBalancer = this.getDefinitionFromModelName(loadBalancerCatalogMap, loadBalancerModelName);
    return { loadBalancer, model };
  }

  private static doParseLoadBalancerModel(model: Record<string, unknown>, loadBalancer: ICamelLoadBalancerDefinition) {
    const loadBalancerModel = model[loadBalancer.model.name];
    if (typeof loadBalancerModel === 'object') {
      return loadBalancerModel as Record<string, unknown>;
    } else {
      const answer = {} as Record<string, unknown>;
      const firstProperty = Object.entries(loadBalancer.properties)
        .sort((a, b) => {
          return a[1].index - b[1].index;
        })
        .find(([name, _prop]) => !['id', 'description'].includes(name));
      if (firstProperty) {
        answer[firstProperty[0]] = loadBalancerModel;
      }
      return answer;
    }
  }

  static getDefinitionFromModelName(
    loadBalancerCatalogMap: Record<string, ICamelLoadBalancerDefinition>,
    modelName: string,
  ): ICamelLoadBalancerDefinition | undefined {
    return Object.values(loadBalancerCatalogMap).find((model) => model.model.name === modelName);
  }

  /**
   * Set the LoadBalancer model to the parent step model object.
   * @param loadBalancerCatalogMap The LoadBalancer catalog map to use as a dictionary.
   * @param parentModel The parent step model object which has LoadBalancer as its parameter, i.e. `loadBalance`
   * @param loadBalancerModelName The LoadBalancer model name string to set. e.g. `roundRobin`.
   * @param newLoadBalancerModel The new LoadBalancer model to set
   */
  static setLoadBalancerModel(
    loadBalancerCatalogMap: Record<string, ICamelLoadBalancerDefinition>,
    parentModel: Record<string, unknown>,
    loadBalancerModelName: string,
    newLoadBalancerModel: Record<string, unknown>,
  ): void {
    Object.values(loadBalancerCatalogMap).forEach((loadBalancer) => {
      delete parentModel[loadBalancer.model.name];
    });
    if (!loadBalancerModelName || !loadBalancerCatalogMap[loadBalancerModelName]) {
      return;
    }
    (parentModel as Record<string, unknown>)[loadBalancerModelName] = newLoadBalancerModel;
  }
}
