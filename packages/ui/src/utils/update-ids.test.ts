import type { MockInstance } from 'vitest';

import { updateIds } from './update-ids';

describe('updateIds', () => {
  let getRandomValuesSpy: MockInstance<Crypto['getRandomValues']>;

  beforeEach(() => {
    // Pin the crypto object so getCamelRandomId() uses the spied getRandomValues, which yields 1001, 1002, 1003...
    const cryptoObj = globalThis.crypto;
    vi.spyOn(globalThis, 'crypto', 'get').mockReturnValue(cryptoObj);

    let randomValue = 1000;
    getRandomValuesSpy = vi.spyOn(cryptoObj, 'getRandomValues').mockImplementation((array) => {
      if (array instanceof Uint32Array) {
        array.fill(++randomValue);
      }
      return array;
    });
  });

  it('should handle objects without ids', () => {
    const input = { name: 'testNode', value: 42 };
    const result = updateIds(input);

    expect(result).toEqual({ name: 'testNode', value: 42 });
    expect(getRandomValuesSpy).not.toHaveBeenCalled();
  });

  it('should handle non-object inputs gracefully', () => {
    const input = 'stringValue';
    const result = updateIds(input);

    expect(result).toBe('stringValue');
    expect(getRandomValuesSpy).not.toHaveBeenCalled();
  });

  it('should handle empty objects', () => {
    const inputObject = {};
    const resultObject = updateIds(inputObject);

    expect(resultObject).toEqual({});
    expect(getRandomValuesSpy).not.toHaveBeenCalled();
  });

  it('should update the id of a array object', () => {
    const input = {
      definition: {
        id: 'setHeaders',
        headers: [
          { id: 'test-node1', name: '' },
          { id: 'test-node2', name: '' },
        ],
      },
    };
    const result = updateIds(input);

    expect(result.definition.id).toBe('setHeaders-1001');
    expect(result.definition.headers[0].id).toBe('test-node1-1002');
    expect(result.definition.headers[1].id).toBe('test-node2-1003');
  });

  it('should update the id of a single object', () => {
    const input = { definition: { id: 'node1', name: 'testNode' } };
    const result = updateIds(input);

    expect(result.definition.id).toBe('node1-1001');
    expect(getRandomValuesSpy).toHaveBeenCalledTimes(1);
  });

  it('should update the ids of nested objects', () => {
    const input = {
      definition: {
        id: 'node1',
        child: {
          id: 'node2',
          grandchild: {
            id: 'node3',
          },
        },
      },
    };
    const result = updateIds(input);

    expect(result.definition.id).toBe('node1-1001');
    expect(result.definition.child.id).toBe('node2-1002');
    expect(result.definition.child.grandchild.id).toBe('node3-1003');
    expect(getRandomValuesSpy).toHaveBeenCalledTimes(3);
  });
});
