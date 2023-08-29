import { Caption, Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { FunctionComponent } from 'react';
import { IPropertiesTable, PropertiesHeaders } from './PropertiesModal.models';

interface IPropertiesTableProps {
  rootDataTestId: string;
  table: IPropertiesTable;
}

export const PropertiesTable: FunctionComponent<IPropertiesTableProps> = (props) => {
  const table = props.table;
  return (
    <Table aria-label="Simple table" variant="compact" data-testid={props.rootDataTestId}>
      <Caption data-testid={props.rootDataTestId + '-properties-modal-table-caption'}>{table.caption}</Caption>
      <Thead>
        <Tr>
          {table.headers.map((header) => (
            <Th data-testid={props.rootDataTestId + '-header-' + header} key={header}>
              {header}
            </Th>
          ))}
        </Tr>
      </Thead>
      <Tbody>
        {table.rows.length != 0 &&
          table.rows.map((row, index) => (
            <Tr data-testid={props.rootDataTestId + '-row-' + index} key={index}>
              {table.headers.map((header) => (
                <Td data-testid={props.rootDataTestId + '-row-' + index + '-cell-' + header} key={index + header} dataLabel={header} modifier="wrap">
                  { //suffix if needed
                    (header == PropertiesHeaders.Description && row.rowAdditionalInfo.required) ? <span data-label="required">Required </span> : ""
                  }
                  {
                    <span>{row[header]?.toString()}</span>
                  }
                  { //prefix if needed
                    (header == PropertiesHeaders.Name && row.rowAdditionalInfo.group) ? <span data-label="group"> ({row.rowAdditionalInfo.group})</span> : ""
                  }
                </Td>
              ))}
            </Tr>
          ))}
      </Tbody>
    </Table>
  );
};
