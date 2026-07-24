import { camelFromJson } from '../stubs/camel-from';
import { camelRouteJson } from '../stubs/camel-route';
import { isCamelFrom } from './is-camel-from';

describe('isCamelFrom', () => {
  it.each([
    [{ route: { from: 'direct:foo' } }, false],
    [{ from: 'direct:foo' }, false],
    [{ from: { uri: 'direct:foo' } }, true],
    [{ from: { uri: 'direct:foo', steps: [] } }, true],
    [camelRouteJson, false],
    [camelFromJson, true],
    [undefined, false],
    [null, false],
    [true, false],
    [false, false],
  ])('should mark %s as isCamelFrom: %s', (route, result) => {
    expect(isCamelFrom(route)).toEqual(result);
  });
});
