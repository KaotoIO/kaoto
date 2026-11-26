import { MaxOccursType } from '../../xml-schema-ts/constants';
import type { IField } from './document';

/**
 * A pair of occurrence bounds, `minOccurs` and `maxOccurs`. It is a plain bound pair, not an occurrence badge.
 *
 * It reads only the two plain properties, so object-literal and spread copies of an {@link IField} give the same
 * answer as the original field. No property is added to `IField`, because prototype getters do not survive such
 * copies.
 */
export class Occurrence {
  constructor(
    readonly minOccurs: number,
    readonly maxOccurs: MaxOccursType,
  ) {}

  /**
   * `true` when `maxOccurs` is `'unbounded'` or a number above 1. This covers the `Number.MAX_SAFE_INTEGER`
   * the JSON Schema model assigns to array items. A `maxOccurs` of `0` or `NaN` is not a collection.
   *
   * Applied to a field, it reads the bounds the field declares, so it answers "does this wrapper or element
   * repeat". Whether a tree row repeats is {@link FieldCardinality.isRepeating}.
   * @param value - A field, or any object carrying a `maxOccurs`
   * @returns whether that `maxOccurs` makes it a collection
   */
  static isCollection(value: Pick<IField, 'maxOccurs'>): boolean {
    return value.maxOccurs === 'unbounded' || Number(value.maxOccurs) > 1;
  }

  /**
   * Instance form of {@link Occurrence.isCollection}, applied to this pair's `maxOccurs`.
   */
  get isCollection(): boolean {
    return Occurrence.isCollection(this);
  }
}

/**
 * The cardinality of one field as two separate occurrences, so every reader names which one it means.
 *
 * - `own` is the field's own bounds. For a substitution group member these are the bounds of the particle that
 *   references the head, since every member is counted against that particle.
 * - `effective` is how often the field can occur in its nearest real ancestor element: the bounds multiplied
 *   along the choice, sequence and abstract wrappers in between, with a minimum of 0 through a choice or
 *   substitution group with two or more alternatives.
 *
 * Keeping both values apart lets the popover show both, while the collection icon and the collection-gated
 * mapping actions read only the effective one. Instances are built by `DocumentService.getCardinality`.
 */
export class FieldCardinality {
  constructor(
    readonly own: Occurrence,
    readonly effective: Occurrence,
  ) {}

  /**
   * `true` when the row repeats: the effective occurrence is a collection. This is the answer the collection
   * icon, the collection-gated mapping actions and the automatic `for-each` read.
   */
  get isRepeating(): boolean {
    return this.effective.isCollection;
  }
}
