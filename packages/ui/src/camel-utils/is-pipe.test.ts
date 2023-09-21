import { isPipe } from './is-pipe';
import { pipeJson } from '../stubs/pipe-route';

describe('isPipe', () => {
  it.each([
    [{ apiVersion: 'camel.apache.org/v1', kind: 'Pipe' }, true],
    [pipeJson, true],
    [undefined, false],
    [null, false],
    [true, false],
    [false, false],
  ])('should mark %s as isPipe: %s', (route, result) => {
    expect(isPipe(route)).toEqual(result);
  });
});
