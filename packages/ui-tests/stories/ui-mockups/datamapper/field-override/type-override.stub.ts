export const mockFieldTypes = {
  xmlSchemaStandardTypes: [
    { value: 'string', label: 'string' },
    { value: 'integer', label: 'integer' },
    { value: 'decimal', label: 'decimal' },
    { value: 'boolean', label: 'boolean' },
    { value: 'date', label: 'date' },
    { value: 'dateTime', label: 'dateTime' },
    { value: 'time', label: 'time' },
    { value: 'double', label: 'double' },
    { value: 'float', label: 'float' },
    { value: 'long', label: 'long' },
    { value: 'int', label: 'int' },
    { value: 'short', label: 'short' },
    { value: 'byte', label: 'byte' },
  ],
};

export interface SchemaFile {
  name: string;
  path: string;
  types: Array<{ value: string; label: string }>;
}

export const availableSchemaFiles: SchemaFile[] = [
  {
    name: 'customer-schema.xsd',
    path: '/schemas/customer-schema.xsd',
    types: [
      { value: 'CustomerData', label: 'CustomerData' },
      { value: 'CustomerInfo', label: 'CustomerInfo' },
    ],
  },
  {
    name: 'order-schema.xsd',
    path: '/schemas/order-schema.xsd',
    types: [
      { value: 'OrderInfo', label: 'OrderInfo' },
      { value: 'OrderDetails', label: 'OrderDetails' },
    ],
  },
  {
    name: 'common-schema.xsd',
    path: '/schemas/common-schema.xsd',
    types: [
      { value: 'AddressType', label: 'AddressType' },
      { value: 'NonEmptyString', label: 'NonEmptyString (restricts xs:string)' },
    ],
  },
  {
    name: 'shiporder-extended.xsd',
    path: '/schemas/shiporder-extended.xsd',
    types: [{ value: 'ShipToExtended', label: 'ShipToExtended (extends ShipToType)' }],
  },
];

export const mockFields = {
  anyTypeField: {
    path: '/ShipOrder/data',
    name: 'data',
    type: 'xs:anyType',
    isAnyType: true,
    isForceOverride: false,
    compatibleTypes: 'all',
  },

  baseTypeField: {
    path: '/ShipOrder/shipTo',
    name: 'shipTo',
    type: 'ShipToType',
    isAnyType: false,
    isForceOverride: false,
    compatibleTypes: ['ShipToExtended'],
  },

  regularField: {
    path: '/ShipOrder/shipTo/name',
    name: 'name',
    type: 'xs:string',
    isAnyType: false,
    isForceOverride: false,
    compatibleTypes: ['NonEmptyString'],
  },
};
