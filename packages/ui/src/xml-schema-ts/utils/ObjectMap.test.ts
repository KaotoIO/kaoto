import { QName } from '../QName';
import { SchemaKey } from '../SchemaKey';
import { XmlSchema } from '../XmlSchema';
import { QNameMap, SchemaKeyMap } from './ObjectMap';

describe('ObjectMap', () => {
  describe('SchemaKeyMap', () => {
    it('keys(), values() and entries() should work', () => {
      const map = new SchemaKeyMap<XmlSchema>();
      map.set(new SchemaKey('a', 'b'), new XmlSchema());
      map.set(new SchemaKey('c', 'd'), new XmlSchema());
      let keys = map.keys();
      expect(keys.next().value.getNamespace()).toBe('a');
      expect(keys.next().value.getNamespace()).toBe('c');
      keys = map.keys();
      const keysArray = Array.from(keys);
      expect(keysArray).toHaveLength(2);
      const values = map.values();
      expect(Array.from(values)).toHaveLength(2);
      const entries = map.entries();
      expect(Array.from(entries)).toHaveLength(2);
    });
  });

  describe('QNameMap', () => {
    it('should ignore QName prefix', () => {
      const map = new QNameMap<XmlSchema>();
      map.set(new QName('a', 'b'), new XmlSchema());
      map.set(new QName('c', 'd'), new XmlSchema());
      expect(map.get(new QName('a', 'b', 'c'))).toBeTruthy();
    });
  });
});
