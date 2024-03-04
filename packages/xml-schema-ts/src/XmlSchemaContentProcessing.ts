/**
 * Provides information about the validation mode of any and anyAttribute element replacements.
 */

export enum XmlSchemaContentProcessing {
  LAX = 'LAX',
  NONE = 'NONE',
  SKIP = 'SKIP',
  STRICT = 'STRICT',
}

export function xmlSchemaContentProcessingValueOf(name: string) {
  return XmlSchemaContentProcessing[name.toUpperCase() as keyof typeof XmlSchemaContentProcessing];
}
