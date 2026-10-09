import { ROOT_PATH, safeGetValue } from './get-value';

describe('safeGetValue', () => {
  it('should return the value of the given path', () => {
    const obj = { a: { b: { c: 1 } } };
    const path = 'a.b.c';
    const value = safeGetValue(obj, path);
    expect(value).toBe(1);
  });

  it('should return the default value if the path does not exist', () => {
    const obj = { a: { b: { c: 1 } } };
    const path = 'a.b.d';
    const defaultValue = 2;
    const value = safeGetValue(obj, path, defaultValue);
    expect(value).toBe(defaultValue);
  });

  it('should return the value for a path that is an array', () => {
    const obj = { a: { b: [{ c: 1 }, { c: 2 }] } };
    const path = ['a', 'b', '1', 'c'];
    const value = safeGetValue(obj, path);
    expect(value).toBe(2);
  });

  it('should return the root object if the path is the root path', () => {
    const obj = { a: { b: { c: 1 } } };
    const path = ROOT_PATH;
    const value = safeGetValue(obj, path);
    expect(value).toBe(obj);
  });
});
