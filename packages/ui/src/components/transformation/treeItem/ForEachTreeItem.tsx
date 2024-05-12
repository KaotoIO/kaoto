import { TreeViewDataItem } from '@patternfly/react-core';
import { IForEach } from '../../../models';

export class ForEachTreeItem implements TreeViewDataItem {
  name: React.ReactNode;

  constructor(forEach: IForEach) {
    this.name = 'For each ' + forEach.collection.fieldIdentifier.toString();
  }
}
