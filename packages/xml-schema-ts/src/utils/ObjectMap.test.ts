import { QNameMap, SchemaKeyMap } from './ObjectMap';
import { XmlSchema } from '../XmlSchema';
import { SchemaKey } from '../SchemaKey';
import { QName } from '../QName';

describe('ObjectMap', () => {
  describe('SchemaKeyMap', () => {
    it('keys(), values() and entries() should work', () => {
      const map = new SchemaKeyMap<XmlSchema>();
      map.set(new SchemaKey('a', 'b'), new XmlSchema());
      map.set(new SchemaKey('c', 'd'), new XmlSchema());
      let keys = map.keys();
      expect(keys.next().value.getNamespace()).toEqual('a');
      expect(keys.next().value.getNamespace()).toEqual('c');
      keys = map.keys();
      const keysArray = Array.from(keys);
      expect(keysArray.length).toEqual(2);
      const values = map.values();
      expect(Array.from(values).length).toEqual(2);
      const entries = map.entries();
      expect(Array.from(entries).length).toEqual(2);
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
