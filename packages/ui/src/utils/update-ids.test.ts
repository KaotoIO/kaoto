import { updateIds } from './update-ids';
import { getCamelRandomId } from '../camel-utils/camel-random-id';

// Mock the getCamelRandomId function
jest.mock('../camel-utils/camel-random-id', () => ({
  getCamelRandomId: jest.fn((id) => `random-${id}`),
}));

describe('updateIds', () => {
  it('should handle objects without ids', () => {
    const input = { name: 'testNode', value: 42 };
    const result = updateIds(input);

    expect(result).toEqual({ name: 'testNode', value: 42 });
    expect(getCamelRandomId).not.toHaveBeenCalled();
  });

  it('should handle non-object inputs gracefully', () => {
    const input = 'stringValue';
    const result = updateIds(input);

    expect(result).toEqual('stringValue');
    expect(getCamelRandomId).not.toHaveBeenCalled();
  });

  it('should handle empty objects and arrays', () => {
    const inputObject = {};
    const resultObject = updateIds(inputObject);

    expect(resultObject).toEqual({});
    expect(getCamelRandomId).not.toHaveBeenCalled();
  });

  it('should update the id of a single object', () => {
    const input = { defaultValue: { id: 'node1', name: 'testNode' } };
    const result = updateIds(input);

    expect(result.defaultValue.id).toEqual('random-node1');
    expect(getCamelRandomId).toHaveBeenCalledWith('node1');
  });

  it('should update the ids of nested objects', () => {
    const input = {
      defaultValue: {
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

    expect(result.defaultValue.id).toEqual('random-node1');
    expect(result.defaultValue.child.id).toEqual('random-node2');
    expect(result.defaultValue.child.grandchild.id).toEqual('random-node3');
    expect(getCamelRandomId).toHaveBeenCalledWith('node1');
    expect(getCamelRandomId).toHaveBeenCalledWith('node2');
    expect(getCamelRandomId).toHaveBeenCalledWith('node3');
  });
});
