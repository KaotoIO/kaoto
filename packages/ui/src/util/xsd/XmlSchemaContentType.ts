/**
 * Enumerations for the content model of the complex type. This represents the content in the
 * post-schema-validation infoset.
 */

export enum XmlSchemaContentType {
  ELEMENT_ONLY,
  EMPTY,
  MIXED,
  TEXT_ONLY,
}

export function xmlSchemaContentTypeValueOf(name: string) {
  return XmlSchemaContentType[name as keyof typeof XmlSchemaContentType];
}
