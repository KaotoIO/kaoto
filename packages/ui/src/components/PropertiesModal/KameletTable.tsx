import { Td, Th, Tr } from '@patternfly/react-table';
import { FunctionComponent, useEffect } from 'react';
import { IKameletDefinition } from '../../models';
import { EmptyTableState } from './EmptyTableState';

const columnNames = {
  name: 'Name',
  type: 'Type',
  default: 'Default value',
  required: 'Required',
  description: 'Description',
};

interface IKameletTableProps {
  name: string;
  kameletDefinition: IKameletDefinition;
  changeTotalPropertiesCallback: (numb: number) => void;
}

export const KameletTableHeaders: FunctionComponent = () => {
  return (
    <Tr>
      <Th>{columnNames.name}</Th>
      <Th>{columnNames.type}</Th>
      <Th>{columnNames.default}</Th>
      <Th>{columnNames.required}</Th>
      <Th>{columnNames.description}</Th>
    </Tr>
  );
};

export const KameletTableRows: FunctionComponent<IKameletTableProps> = (props) => {
  let numberOfProperties=0
  //after render, change total number of properties in main table
  useEffect(() => { 
    props.changeTotalPropertiesCallback(numberOfProperties)
  }, []);


  var propertiesToRender: any[] = [];
  if (props.kameletDefinition.spec.definition.properties != null) {
    // required properties information are not in the property itself but in the .spec.definition.required
    var requiredProperties: string[] =
      typeof props.kameletDefinition.spec.definition.required === 'undefined'
        ? []
        : props.kameletDefinition.spec.definition.required;

    for (const [key, value] of Object.entries(props.kameletDefinition.spec.definition.properties)) {
      propertiesToRender.push({
        name: value.title,
        type: value.type,
        required: requiredProperties.includes(key) ? true : false,
        defaultValue: value.default,
        description: value.description,
      });
    }
  }
  numberOfProperties = propertiesToRender.length;
  return (
    <>
      {propertiesToRender.length == 0 && <EmptyTableState componentName={props.name}></EmptyTableState>}
      {propertiesToRender.length != 0 &&
        propertiesToRender.map((property) => (
          <Tr key={property.name}>
            <Td dataLabel={columnNames.name}>{property.name}</Td>
            <Td dataLabel={columnNames.type}>{property.type}</Td>
            <Td dataLabel={columnNames.default}>{property.defaultValue?.toString()}</Td>
            <Td dataLabel={columnNames.required}>{property.required?.toString()}</Td>
            <Td dataLabel={columnNames.description}>{property.description}</Td>
          </Tr>
        ))}
    </>
  );
};
