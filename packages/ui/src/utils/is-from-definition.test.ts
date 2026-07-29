import { camelFromJson } from '../stubs/camel-from';
import { camelRouteJson } from '../stubs/camel-route';
import { isFromDefinition } from './is-from-definition';

describe('isFromDefinition', () => {
  it.each([
    [{ uri: 'direct:foo' }, true],
    [{ uri: 'timer:tick', steps: [] }, true],
    [{ uri: 'timer:start?period=1000&delay=2000&repeatCount=10', parameters: { timerName: 'user' } }, true],
    [{ uri: '', steps: [] }, true],
    [{ route: { from: 'direct:foo' } }, false],
    [{ from: 'direct:foo' }, false],
    [{ steps: [] }, false],
    [{ parameters: {} }, false],
    [camelFromJson.from, true],
    [camelRouteJson, false],
    [camelRouteJson.route.from, true],
    [undefined, false],
    [null, false],
    [true, false],
    [false, false],
    [[], false],
    ['direct:foo', false],
    [123, false],
    [{}, false],
  ])('should mark %s as isFromDefinition: %s', (entity, result) => {
    expect(isFromDefinition(entity)).toEqual(result);
  });

  it('should reject definitions whose uri is not a string', () => {
    expect(isFromDefinition({ uri: 123 })).toBe(false);
    expect(isFromDefinition({ uri: null })).toBe(false);
    expect(isFromDefinition({ uri: undefined })).toBe(false);
    expect(isFromDefinition({ uri: { scheme: 'direct' } })).toBe(false);
    expect(isFromDefinition({ uri: ['direct:foo'] })).toBe(false);
    expect(isFromDefinition({ uri: true })).toBe(false);
  });
});
