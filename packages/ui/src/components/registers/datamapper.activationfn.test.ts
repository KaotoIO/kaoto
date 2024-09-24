import { Step } from '@kaoto/camel-catalog/types';
import { IVisualizationNode, KaotoSchemaDefinition } from '../../models';
import { datamapperRouteDefinitionStub } from '../../stubs/data-mapper';
import { datamapperActivationFn } from './datamapper.activationfn';

describe('datamapperActivationFn', () => {
  it('should return false if vizNode is `undefined`', () => {
    const result = datamapperActivationFn(undefined);

    expect(result).toBe(false);
  });

  it('should return false if stepDefinition is undefined', () => {
    const result = datamapperActivationFn({
      getComponentSchema: () => ({
        title: 'Data mapper',
        definition: undefined,
        schema: {} as KaotoSchemaDefinition['schema'],
      }),
    } as unknown as IVisualizationNode);

    expect(result).toBe(false);
  });

  it('should return `true` if stepDefinition is a Data Mapper node', () => {
    const result = datamapperActivationFn({
      getComponentSchema: () => ({
        title: 'Data mapper',
        definition: datamapperRouteDefinitionStub.from.steps[0].step as Step,
        schema: {} as KaotoSchemaDefinition['schema'],
      }),
    } as unknown as IVisualizationNode);

    expect(result).toBe(true);
  });
});
