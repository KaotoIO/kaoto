// models/visualization/clipboard.ts
export interface IClipboardContent {
  name: string; // YAML processor key, e.g. "to", "route", "log"
  /** The value under the YAML root key.
   * Normally an object for most Camel processors, but may be a string
   * for shorthand step forms such as `to: "kamelet:sink"`. */
  definition: object | string;
}
