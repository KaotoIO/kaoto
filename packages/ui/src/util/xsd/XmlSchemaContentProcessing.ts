/**
 * Provides information about the validation mode of any and anyAttribute element replacements.
 */

export enum XmlSchemaContentProcessing {
  LAX,
  NONE,
  SKIP,
  STRICT,
}

export function xmlSchemaContentProcessingValueOf(name: string) {
  return XmlSchemaContentProcessing[name as keyof typeof XmlSchemaContentProcessing];
}
