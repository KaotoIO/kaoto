import { List, ListItem } from '@patternfly/react-core';
import { Caption, Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { FunctionComponent } from 'react';
import { IPropertiesTable, PropertiesHeaders } from '../PropertiesModal.models';

interface IPropertiesTableSimpleProps {
  rootDataTestId: string;
  table: IPropertiesTable;
}

export const PropertiesTableSimple: FunctionComponent<IPropertiesTableSimpleProps> = (props) => {
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
          table.rows.map((row, row_index) => (
            <Tr data-testid={props.rootDataTestId + '-row-' + row_index} key={row_index}>
              {table.headers.map((header) => (
                <Td
                  data-testid={props.rootDataTestId + '-row-' + row_index + '-cell-' + header}
                  key={row_index + header}
                  dataLabel={header}
                  modifier="wrap"
                >
                  {
                    //suffix required for description cell if needed
                    header == PropertiesHeaders.Description && row.rowAdditionalInfo.required ? (
                      <span data-label="required">Required </span>
                    ) : (
                      ''
                    )
                  }
                  {
                    //suffix autowired for description cell if needed
                    header == PropertiesHeaders.Description && row.rowAdditionalInfo.autowired ? (
                      <span data-label="autowired">Autowired </span>
                    ) : (
                      ''
                    )
                  }
                  {<span>{row[header]?.toString()}</span>}
                  {
                    //prefix with group for name cell if needed
                    header == PropertiesHeaders.Name && row.rowAdditionalInfo.group ? (
                      <span data-label="group"> ({row.rowAdditionalInfo.group})</span>
                    ) : (
                      ''
                    )
                  }
                  {
                    //prefix with enum for description cell if needed
                    header == PropertiesHeaders.Description && row.rowAdditionalInfo.enum ? (
                      <>
                        <p data-label="enum">Enum values:</p>
                        <List>
                          {row.rowAdditionalInfo.enum.map((item, enum_index) => (
                            <ListItem
                              data-testid={
                                props.rootDataTestId + '-row-' + row_index + '-cell-' + header + '-enum-' + enum_index
                              }
                              key={item}
                            >
                              {item}
                            </ListItem>
                          ))}
                        </List>
                      </>
                    ) : (
                      ''
                    )
                  }
                </Td>
              ))}
            </Tr>
          ))}
      </Tbody>
    </Table>
  );
};
