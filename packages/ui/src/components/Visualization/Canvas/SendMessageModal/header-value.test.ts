import { describe, expect, it } from 'vitest';

import { validateHeaderValue } from './header-value';

describe('validateHeaderValue', () => {
  it.each([
    ['String', ''],
    [undefined, 'anything'],
    ['boolean', 'true'],
    ['java.lang.Boolean', 'false'],
    ['byte', '-128'],
    ['Byte', '127'],
    ['short', '-32768'],
    ['Short', '32767'],
    ['int', '-2147483648'],
    ['Integer', '2147483647'],
    ['long', '-9223372036854775808'],
    ['java.lang.Long', '9223372036854775807'],
    ['Float', '3.14'],
    ['double', '-1.2e100'],
    ['Character', 'a'],
  ])('accepts %s value %s', (type, value) => {
    expect(validateHeaderValue(value, type)).toBeUndefined();
  });

  it.each([
    ['Boolean', 'yes'],
    ['boolean', ''],
    ['byte', '128'],
    ['Byte', '-129'],
    ['short', '32768'],
    ['Short', '-32769'],
    ['int', '2147483648'],
    ['Integer', '-2147483649'],
    ['Long', '9223372036854775808'],
    ['long', '-9223372036854775809'],
    ['Integer', '1.5'],
    ['int', '1e2'],
    ['Integer', ''],
    ['Double', ''],
    ['Double', 'NaN'],
    ['Double', 'Infinity'],
    ['Double', '1e309'],
    ['Float', '1e39'],
    ['Double', '0x10'],
    ['double', 'abc'],
    ['char', ''],
    ['Character', 'ab'],
    ['char', '😀'],
  ])('rejects %s value %s', (type, value) => {
    expect(validateHeaderValue(value, type)).toEqual(expect.any(String));
  });
});
