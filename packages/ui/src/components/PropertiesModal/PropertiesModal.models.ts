import { ICamelComponentApiKind } from '../../models';

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

/**
 * Metadata which is not rendered as a separate cell but according to which, some formatting is applied
 */
export interface IPropertiesRowAdditionalInfo {
  required?: boolean;
  group?: string;
  autowired?: boolean;
  enum?: string[];
  apiKind?: ICamelComponentApiKind;
}

/**
 * Row for table with cells
 */
export interface IPropertiesRow {
  property?: string;
  name: string;
  description: string;
  default?: string | boolean | number;
  type: string;
  example?: string;
  rowAdditionalInfo: IPropertiesRowAdditionalInfo;
  children?: IPropertiesRow[];
}

/**
 * Whole table data for rendering
 */
export type IPropertiesTable = {
  type: PropertiesTableType;
  headers: PropertiesHeaders[];
  rows: IPropertiesRow[];
  caption?: string;
};

/**
 * Whole tab data for rendering
 */
export interface IPropertiesTab {
  rootName: string;
  tables: IPropertiesTable[];
}
