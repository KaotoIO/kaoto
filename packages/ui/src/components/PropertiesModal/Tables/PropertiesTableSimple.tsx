import { Table, Tbody, Th, Thead, Tr } from '@patternfly/react-table';
import { FunctionComponent } from 'react';

import { IPropertiesTable } from '../PropertiesModal.models';
import { renderHeaders, renderRowData } from './PropertiesTableCommon';

interface IPropertiesTableSimpleProps {
  /** Tab-level test id prefix, e.g. `tab-1`. Each group gets `<prefix>-table-<index>`. */
  rootDataTestId: string;
  /** Index of the first group within the tab, used to build per-group test ids. */
  startTableIndex?: number;
  /** Groups rendered as row groups of a single table. All groups are expected to share the same headers. */
  tables: IPropertiesTable[];
}

export const PropertiesTableSimple: FunctionComponent<IPropertiesTableSimpleProps> = ({
  rootDataTestId,
  startTableIndex = 0,
  tables,
}) => {
  if (tables.length === 0) {
    return null;
  }

  const headers = tables[0].headers;
  const getGroupDataTestId = (groupIndex: number) => `${rootDataTestId}-table-${startTableIndex + groupIndex}`;
  const firstGroupDataTestId = getGroupDataTestId(0);

  return (
    <Table aria-label="Simple table" variant="compact" data-testid={firstGroupDataTestId}>
      <Thead>
        <Tr>{renderHeaders(headers, firstGroupDataTestId)}</Tr>
      </Thead>
      {tables.map((table, groupIndex) => {
        const groupDataTestId = getGroupDataTestId(groupIndex);

        return (
          <Tbody key={groupDataTestId} data-testid={groupDataTestId + '-group'}>
            {table.caption !== undefined && (
              <Tr>
                <Th
                  colSpan={headers.length}
                  scope="rowgroup"
                  className="properties-modal__group-caption"
                  data-testid={groupDataTestId + '-properties-modal-table-caption'}
                >
                  {table.caption}
                </Th>
              </Tr>
            )}
            {table.rows.map((row, rowIndex) => (
              <Tr data-testid={groupDataTestId + '-row-' + rowIndex} key={row.name}>
                {renderRowData(headers, row, groupDataTestId + '-row-' + rowIndex, rowIndex)}
              </Tr>
            ))}
          </Tbody>
        );
      })}
    </Table>
  );
};
