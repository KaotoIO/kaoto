import { Step } from '@kaoto/camel-catalog/types';

import { IVisualizationNode } from '../../models';
import { datamapperRouteDefinitionStub } from '../../stubs/datamapper/data-mapper';
import { datamapperActivationFn } from './datamapper.activationfn';

describe('datamapperActivationFn', () => {
  it('should return false if vizNode is `undefined`', () => {
    const result = datamapperActivationFn();

    expect(result).toBe(false);
  });

  it('should return false if stepDefinition is undefined', () => {
    const result = datamapperActivationFn({
      getNodeDefinition: () => undefined,
    } as unknown as IVisualizationNode);

    expect(result).toBe(false);
  });

  it('should return `true` if stepDefinition is a DataMapper node', () => {
    const result = datamapperActivationFn({
      getNodeDefinition: () => datamapperRouteDefinitionStub.from.steps[0].step as Step,
    } as unknown as IVisualizationNode);

    expect(result).toBe(true);
  });
});
