import {
  IField,
  IFieldItem,
  IFunctionCall,
  IFunctionCallArgument,
  IFunctionCallArgumentType,
  ITransformation,
  ITransformationItem,
} from '../models';

export class TransformationService {
  static removeFromParent(target: ITransformationItem) {
    if ('elements' in target.parent) {
      const parent = target.parent as ITransformation;
      parent.elements = parent.elements.filter((item) => item !== target);
    } else {
      const parent = target.parent as IFunctionCall;
      parent.arguments = parent.arguments.reduce((acc, item) => {
        item.arguments = item.arguments.reduce((acc2, item2) => {
          item2 !== target && acc2.push(item2);
          return acc2;
        }, [] as IFunctionCallArgumentType[]);
        acc.push(item);
        return acc;
      }, [] as IFunctionCallArgument[]);
    }
  }

  static createTransformationWithField(field: IField) {
    const transformation = { elements: [] } as ITransformation;
    TransformationService.addSourceField(transformation, field);
    return transformation;
  }

  static addSourceField(source: ITransformation, field: IField) {
    const fieldItem = { field: field } as IFieldItem;
    fieldItem.parent = source;
    source.elements.push(fieldItem);
  }
}
