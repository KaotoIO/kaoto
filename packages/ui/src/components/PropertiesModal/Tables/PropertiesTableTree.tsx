import { Caption, Table, Tbody, Td, TdProps, Th, Thead, Tr, TreeRowWrapper } from '@patternfly/react-table';
import * as React from 'react';
import { FunctionComponent, useState } from 'react';

import { IPropertiesRow, IPropertiesTable } from '../PropertiesModal.models';
import { renderHeaders, renderRowData } from './PropertiesTableCommon';

interface IPropertiesTableTreeProps {
  rootDataTestId: string;
  table: IPropertiesTable;
}

export const PropertiesTableTree: FunctionComponent<IPropertiesTableTreeProps> = (props) => {
  const [expandedNodeId, setExpandedNodeId] = useState<number[]>([]);
  /** 
    source: https://www.patternfly.org/components/table#tree-table
    Recursive function which flattens the data into an array of flattened TreeRowWrapper components
    params: 
      - nodes - array of a single level of tree nodes
      - level - number representing how deeply nested the current row is
      - posinset - position of the row relative to this row's siblings
      - rowIndex - position of the row relative to the entire table, which is unique (used in expandedNodeId array to memory which rows are expanded)
      - isHidden - defaults to false, true if this row's parent is expanded
  */
  const renderTreeRows = (
    [node, ...remainingNodes]: IPropertiesRow[],
    level = 1,
    posinset = 1,
    rowIndex = 0,
    isHidden = false,
  ): React.ReactNode[] => {
    if (!node) {
      return [];
    }
    const isExpanded = expandedNodeId.includes(rowIndex);

    const treeRow: TdProps['treeRow'] = {
      onCollapse: () =>
        setExpandedNodeId((prevExpanded) => {
          const otherExpandedNodeNames = prevExpanded.filter((row_unique_id) => row_unique_id !== rowIndex);
          return isExpanded ? otherExpandedNodeNames : [...otherExpandedNodeNames, rowIndex];
        }),
      rowIndex,
      props: {
        isExpanded,
        isHidden,
        'aria-level': level,
        'aria-posinset': posinset,
        'aria-setsize': node.children ? node.children.length : 0,
      },
    };

    const childRows =
      node.children && node.children.length
        ? renderTreeRows(node.children, level + 1, 1, rowIndex + 1, !isExpanded || isHidden)
        : [];

    return [
      <TreeRowWrapper key={rowIndex} row={{ props: treeRow.props }}>
        <Td
          style={{ fontWeight: 'lighter' }}
          treeRow={treeRow}
          data-testid={props.rootDataTestId + '-row-' + rowIndex + '-cell-apiKind'}
        >
          <span>{node.rowAdditionalInfo.apiKind?.toString()}</span>
        </Td>
        {renderRowData(props.table.headers, node, props.rootDataTestId + '-row-' + rowIndex, rowIndex)}
      </TreeRowWrapper>,
      ...childRows,
      ...renderTreeRows(remainingNodes, level, posinset + 1, rowIndex + 1 + childRows.length, isHidden),
    ];
  };

  return (
    <Table isTreeTable aria-label="Tree table">
      <Caption data-testid={props.rootDataTestId + '-properties-modal-table-caption'}>{props.table.caption}</Caption>
      <Thead>
        <Tr>
          <Th>Kind</Th>
          {renderHeaders(props.table.headers, props.rootDataTestId)}
        </Tr>
      </Thead>
      <Tbody>{renderTreeRows(props.table.rows)}</Tbody>
    </Table>
  );
};
