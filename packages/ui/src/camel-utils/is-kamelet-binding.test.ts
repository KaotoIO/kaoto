import { isKameletBinding } from './is-kamelet-binding';
import { kameletBindingJson } from '../stubs/kamelet-binding';

describe('isKameBinding', () => {
  it.each([
    [{ apiVersion: 'camel.apache.org/v1alpha1', kind: 'KameletBinding' }, true],
    [kameletBindingJson, true],
    [undefined, false],
    [null, false],
    [true, false],
    [false, false],
  ])('should mark %s as isKameBinding: %s', (route, result) => {
    expect(isKameletBinding(route)).toEqual(result);
  });
});
