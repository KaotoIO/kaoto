export const enum PropertiesTableType {
  Simple,
  Tree,
}

export const enum PropertiesHeaders {
  Property = 'property',
  Name = 'name',
  Description = 'description',
  Default = 'default',
  Type = 'type',
  Example = 'example',
}

export interface IPropertiesRowAdditionalInfo {
  required?: boolean;
  group?: string;
  autowired?: boolean;
  enum?: string[];
}

export interface IPropertiesRow {
  property?: string;
  name: string;
  description: string;
  default?: string;
  type: string;
  example?: string;
  rowAdditionalInfo: IPropertiesRowAdditionalInfo;
  children?: IPropertiesRow[];
}

export type IPropertiesTable = {
  type: PropertiesTableType;
  headers: PropertiesHeaders[];
  rows: IPropertiesRow[];
  caption?: string;
};

export interface IPropertiesTab {
  rootName: string;
  tables: IPropertiesTable[];
}
