import { ProcessorDefinition } from '@kaoto/camel-catalog/types';

import { IVisualizationNode } from '../../models';
import { DirectRouteNavigationService } from '../../models/camel/direct-route-navigation.service';
import { CamelRouteVisualEntityData } from '../../models/visualization/flows/support/camel-component-types';
import { directRouteNavigationActivationFn } from './direct-route-navigation.activationfn';

jest.mock('../../models/camel/direct-route-navigation.service');

describe('directRouteNavigationActivationFn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false if vizNode data is not a direct component', () => {
    const vizNode = {
      data: {
        processorName: 'to',
        componentName: 'http',
      } as CamelRouteVisualEntityData,
      getNodeDefinition: jest.fn().mockReturnValue({}),
    } as unknown as IVisualizationNode;

    const result = directRouteNavigationActivationFn(vizNode);

    expect(result).toBe(false);
    expect(DirectRouteNavigationService.getDirectEndpointNameFromDefinition).not.toHaveBeenCalled();
  });

  it('should return false if processorName is not "to" or "from"', () => {
    const vizNode = {
      data: {
        processorName: 'log',
        componentName: 'direct',
      } as CamelRouteVisualEntityData,
      getNodeDefinition: jest.fn().mockReturnValue({}),
    } as unknown as IVisualizationNode;

    const result = directRouteNavigationActivationFn(vizNode);

    expect(result).toBe(false);
    expect(DirectRouteNavigationService.getDirectEndpointNameFromDefinition).not.toHaveBeenCalled();
  });

  it('should return true for direct "to" node with valid endpoint name', () => {
    const nodeDefinition = { uri: 'direct:myEndpoint' };
    const vizNode = {
      data: {
        processorName: 'to',
        componentName: 'direct',
      } as CamelRouteVisualEntityData,
      getNodeDefinition: jest.fn().mockReturnValue(nodeDefinition),
    } as unknown as IVisualizationNode;

    jest.spyOn(DirectRouteNavigationService, 'getDirectEndpointNameFromDefinition').mockReturnValue('myEndpoint');

    const result = directRouteNavigationActivationFn(vizNode);

    expect(result).toBe(true);
    expect(DirectRouteNavigationService.getDirectEndpointNameFromDefinition).toHaveBeenCalledWith(nodeDefinition);
  });

  it('should return true for direct "from" node with valid endpoint name', () => {
    const nodeDefinition = { uri: 'direct:anotherEndpoint' };
    const vizNode = {
      data: {
        processorName: 'from' as keyof ProcessorDefinition,
        componentName: 'direct',
      } as CamelRouteVisualEntityData,
      getNodeDefinition: jest.fn().mockReturnValue(nodeDefinition),
    } as unknown as IVisualizationNode;

    jest.spyOn(DirectRouteNavigationService, 'getDirectEndpointNameFromDefinition').mockReturnValue('anotherEndpoint');

    const result = directRouteNavigationActivationFn(vizNode);

    expect(result).toBe(true);
    expect(DirectRouteNavigationService.getDirectEndpointNameFromDefinition).toHaveBeenCalledWith(nodeDefinition);
  });

  it('should return false for direct "to" node without endpoint name', () => {
    const nodeDefinition = { uri: 'direct:' };
    const vizNode = {
      data: {
        processorName: 'to',
        componentName: 'direct',
      } as CamelRouteVisualEntityData,
      getNodeDefinition: jest.fn().mockReturnValue(nodeDefinition),
    } as unknown as IVisualizationNode;

    jest.spyOn(DirectRouteNavigationService, 'getDirectEndpointNameFromDefinition').mockReturnValue(undefined);

    const result = directRouteNavigationActivationFn(vizNode);

    expect(result).toBe(false);
    expect(DirectRouteNavigationService.getDirectEndpointNameFromDefinition).toHaveBeenCalledWith(nodeDefinition);
  });

  it('should return false for direct "from" node without endpoint name', () => {
    const nodeDefinition = { uri: 'direct:' };
    const vizNode = {
      data: {
        processorName: 'from' as keyof ProcessorDefinition,
        componentName: 'direct',
      } as CamelRouteVisualEntityData,
      getNodeDefinition: jest.fn().mockReturnValue(nodeDefinition),
    } as unknown as IVisualizationNode;

    jest.spyOn(DirectRouteNavigationService, 'getDirectEndpointNameFromDefinition').mockReturnValue(undefined);

    const result = directRouteNavigationActivationFn(vizNode);

    expect(result).toBe(false);
    expect(DirectRouteNavigationService.getDirectEndpointNameFromDefinition).toHaveBeenCalledWith(nodeDefinition);
  });

  it('should handle edge case with empty componentName', () => {
    const vizNode = {
      data: {
        processorName: 'to',
        componentName: '',
      } as CamelRouteVisualEntityData,
      getNodeDefinition: jest.fn().mockReturnValue({}),
    } as unknown as IVisualizationNode;

    const result = directRouteNavigationActivationFn(vizNode);

    expect(result).toBe(false);
    expect(DirectRouteNavigationService.getDirectEndpointNameFromDefinition).not.toHaveBeenCalled();
  });
});
