import type { SnapshotSerializer } from 'vitest';

/**
 * React's `useId()` (`_r_1a_`) and PatternFly's `GenerateId` (`pf-modal-part-2`) are module-level counters,
 * so their values depend on how many components rendered before the snapshot, not on the component itself.
 * This serializer replaces them with stable placeholders so snapshots don't change with test order.
 */
export const normalizeGeneratedIds = (value: string): string =>
  value
    // React useId(): `OUIA-Generated-Card-_r_25e_` -> `OUIA-Generated-Card-_r_ID_`
    .replaceAll(/_r_[0-9a-z]+_/g, '_r_ID_')
    // PatternFly GenerateId: `pf-modal-part-2` -> `pf-modal-part-ID`; class names like `pf-v6-c-card` or `pf-m-2xl` don't match
    .replaceAll(/\b(pf(?:-[a-z]+)+)-\d+\b/g, '$1-ID');

const serializer: SnapshotSerializer = {
  // pretty-format runs every string it prints (DOM attribute values, text nodes, object values) through here
  test: (val: unknown) => typeof val === 'string' && normalizeGeneratedIds(val) !== val,
  serialize: (val: string, config, indentation, depth, refs, printer) =>
    printer(normalizeGeneratedIds(val), config, indentation, depth, refs),
};

export default serializer;
