import { isKamelet } from './is-kamelet';
import { kameletJson } from '../stubs/kamelet';
import { kameletBindingJson } from '../stubs/kamelet-route.ts';

describe('isKamelet', () => {
  it.each([
    [{ apiVersion: 'camel.apache.org/v1alpha1', kind: 'Kamelet' }, true],
    [kameletJson, true],
    [kameletBindingJson, false],
    [undefined, false],
    [null, false],
    [true, false],
    [false, false],
  ])('should mark %s as isKamelet: %s', (route, result) => {
    expect(isKamelet(route)).toEqual(result);
  });
});
