import { TreeViewDataItem } from '@patternfly/react-core';
import { ReactNode } from 'react';
import { IFunctionCall } from '../../../models';
import { TreeItemHelper } from './tree-item-helper';

export class FunctionCallTreeItem implements TreeViewDataItem {
  name: ReactNode;
  children: TreeViewDataItem[];

  constructor(functionCall: IFunctionCall) {
    this.name = functionCall.ref.name;
    this.children = functionCall.arguments.map((arg) => TreeItemHelper.createTransformationTreeItem(arg));
  }
}
