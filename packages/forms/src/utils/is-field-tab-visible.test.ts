import { isFieldTabVisible } from './is-field-tab-visible';

describe('isFieldTabVisible', () => {
  it('returns true for any field when selectedTab is "All"', () => {
    expect(isFieldTabVisible({ type: 'string' }, undefined, false, 'All')).toBe(true);
  });

  it('returns true for a required field when selectedTab is "Required"', () => {
    expect(isFieldTabVisible({ type: 'string' }, undefined, true, 'Required')).toBe(true);
  });

  it('returns false for an optional field with no value when selectedTab is "Required"', () => {
    expect(isFieldTabVisible({ type: 'string' }, undefined, false, 'Required')).toBe(false);
  });

  it('returns true for an optional complex field with a value when selectedTab is "Required"', () => {
    expect(
      isFieldTabVisible({ type: 'object', properties: { a: { type: 'string' } } }, { a: 'x' }, false, 'Required'),
    ).toBe(true);
  });

  it('returns false for an optional empty-properties object field when selectedTab is "Required"', () => {
    // isPropertiesField guard: object with no defined properties is not loaded
    expect(isFieldTabVisible({ type: 'object', properties: {} }, { a: 'x' }, false, 'Required')).toBe(false);
  });

  it('returns true for a field with a value when selectedTab is "Modified"', () => {
    expect(isFieldTabVisible({ type: 'string' }, 'hello', false, 'Modified')).toBe(true);
  });

  it('returns false for a field without a value when selectedTab is "Modified"', () => {
    expect(isFieldTabVisible({ type: 'string' }, undefined, false, 'Modified')).toBe(false);
  });
});
