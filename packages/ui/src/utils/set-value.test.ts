import { ROOT_PATH } from './get-value';
import { setValue } from './set-value';

describe('setValue', () => {
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
