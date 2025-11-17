import { Caption, Table, Tbody, Thead, Tr } from '@patternfly/react-table';
import { FunctionComponent } from 'react';

import { IPropertiesTable } from '../PropertiesModal.models';
import { renderHeaders, renderRowData } from './PropertiesTableCommon';

interface IPropertiesTableSimpleProps {
  rootDataTestId: string;
  table: IPropertiesTable;
}

export const PropertiesTableSimple: FunctionComponent<IPropertiesTableSimpleProps> = (props) => {
  return (
    <Table aria-label="Simple table" variant="compact" data-testid={props.rootDataTestId}>
      <Caption data-testid={props.rootDataTestId + '-properties-modal-table-caption'}>{props.table.caption}</Caption>
      <Thead>
        <Tr>{renderHeaders(props.table.headers, props.rootDataTestId)}</Tr>
      </Thead>
      <Tbody>
        {props.table.rows.length != 0 &&
          props.table.rows.map((row, row_index) => (
            <Tr data-testid={props.rootDataTestId + '-row-' + row_index} key={row_index}>
              {renderRowData(props.table.headers, row, props.rootDataTestId + '-row-' + row_index, row_index)}
            </Tr>
          ))}
      </Tbody>
    </Table>
  );
};
