/**
 * Enumerations for the content model of the complex type. This represents the content in the
 * post-schema-validation infoset.
 */

export enum XmlSchemaContentType {
  ELEMENT_ONLY = 'ELEMENT_ONLY',
  EMPTY = 'EMPTY',
  MIXED = 'MIXED',
  TEXT_ONLY = 'TEXT_ONLY',
}

export function xmlSchemaContentTypeValueOf(name: string) {
  return XmlSchemaContentType[name.toUpperCase() as keyof typeof XmlSchemaContentType];
}
