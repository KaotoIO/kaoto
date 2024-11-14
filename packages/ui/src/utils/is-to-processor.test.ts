import { isToProcessor } from './is-to-processor';

describe('isToProcessor', () => {
  it.each([
    [false, { to: 'mock' }],
    [false, { toD: 'mock' }],
    [false, {}],
    [true, { to: { uri: undefined } }],
    [true, { to: { uri: 'timer:myTimer' } }],
  ] as const)('should return %s when toDefinition is %s', (result, toDefinition) => {
    expect(isToProcessor(toDefinition)).toBe(result);
  });
});
