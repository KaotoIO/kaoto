/**
 * Fixed placeholder node names used in visualization (viz node data.name).
 * Dynamic placeholder names (e.g. 'when', 'otherwise', 'to') are derived from path
 * in base-node-mapper and are not listed here.
 */
export enum PlaceholderType {
  /** Generic "add step" placeholder in the flow */
  Placeholder = 'placeholder',
  /** Special empty-state placeholder (e.g. empty REST DSL) */
  PlaceholderSpecialChild = 'placeholder-special-child',
}
