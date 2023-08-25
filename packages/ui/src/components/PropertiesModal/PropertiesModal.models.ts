export const enum PropertiesHeaders {
  Property = 'property',
  Name = 'name',
  Group = 'group',
  Type = 'type',
  Kind = 'kind',
  Default = 'default',
  Required = 'required',
  Description = 'description',
  Example = 'example',
}

export interface IPropertiesRow {
  property?: string;
  name: string;
  group?: string;
  description: string;
  default?: string;
  type: string;
  kind?: string;
  required?: boolean;
  example?: string;
}

export type IPropertiesTable = {
  headers: PropertiesHeaders[];
  rows: IPropertiesRow[];
  caption?: string;
};
