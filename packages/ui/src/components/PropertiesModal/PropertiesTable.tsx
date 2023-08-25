import { Caption, Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { FunctionComponent } from 'react';
import { IPropertiesTable, PropertiesHeaders } from './PropertiesModal.models';

interface IPropertiesTableProps {
  table: IPropertiesTable;
}

export const PropertiesTable: FunctionComponent<IPropertiesTableProps> = (props) => {
  const table = props.table;
  return (
    <Table aria-label="Simple table" variant="compact">
      <Caption data-testid="properties-modal-table-caption">{table.caption}</Caption>
      <Thead>
        <Tr>
          {table.headers.map((header) => (
            <Th data-testid={'header-' + header} key={header}>
              {header}
            </Th>
          ))}
        </Tr>
      </Thead>
      <Tbody>
        {table.rows.length != 0 &&
          table.rows.map((row, index) => (
            <Tr data-testid={'row-' + index} key={index}>
              {table.headers.map((header) => (
                <Td data-testid={'row-' + index + '-cell-' + header} key={index + header} dataLabel={header} modifier="wrap">
                  { header == PropertiesHeaders.Description && row.required
                        ?  <p><strong>Required</strong> {row[header]?.toString()}</p>
                        :  <p>{row[header]?.toString()}</p>
                  }
                </Td>
              ))}
            </Tr>
          ))}
      </Tbody>
    </Table>
  );
};
