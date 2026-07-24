import { camelFromJson } from '../stubs/camel-from';
import { camelRouteJson } from '../stubs/camel-route';
import { isCamelRoute } from './is-camel-route';

describe('isCamelRoute', () => {
  it.each([
    [{ route: { from: 'direct:foo' } }, true],
    [{ from: 'direct:foo' }, false],
    [{ from: { uri: 'direct:foo', steps: [] } }, false],
    [camelRouteJson, true],
    [camelFromJson, false],
    [undefined, false],
    [null, false],
    [true, false],
    [false, false],
  ])('should mark %s as isCamelRoute: %s', (route, result) => {
    expect(isCamelRoute(route)).toEqual(result);
  });
});
