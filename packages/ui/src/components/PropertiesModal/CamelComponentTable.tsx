import { Td, Th, Tr } from '@patternfly/react-table';
import { FunctionComponent, useEffect } from 'react';
import { ICamelComponentDefinition, ICamelProcessorDefinition } from '../../models';
import { EmptyTableState } from './EmptyTableState';

const columnNames = {
  name: 'Name',
  type: 'Type',
  kind: 'Kind',
  default: 'Default value',
  required: 'Required',
  description: 'Description',
};

interface ICamelComponentTableProps {
  name: string;
  componentDefinition: ICamelComponentDefinition | ICamelProcessorDefinition; //since they share the same values, this table definition can be used for both
  changeTotalPropertiesCallback: (numb: number) => void;
}

export const CamelComponentTableHeaders: FunctionComponent = () => {
  return (
    <Tr>
      <Th>{columnNames.name}</Th>
      <Th>{columnNames.type}</Th>
      <Th>{columnNames.kind}</Th>
      <Th>{columnNames.default}</Th>
      <Th>{columnNames.required}</Th>
      <Th>{columnNames.description}</Th>
    </Tr>
  );
};

export const CamelComponentTableRows: FunctionComponent<ICamelComponentTableProps> = (props) => {
  let numberOfProperties=0
  //after render, change total number of properties in main table
  useEffect(() => { 
    props.changeTotalPropertiesCallback(numberOfProperties)
  }, []);

  var propertiesToRender: any[] = [];
  for (const [, value] of Object.entries(props.componentDefinition.properties)) {
    propertiesToRender.push({
      name: value.displayName,
      type: value.type,
      kind: value.kind,
      required: value.required,
      defaultValue: value.defaultValue,
      description: value.description,
    });
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
            <Td dataLabel={columnNames.kind}>{property.kind}</Td>
            <Td dataLabel={columnNames.default}>{property.defaultValue?.toString()}</Td>
            <Td dataLabel={columnNames.required}>{property.required?.toString()}</Td>
            <Td dataLabel={columnNames.description}>{property.description}</Td>
          </Tr>
        ))}
    </>
  );
};
