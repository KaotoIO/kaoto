export const enum PropertiesHeaders {
  Name = 'name',
  Type = 'type',
  Kind = 'kind',
  DefaultValue = 'defaultValue',
  Required = 'required',
  Description = 'description',
}

export interface IPropertiesRow {
  name: string;
  type: string;
  kind?: string;
  defaultValue?: string;
  required: boolean;
  description: string;
}

export type IPropertiesTable = {
  headers: PropertiesHeaders[];
  rows: IPropertiesRow[];
};
