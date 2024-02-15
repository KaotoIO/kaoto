export enum XmlSchemaForm {
  NONE = 'none',
  QUALIFIED = 'qualified',
  UNQUALIFIED = 'unqualified',
}

export function xmlSchemaFormValueOf(value: string) {
  return XmlSchemaForm[value as keyof typeof XmlSchemaForm];
}
