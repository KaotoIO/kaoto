import { ForEachTreeItem } from './ForEachTreeItem';
import { FunctionCallTreeItem } from './FunctionCallTreeItem';
import { IField, IForEach, IFunctionCall, TransformationElement } from '../../../models';
import { LiteralTreeItem } from './LiteralTreeItem';
import { FieldTreeItem } from './FieldTreeItem';

export class TreeItemHelper {
  static createTransformationTreeItem(element: TransformationElement) {
    if (typeof element === 'object' && 'ref' in element) {
      return new FunctionCallTreeItem(element as IFunctionCall);
    } else if (typeof element === 'object' && 'collection' in element) {
      return new ForEachTreeItem(element as IForEach);
    } else if (typeof element === 'object' && 'parent' in element) {
      return new FieldTreeItem(element as IField);
    } else {
      return new LiteralTreeItem(element);
    }
  }
}
