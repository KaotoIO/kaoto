import { camelRouteJson } from '../stubs/camel-route';
import { isCamelRoute } from './is-camel-route';

describe('isCamelRoute', () => {
  it.each([
    [{ route: { from: 'direct:foo' } }, true],
    [camelRouteJson, true],
    [undefined, false],
    [null, false],
    [true, false],
    [false, false],
  ])('should mark %s as isCamelRoute: %s', (route, result) => {
    expect(isCamelRoute(route)).toEqual(result);
  });
});
