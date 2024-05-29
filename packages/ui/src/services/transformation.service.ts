import {
  IField,
  IFieldItem,
  IFunctionCall,
  IFunctionCallArgument,
  IFunctionCallArgumentType,
  IFunctionDefinition,
  ILiteralItem,
  ITransformation,
  ITransformationItem,
} from '../models';

export class TransformationService {
  static removeFromParent(target: ITransformationItem) {
    if ('elements' in target.parent) {
      const parent = target.parent as ITransformation;
      parent.elements = parent.elements.filter((item) => item !== target);
    } else if ('values' in target.parent) {
      const parent = target.parent as IFunctionCallArgument;
      parent.values = parent.values.filter((item) => item !== target);
    } else {
      const parent = target.parent as IFunctionCall;
      parent.arguments = parent.arguments.reduce((acc, item) => {
        item.values = item.values.reduce((acc2, item2) => {
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
    TransformationService.addField(transformation, field);
    return transformation;
  }

  private static pushChild(parent: ITransformation | IFunctionCallArgument, item: ITransformationItem) {
    'elements' in parent ? parent.elements.push(item) : parent.values.push(item);
  }

  static addField(source: ITransformation | IFunctionCallArgument, field: IField) {
    const fieldItem = { field: field } as IFieldItem;
    fieldItem.parent = source;
    TransformationService.pushChild(source, fieldItem);
  }

  static addFunctionCall(
    transformation: ITransformation | IFunctionCallArgument,
    functionDefinition: IFunctionDefinition,
  ) {
    TransformationService.pushChild(transformation, {
      parent: transformation,
      definition: functionDefinition,
      arguments: functionDefinition.arguments.map((argDef) => {
        return { definition: argDef, values: [] } as IFunctionCallArgument;
      }),
    } as IFunctionCall);
  }

  static addConstant(transformation: ITransformation | IFunctionCallArgument, value: string | number) {
    TransformationService.pushChild(transformation, {
      parent: transformation,
      value: value,
    } as ILiteralItem);
  }

  static toExpression(transformation: ITransformation) {
    return 'TODO';
  }

  static fromExpression(expression: string) {
    return {} as ITransformation;
  }
}
