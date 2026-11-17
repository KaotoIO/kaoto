import { IField } from '../../models/datamapper/document';

/**
 * Computes a field's position in its document's effective content model as a root-to-leaf index
 * path, so two fields can be compared in one coordinate space even when one is nested inside a
 * synthetic wrapper field (`choice`, `abstract`, a `sequence` inside a choice) and the other is a
 * plain sibling. Shared between authoring-time insertion ({@link MappingActionService.insertInTargetOrder})
 * and serialization-time ordering ({@link MappingSerializerService}), so both agree on target schema
 * position.
 */
export class FieldOrderService {
  /**
   * Index of `field` within each ancestor's `fields`, from the document root down. A wrapper field
   * occupies a slot in its own parent's `fields` array, so a choice member's path is
   * `[..., wrapperIndex, memberIndex]` and compares correctly against a plain sibling's
   * `[..., siblingIndex]` via {@link compareOrderPaths}. A detached field — not found in its
   * parent's `fields`, where `indexOf` returns `-1` — ranks first through every ancestor level;
   * this is today's behavior and is kept as-is.
   */
  static getFieldOrderPath(field: IField): number[] {
    const path: number[] = [];
    let current: IField = field;
    while (current.parent?.fields) {
      path.unshift(current.parent.fields.indexOf(current));
      if (!('parent' in current.parent) || current.parent === current) break;
      current = current.parent as IField;
    }
    return path;
  }

  /**
   * Lexicographic comparison of two root-to-leaf index paths from {@link getFieldOrderPath}, shorter
   * prefix first. A total order over paths of any length, including paths containing a detached
   * field's `-1`.
   */
  static compareOrderPaths(a: number[], b: number[]): number {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] !== b[i]) return a[i] - b[i];
    }
    return a.length - b.length;
  }
}
