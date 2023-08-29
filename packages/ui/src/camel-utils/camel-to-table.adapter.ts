import { IPropertiesRow, IPropertiesTable, PropertiesHeaders } from '../components/PropertiesModal';
import {
  ICamelComponentApi,
  ICamelComponentHeader,
  ICamelComponentProperty,
  ICamelProcessorProperty,
  IKameletDefinition,
  IKameletSpecProperty,
} from '../models';

export type ICamelComponentCommonProperties = ICamelComponentProperty | ICamelComponentHeader;
export type IPropertiesTableFilter = { filterKey: keyof IFilterableProperties; filterValue: string };

export type IFilterableProperties = ICamelComponentProperty | ICamelComponentHeader | ICamelComponentApi | ICamelProcessorProperty | IKameletSpecProperty

const fullFillFilter = (value: IFilterableProperties, filter: IPropertiesTableFilter): boolean => {
  return value[filter.filterKey] === filter.filterValue;
}

export const camelComponentPropertiesToTable = (
  properties: Record<string, ICamelComponentCommonProperties>,
  filter?: IPropertiesTableFilter,
): IPropertiesTable => {
  const propertiesRows: IPropertiesRow[] = [];
  for (const [key, value] of Object.entries(properties)) {
    if (filter && !fullFillFilter(value, filter)) continue;
    propertiesRows.push({
      name: key,
      description: value.description,
      default: value.defaultValue,
      type: value.javaType.substring(value.javaType.lastIndexOf('.') + 1),
      rowAdditionalInfo: {
        required: value.required,
        group: value.group,
        autowired: value.autowired,
        enum: value.enum
      }
    });
  }
  return {
    headers: [
      PropertiesHeaders.Name,
      PropertiesHeaders.Description,
      PropertiesHeaders.Default,
      PropertiesHeaders.Type,
    ],
    rows: propertiesRows,
  };
};

const getApiType = (consumerOnly: boolean, producerOnly: boolean): string => {
  return consumerOnly && producerOnly ? 'Both' : consumerOnly ? 'Consumer' : producerOnly ? 'Producer' : 'Both';
};

export const camelComponentApisToTable = (
  properties: Record<string, ICamelComponentApi>,
  filter?: IPropertiesTableFilter,
): IPropertiesTable => {
  const propertiesRows: IPropertiesRow[] = [];
  for (const [key, value] of Object.entries(properties)) {
    if (filter && !fullFillFilter(value, filter)) continue;
    propertiesRows.push({
      name: key,
      description: value.description,
      type: getApiType(value.consumerOnly, value.producerOnly),
      rowAdditionalInfo: {}
    });
  }
  return {
    headers: [PropertiesHeaders.Name, PropertiesHeaders.Description, PropertiesHeaders.Type],
    rows: propertiesRows,
  };
};

export const camelProcessorPropertiesToTable = (
  properties: Record<string, ICamelProcessorProperty>,
  filter?: IPropertiesTableFilter,
): IPropertiesTable => {
  const propertiesRows: IPropertiesRow[] = [];
  for (const [key, value] of Object.entries(properties)) {
    if (filter && !fullFillFilter(value, filter)) continue;
    propertiesRows.push({
      name: key,
      default: value.defaultValue,
      type: value.javaType.substring(value.javaType.lastIndexOf('.') + 1),
      description: value.description,
      rowAdditionalInfo: {
        required: value.required,
        autowired: value.autowired,
        enum: value.enum
      }
    });
  }
  return {
    headers: [PropertiesHeaders.Name, PropertiesHeaders.Default, PropertiesHeaders.Type, PropertiesHeaders.Description],
    rows: propertiesRows,
  };
};

export const kameletToPropertiesTable = (
  kameletDef: IKameletDefinition,
  filter?: IPropertiesTableFilter,
): IPropertiesTable => {
  const propertiesRows: IPropertiesRow[] = [];
  if (kameletDef.spec.definition.properties) {
    // required properties information are not in the property itself but in the .spec.definition.required
    const requiredProperties: string[] = kameletDef.spec.definition.required ?? [];

    for (const [key, value] of Object.entries(kameletDef.spec.definition.properties)) {
      if (filter && !fullFillFilter(value, filter)) continue;
      propertiesRows.push({
        property: key,
        name: value.title,
        description: value.description,
        type: value.type,
        default: value.default,
        example: value.example,
        rowAdditionalInfo: {
          required: requiredProperties.includes(key)
        }
      });
    }
  }
  return {
    headers: [
      PropertiesHeaders.Property,
      PropertiesHeaders.Name,
      PropertiesHeaders.Description,
      PropertiesHeaders.Type,
      PropertiesHeaders.Default,
      PropertiesHeaders.Example,
    ],
    rows: propertiesRows,
  };
};
