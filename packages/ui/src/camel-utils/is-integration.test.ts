import { integrationJson } from '../stubs/integration';
import { isIntegration } from './is-integration.ts';

describe('isIntegration', () => {
  it.each([
    [{ apiVersion: 'camel.apache.org/v1alpha1', kind: 'Integration' }, true],
    [integrationJson, true],
    [undefined, false],
    [null, false],
    [true, false],
    [false, false],
  ])('should mark %s as isIntegration: %s', (route, result) => {
    expect(isIntegration(route)).toEqual(result);
  });
});
