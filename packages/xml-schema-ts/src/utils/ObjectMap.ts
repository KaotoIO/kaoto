import { QName } from '../QName';
import { SchemaKey } from '../SchemaKey';

/**
 * The Map which uses a class instance as a key where if the stringified key matches then it's considered same.
 */
abstract class ObjectMap<K, V> {
  private delegate = new Map<string, V>();

  get(key: K) {
    return this.delegate.get(JSON.stringify(key));
  }

  set(key: K, value: V) {
    this.delegate.set(JSON.stringify(key), value);
  }

  has(key: K) {
    return this.delegate.has(JSON.stringify(key));
  }

  delete(key: K) {
    this.delegate.delete(JSON.stringify(key));
  }

  get size() {
    return this.delegate.size;
  }

  clear() {
    this.delegate.clear();
  }

  abstract newKeyInstance(stringified: string): K;

  keys() {
    const delegateKeys = this.delegate.keys();
    return new KeysBridge<K>(delegateKeys, this.newKeyInstance);
  }

  entries(): IterableIterator<[K, V]> {
    const delegateEntries = this.delegate.entries();
    return new EntriesBridge<K, V>(delegateEntries, this.newKeyInstance);
  }

  values() {
    return this.delegate.values();
  }
}

class KeysBridge<K> implements IterableIterator<K> {
  constructor(
    private delegateKeys: IterableIterator<string>,
    private newKeyInstance: (stringifiedKey: string) => K,
  ) {}

  [Symbol.iterator](): IterableIterator<K> {
    return this;
  }

  /* eslint-disable  @typescript-eslint/no-explicit-any */
  next(): IteratorResult<K, any> {
    const next = this.delegateKeys.next();
    if (!next.value) {
      return next as any;
    }
    const key: K = this.newKeyInstance(next.value);
    return { value: key, done: true };
  }
}

class EntriesBridge<K, V> implements IterableIterator<[K, V]> {
  constructor(
    private delegateEntries: IterableIterator<[string, V]>,
    private newKeyInstance: (stringifiedKey: string) => K,
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
    const key: K = this.newKeyInstance(next.value[0]);
    return { value: [key, next.value[1]], done: true };
  }
}

export class QNameMap<V> extends ObjectMap<QName, V> {
  newKeyInstance(stringified: string): QName {
    return Object.assign(new QName(null, null), JSON.parse(stringified));
  }
}

export class SchemaKeyMap<V> extends ObjectMap<SchemaKey, V> {
  newKeyInstance(stringified: string): SchemaKey {
    return Object.assign(new SchemaKey(), JSON.parse(stringified));
  }
}
