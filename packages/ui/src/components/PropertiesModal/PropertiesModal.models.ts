export const enum PropertiesHeaders {
  Property = 'property',
  Name = 'name',
  Description = 'description',
  Default = 'default',
  Type = 'type',
  Example = 'example',
}

export interface IPropertiesRowAdditionalInfo {
  required?: boolean,
  group?: string,
}

export interface IPropertiesRow {
  property?: string;
  name: string;
  description: string;
  default?: string;
  type: string;
  example?: string;
  rowAdditionalInfo: IPropertiesRowAdditionalInfo
}

export type IPropertiesTable = {
  headers: PropertiesHeaders[];
  rows: IPropertiesRow[];
  caption?: string;
};

export interface IPropertiesTab {
  rootName: string;
  tables: IPropertiesTable[];
}
