import { MaxOccursType } from '../../xml-schema-ts/constants';
import type { IField } from './document';

/**
 * The structural cardinality of one field, taken from its own `minOccurs` and `maxOccurs`.
 *
 * It deliberately ignores wrappers and enclosing compositors, so it answers "does this field itself repeat"
 * and not "does this row repeat". Use `VisualizationUtilService.getEffectiveCardinality` for the answer for a
 * tree row, which also inherits repetition from the outermost repeating wrapper above the field.
 *
 * Instances are built from the two plain properties only, so object-literal and spread copies of an
 * {@link IField} give the same answer as the original field. No property is added to `IField`, because
 * prototype getters do not survive such copies.
 */
export class FieldCardinality {
  constructor(
    readonly minOccurs: number,
    readonly maxOccurs: MaxOccursType,
  ) {}

  /**
   * Reads the cardinality of a single field.
   * @param field - The field, or any object carrying its `minOccurs` and `maxOccurs`
   * @returns The field's own cardinality
   */
  static of(field: Pick<IField, 'minOccurs' | 'maxOccurs'>): FieldCardinality {
    return new FieldCardinality(field.minOccurs, field.maxOccurs);
  }

  /**
   * `true` when `maxOccurs` is `'unbounded'` or a number above 1. This covers the `Number.MAX_SAFE_INTEGER`
   * the JSON Schema model assigns to array items. A `maxOccurs` of `0`, or the `NaN` the schema parser
   * produces for a non-numeric attribute, is not a collection.
   *
   * Use this static form for a one-off check on a field, so no instance is allocated. Build an instance
   * with {@link FieldCardinality.of} only when the cardinality is kept and read more than once, or passed on.
   * @param field - The field, or any object carrying its `maxOccurs`
   * @returns whether the field's own `maxOccurs` makes it a collection
   */
  static isCollection(field: Pick<IField, 'maxOccurs'>): boolean {
    return field.maxOccurs === 'unbounded' || Number(field.maxOccurs) > 1;
  }

  /**
   * Instance form of {@link FieldCardinality.isCollection}, applied to this cardinality's `maxOccurs`.
   */
  get isCollection(): boolean {
    return FieldCardinality.isCollection(this);
  }
}
