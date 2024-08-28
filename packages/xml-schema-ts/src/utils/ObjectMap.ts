import { QName } from '../QName';
import { SchemaKey } from '../SchemaKey';

/**
 * The Map which uses a class instance as a key where if the stringified key matches then it's considered same.
 */
abstract class ObjectMap<K, V> {
  private delegate = new Map<string, V>();

  get(key: K) {
    return this.delegate.get(this.keyToString(key));
  }

  set(key: K, value: V) {
    this.delegate.set(this.keyToString(key), value);
  }

  has(key: K) {
    return this.delegate.has(this.keyToString(key));
  }

  delete(key: K) {
    this.delegate.delete(this.keyToString(key));
  }

  get size() {
    return this.delegate.size;
  }

  clear() {
    this.delegate.clear();
  }

  abstract stringToKey(stringified: string): K;
  abstract keyToString(key: K): string;

  keys(): IterableIterator<K> {
    const delegateKeys = this.delegate.keys();
    return new KeysBridge<K>(delegateKeys, this.stringToKey);
  }

  entries(): IterableIterator<[K, V]> {
    const delegateEntries = this.delegate.entries();
    return new EntriesBridge<K, V>(delegateEntries, this.stringToKey);
  }

  values(): IterableIterator<V> {
    return this.delegate.values();
  }
}

class KeysBridge<K> implements IterableIterator<K> {
  constructor(
    private delegateKeys: IterableIterator<string>,
    private stringToKey: (stringifiedKey: string) => K,
  ) {}

  [Symbol.iterator](): IterableIterator<K> {
    return this;
  }

  /* eslint-disable  @typescript-eslint/no-explicit-any */
  next(): IteratorResult<K, K> {
    const next = this.delegateKeys.next();
    if (!next.value) {
      return next as any;
    }
    const key: K = this.stringToKey(next.value);
    return { value: key };
  }
}

class EntriesBridge<K, V> implements IterableIterator<[K, V]> {
  constructor(
    private delegateEntries: IterableIterator<[string, V]>,
    private stringToKey: (stringifiedKey: string) => K,
  ) {}

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this;
  }

  /* eslint-disable  @typescript-eslint/no-explicit-any */
  next(): IteratorResult<[K, V], [K, V] | undefined> {
    const next = this.delegateEntries.next();
    if (!next.value) {
      return next as any;
    }
    const key: K = this.stringToKey(next.value[0]);
    return { value: [key, next.value[1]] };
  }
}

export class QNameMap<V> extends ObjectMap<QName, V> {
  stringToKey(stringified: string): QName {
    const obj = Object.assign(new QName(null, null), JSON.parse(stringified));
    obj.prefix = undefined;
    return obj;
  }
  keyToString(key: QName): string {
    return JSON.stringify(new QName(key.getNamespaceURI(), key.getLocalPart()));
  }
}

export class SchemaKeyMap<V> extends ObjectMap<SchemaKey, V> {
  stringToKey(stringified: string): SchemaKey {
    return Object.assign(new SchemaKey(), JSON.parse(stringified));
  }
  keyToString(key: SchemaKey): string {
    return JSON.stringify(key);
  }
}
