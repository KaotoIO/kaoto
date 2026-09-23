import { ROOT_PATH } from './get-value';
import { setValue } from './set-value';

describe('setValue', () => {
  it('should set the empty value at the given path', () => {
    const obj = { a: {} };
    setValue(obj, 'a', {});
    expect(obj).toEqual({ a: {} });
  });

  it('should set the empty arrays at the given path', () => {
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

  it('should remove the properties of the source object that are not in the value object at the root path', () => {
    const obj = { a: { b: { c: 1 } } };
    setValue(obj, ROOT_PATH, { d: 2 });
    expect(obj).toEqual({ d: 2 });
  });

  it('should remove all properties when assigning `undefined` to the root path', () => {
    const obj = { a: { b: { c: 1 } } };
    setValue(obj, ROOT_PATH, undefined);
    expect(obj).toEqual({});
  });
});
