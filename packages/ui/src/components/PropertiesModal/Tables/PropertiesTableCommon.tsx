import { List, ListItem } from '@patternfly/react-core';
import { Td, Th } from '@patternfly/react-table';
import { ReactNode } from 'react';
import { IPropertiesRow, PropertiesHeaders } from '../PropertiesModal.models';

/**
 * Returns table headers as array of <Th>
 */
export const renderHeaders = (propertiesHeaders: PropertiesHeaders[], rootDataTestId: string): ReactNode[] => {
  return propertiesHeaders.map((header) => (
    <Th data-testid={rootDataTestId + '-header-' + header} key={header}>
      {header}
    </Th>
  ));
};

/**
 * Returns table row cells as array of <Td>
 */
export const renderRowData = (
  propertiesHeaders: PropertiesHeaders[],
  row: IPropertiesRow,
  rootDataTestId: string,
  row_index: number,
): ReactNode[] => {
  const dataTestIdCell = rootDataTestId + '-cell-';

  return propertiesHeaders.map((header) => (
    <Td data-testid={dataTestIdCell + header} key={row_index + header} dataLabel={header} modifier="wrap">
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
                <ListItem data-testid={dataTestIdCell + header + '-enum-' + enum_index} key={item}>
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
  ));
};
