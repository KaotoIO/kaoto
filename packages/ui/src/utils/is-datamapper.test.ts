import { Step } from '@kaoto/camel-catalog/types';
import { datamapperRouteDefinitionStub } from '../stubs/data-mapper';
import { isDataMapperNode } from './is-datamapper';

describe('isDataMapperNode', () => {
  it('should return true if it has the right id and a xslt component', () => {
    const stepDefinition = datamapperRouteDefinitionStub.from.steps[0].step as Step;
    const result = isDataMapperNode(stepDefinition);

    expect(result).toBe(true);
  });

  it('should return false if it has the right id but no xslt component', () => {
    const stepDefinition = datamapperRouteDefinitionStub.from.steps[0].step as Step;
    stepDefinition.steps![0].to = { uri: 'direct:log' };

    const result = isDataMapperNode(stepDefinition);

    expect(result).toBe(false);
  });

  it('should return false if it has no id but a xslt component', () => {
    const stepDefinition = datamapperRouteDefinitionStub.from.steps[0].step as Step;
    stepDefinition.id = 'step-1234';

    const result = isDataMapperNode(stepDefinition);

    expect(result).toBe(false);
  });
});
