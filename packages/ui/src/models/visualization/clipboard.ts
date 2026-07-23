// models/visualization/clipboard.ts
export interface IClipboardContent {
  name: string; // YAML processor key, e.g. "to", "route", "log"
  definition: object; // the object value under that YAML key
}
