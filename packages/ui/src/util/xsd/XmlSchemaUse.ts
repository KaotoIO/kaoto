/**
 * use= values.
 */
export enum XmlSchemaUse {
  NONE = 'NONE',
  OPTIONAL = 'OPTIONAL',
  PROHIBITED = 'PROHIBITED',
  REQUIRED = 'REQUIRED',
}

export function xmlSchemaUseValueOf(name: string) {
  return XmlSchemaUse[name.toUpperCase() as keyof typeof XmlSchemaUse];
}
