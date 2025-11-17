import { getCamelRandomId } from '../camel-utils/camel-random-id';
import { updateIds } from './update-ids';

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

  it('should handle empty objects', () => {
    const inputObject = {};
    const resultObject = updateIds(inputObject);

    expect(resultObject).toEqual({});
    expect(getCamelRandomId).not.toHaveBeenCalled();
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

    expect(result.definition.id).toEqual('random-setHeaders');
    expect(result.definition.headers[0].id).toEqual('random-test-node1');
    expect(result.definition.headers[1].id).toEqual('random-test-node2');
  });

  it('should update the id of a single object', () => {
    const input = { definition: { id: 'node1', name: 'testNode' } };
    const result = updateIds(input);

    expect(result.definition.id).toEqual('random-node1');
    expect(getCamelRandomId).toHaveBeenCalledWith('node1');
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

    expect(result.definition.id).toEqual('random-node1');
    expect(result.definition.child.id).toEqual('random-node2');
    expect(result.definition.child.grandchild.id).toEqual('random-node3');
    expect(getCamelRandomId).toHaveBeenCalledWith('node1');
    expect(getCamelRandomId).toHaveBeenCalledWith('node2');
    expect(getCamelRandomId).toHaveBeenCalledWith('node3');
  });
});
