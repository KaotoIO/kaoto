import { Pair } from 'yaml';

export type PairKey = { value: string };
/**
 * Sort properties in a Apache Camel friendly format.
 *
 * The order goes as follows:
 *   1. `id` prop
 *   2. `description` prop
 *   3. `uri` prop
 *   4. `parameters` prop
 *   5. `steps` prop
 *   6. the remaining properties in alphabetical order
 */
export const createCamelPropertiesSorter =
  (order: string[]) => (a: Pair<PairKey, unknown>, b: Pair<PairKey, unknown>) => {
    const aIndex = order.indexOf(a.key.value);
    const bIndex = order.indexOf(b.key.value);

    if (aIndex === -1 && bIndex === -1) {
      return a.key.value.localeCompare(b.key.value);
    }

    if (aIndex === -1) {
      return 1;
    }

    if (bIndex === -1) {
      return -1;
    }

    return aIndex - bIndex;
  };
