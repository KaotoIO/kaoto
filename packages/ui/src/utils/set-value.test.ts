import { ROOT_PATH } from './get-value';
import { setValue } from './set-value';

describe('setValue', () => {
  it('replace empty objects `{}` with `undefined`', () => {
    const obj = { a: {} };
    setValue(obj, 'a', {});
    expect(obj).toEqual({ a: undefined });
  });

  it('should not replace empty arrays `[]` with `undefined`', () => {
    const obj = { a: [] };
    setValue(obj, 'a', []);
    expect(obj).toEqual({ a: [] });
  });

  it('should ignore empty objects `{}` when setting it at root path', () => {
    const obj = {};
    setValue(obj, ROOT_PATH, {});
    expect(obj).toEqual({});
  });

  it('should ignore empty objects `undefined` when setting it at root path', () => {
    const obj = {};
    setValue(obj, ROOT_PATH, undefined);
    expect(obj).toEqual({});
  });

  it('should set the value at the given path', () => {
    const obj = { a: { b: { c: 1 } } };
    setValue(obj, 'a.b.c', 2);
    expect(obj).toEqual({ a: { b: { c: 2 } } });
  });

  it('should combine the properties of the value at the root path', () => {
    const obj = { a: { b: { c: 1 } } };
    setValue(obj, ROOT_PATH, { d: 2 });
    expect(obj).toEqual({ a: { b: { c: 1 } }, d: 2 });
  });
});
