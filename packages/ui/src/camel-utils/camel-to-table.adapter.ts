import { IPropertiesRow, IPropertiesTable, PropertiesHeaders } from '../components/PropertiesModal';
import { ICamelComponentDefinition, ICamelProcessorDefinition, IKameletDefinition } from '../models';

//since ICamelComponentDefinition and share the same values, this table definition can be used for both
export const camelComponentToTable = (
  componentDef: ICamelComponentDefinition | ICamelProcessorDefinition,
): IPropertiesTable => {
  const propertiesRows: IPropertiesRow[] = [];
  Object.values(componentDef.properties).forEach((property) => {
    propertiesRows.push({
      name: property.displayName,
      type: property.type,
      kind: property.kind,
      required: property.required,
      defaultValue: property.defaultValue,
      description: property.description,
    });
  })
  return {
    headers: [
      PropertiesHeaders.Name,
      PropertiesHeaders.Type,
      PropertiesHeaders.Kind,
      PropertiesHeaders.Required,
      PropertiesHeaders.DefaultValue,
      PropertiesHeaders.Description,
    ],
    rows: propertiesRows,
  };
};

export const kameletToTable = (kameletDef: IKameletDefinition): IPropertiesTable => {
  const propertiesRows: IPropertiesRow[] = [];
  if (kameletDef.spec.definition.properties) {
    // required properties information are not in the property itself but in the .spec.definition.required
    const requiredProperties: string[] = kameletDef.spec.definition.required ?? [];

    for (const [key, value] of Object.entries(kameletDef.spec.definition.properties)) {
      propertiesRows.push({
        name: value.title,
        type: value.type,
        required: requiredProperties.includes(key),
        defaultValue: value.default,
        description: value.description,
      });
    }
  }
  return {
    headers: [
      PropertiesHeaders.Name,
      PropertiesHeaders.Type,
      PropertiesHeaders.Required,
      PropertiesHeaders.DefaultValue,
      PropertiesHeaders.Description,
    ],
    rows: propertiesRows,
  };
};
