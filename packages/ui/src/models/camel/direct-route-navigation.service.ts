import { CamelUriHelper } from '../../utils/camel-uri-helper';
import { BaseVisualCamelEntity } from '..';
import { CamelRouteVisualEntityData } from '../visualization/flows/support/camel-component-types';
import { EntityType } from './entities';

export class DirectRouteNavigationService {
  constructor(private readonly visualEntities: BaseVisualCamelEntity[]) {}

  static getDirectEndpointNameFromDefinition(definition: unknown): string | undefined {
    return CamelUriHelper.getDirectEndpointName(definition);
  }

  getDirectEndpointNameFromDefinition(definition: unknown): string | undefined {
    return DirectRouteNavigationService.getDirectEndpointNameFromDefinition(definition);
  }

  findDirectConsumerRouteId(directEndpointName: string): string | undefined {
    if (!directEndpointName) {
      return undefined;
    }

    const matchingRouteIds = this.visualEntities
      .filter((entity) => entity.type === EntityType.Route)
      .filter((entity) => {
        const fromDefinition = entity.getNodeDefinition(`${entity.getRootPath()}.from`);
        return DirectRouteNavigationService.getDirectEndpointNameFromDefinition(fromDefinition) === directEndpointName;
      })
      .map((entity) => entity.id);

    if (matchingRouteIds.length !== 1) {
      return undefined;
    }

    return matchingRouteIds[0];
  }

  findDirectCallerRouteId(directEndpointName: string, targetRouteId?: string): string | undefined {
    const matchingCallerRouteIds = this.findDirectCallerRouteIds(directEndpointName, targetRouteId);
    if (matchingCallerRouteIds.length !== 1) {
      return undefined;
    }

    return matchingCallerRouteIds[0];
  }

  findDirectCallerRouteIds(directEndpointName: string, targetRouteId?: string): string[] {
    if (!directEndpointName) {
      return [];
    }

    return this.visualEntities
      .filter((entity) => entity.type === EntityType.Route || entity.type === EntityType.Rest)
      .filter((entity) => entity.id !== targetRouteId)
      .filter((entity) => {
        const entityDefinition = entity.toJSON() as { route?: unknown; rest?: unknown };
        return (
          DirectRouteNavigationService.includesDirectToEndpoint(entityDefinition?.route, directEndpointName) ||
          DirectRouteNavigationService.includesDirectToEndpoint(entityDefinition?.rest, directEndpointName)
        );
      })
      .map((entity) => entity.id);
  }

  findDirectConsumerNodeId(routeId: string, directEndpointName: string): string | undefined {
    return this.findDirectNodeIdByRouteAndDirection(routeId, directEndpointName, 'from');
  }

  findDirectCallerNodeId(routeId: string, directEndpointName: string): string | undefined {
    return this.findDirectNodeIdByRouteAndDirection(routeId, directEndpointName, 'to');
  }

  private findDirectNodeIdByRouteAndDirection(
    routeId: string,
    directEndpointName: string,
    processorName: 'from' | 'to',
  ): string | undefined {
    if (!directEndpointName || !routeId) {
      return undefined;
    }

    const targetEntity = this.visualEntities.find((entity) => entity.id === routeId);
    if (!targetEntity) {
      return undefined;
    }

    const rootNode = targetEntity.toVizNode();
    const stack = [rootNode];

    while (stack.length > 0) {
      const currentNode = stack.pop();
      if (!currentNode) {
        continue;
      }

      const nodeData = currentNode.data as CamelRouteVisualEntityData;
      if (
        nodeData.processorName === processorName &&
        nodeData.componentName === 'direct' &&
        DirectRouteNavigationService.getDirectEndpointNameFromDefinition(currentNode.getNodeDefinition()) ===
          directEndpointName
      ) {
        return currentNode.getId();
      }

      const children = currentNode.getChildren();
      if (children) {
        children.forEach((child) => stack.push(child));
      }
    }

    return undefined;
  }

  private static includesDirectToEndpoint(value: unknown, directEndpointName: string): boolean {
    if (Array.isArray(value)) {
      return value.some((item) => this.includesDirectToEndpoint(item, directEndpointName));
    }

    if (typeof value !== 'object' || value === null) {
      return false;
    }

    return Object.entries(value).some(([key, entryValue]) => {
      if (key === 'to') {
        return this.getDirectEndpointNameFromDefinition(entryValue) === directEndpointName;
      }

      return this.includesDirectToEndpoint(entryValue, directEndpointName);
    });
  }
}
