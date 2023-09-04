import { TreeView, TreeViewDataItem } from '@patternfly/react-core';
import * as React from 'react';
import { IPropertiesRow, IPropertiesTable } from '../PropertiesModal.models';

interface IPropertiesTableTreeProps {
  rootDataTestId: string;
  table: IPropertiesTable;
}

const getChildren = (root: IPropertiesRow[]): TreeViewDataItem[] => {
  const finalArray: TreeViewDataItem[] = []
  root.forEach((item) => {
    let row: TreeViewDataItem = {
      name: item.name
    } 
    if (item.children){
      row.children = getChildren(item.children)
    }
    finalArray.push(row);
  })
  return finalArray;
}

export const PropertiesTableTree: React.FunctionComponent<IPropertiesTableTreeProps> = (props) => {
  const data = getChildren(props.table.rows);  
  return (
    <TreeView
      hasSelectableNodes
      data={data}
      allExpanded={true}
    />
  );
};
