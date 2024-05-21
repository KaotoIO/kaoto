import { ForEachItem } from './ForEachItem';
import { FunctionCallItem } from './FunctionCallItem';
import { IFieldItem, IForEach, IFunctionCall, ILiteralItem, ITransformationItem } from '../../../models';
import { LiteralItem } from './LiteralItem';
import { FieldItem } from './FieldItem';

export class ItemHelper {
  static createTransformationItem(element: ITransformationItem, onUpdate: () => void) {
    if (typeof element === 'object' && 'definition' in element) {
      const func = element as IFunctionCall;
      return <FunctionCallItem functionCall={func} key={'function-' + func.definition.name} onUpdate={onUpdate} />;
    } else if (typeof element === 'object' && 'collection' in element) {
      const forEach = element as IForEach;
      return <ForEachItem forEach={forEach} key={'foreach-' + forEach.collection.expression} onUpdate={onUpdate} />;
    } else if (typeof element === 'object' && 'field' in element) {
      const field = element as IFieldItem;
      return <FieldItem field={field} key={'field-' + field.field.expression} onUpdate={onUpdate} />;
    } else {
      const literal = element as ILiteralItem;
      return <LiteralItem literal={literal} key={'literal-' + literal} onUpdate={onUpdate} />;
    }
  }
}
