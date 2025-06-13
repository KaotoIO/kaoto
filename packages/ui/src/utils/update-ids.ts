import { getCamelRandomId } from '../camel-utils/camel-random-id';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const updateIds = (node: any) => {
  if (typeof node === 'object' && node !== null) {
    for (const key in node) {
      const value = node[key];

      // If the value is a node with an id, update it
      if (value && typeof value === 'object' && 'id' in value) {
        value.id = getCamelRandomId(value['id']);
      }

      // Recurse into nested objects or arrays
      if (typeof value === 'object') {
        updateIds(value);
      }
    }
  }

  return node;
};
