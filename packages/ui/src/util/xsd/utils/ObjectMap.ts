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

  abstract createEntriesBridge(delegateEntries: IterableIterator<[string, V]>): IterableIterator<[K, V]>;

  entries(): IterableIterator<[K, V]> {
    /* eslint-disable  @typescript-eslint/no-explicit-any */
    const delegateEntries = this.delegate.entries();
    return this.createEntriesBridge(delegateEntries);
  }

  values() {
    return this.delegate.values();
  }
}

abstract class EntriesBridge<K, V> implements IterableIterator<[K, V]> {
  constructor(private delegateEntries: IterableIterator<[string, V]>) {}

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this;
  }

  abstract newKeyInstance(stringified: string): K;

  next(): IteratorResult<[K, V], any> {
    const next = this.delegateEntries.next();
    return Array.isArray(next) ? [this.newKeyInstance(next[0]), next[1]] : (next as any);
  }
}

export class QNameMap<V> extends ObjectMap<QName, V> {
  createEntriesBridge(delegateEntries: IterableIterator<[string, V]>): IterableIterator<[QName, V]> {
    return new (class extends EntriesBridge<QName, V> {
      newKeyInstance(stringified: string): QName {
        return Object.assign(new QName(null, null), JSON.parse(stringified));
      }
    })(delegateEntries);
  }
}

export class SchemaKeyMap<V> extends ObjectMap<SchemaKey, V> {
  createEntriesBridge(delegateEntries: IterableIterator<[string, V]>): IterableIterator<[SchemaKey, V]> {
    return new (class extends EntriesBridge<SchemaKey, V> {
      newKeyInstance(stringified: string): SchemaKey {
        return Object.assign(new SchemaKey(), JSON.parse(stringified));
      }
    })(delegateEntries);
  }
}
