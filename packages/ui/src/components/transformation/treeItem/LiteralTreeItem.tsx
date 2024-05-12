import { TreeViewDataItem } from '@patternfly/react-core';

export class LiteralTreeItem implements TreeViewDataItem {
  name: React.ReactNode;

  constructor(value: string | number) {
    this.name = value;
  }
}
