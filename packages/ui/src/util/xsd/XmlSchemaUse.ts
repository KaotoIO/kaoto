/**
 * use= values.
 */
export enum XmlSchemaUse {
  NONE,
  OPTIONAL,
  PROHIBITED,
  REQUIRED,
}

export function xmlSchemaUseValueOf(name: string) {
  return XmlSchemaUse[name.toUpperCase() as keyof typeof XmlSchemaUse];
}
