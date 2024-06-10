import { IField } from './document';
import { Types } from './types';
import { generateRandomId } from '../util';

export interface IFunctionArgumentDefinition {
  name: string;
  type: Types;
  displayName: string;
  description: string;
  minOccurs: number;
  maxOccurs: number;
}

export interface IFunctionDefinition {
  name: string;
  displayName: string;
  description: string;
  returnType: Types;
  returnCollection?: boolean;
  arguments: IFunctionArgumentDefinition[];
}

export interface ITransformationItem {
  parent: ITransformationItem | ITransformation | IFunctionCallArgument;
}

export interface IForEach extends ITransformationItem {
  collection: IField;
  transformation: ITransformation;
}

export interface IFunctionCallArgumentType extends ITransformationItem {}

export interface IFunctionCallArgument {
  definition: IFunctionArgumentDefinition;
  values: IFunctionCallArgumentType[];
}

export interface IFunctionCall extends IFunctionCallArgumentType {
  definition: IFunctionDefinition;
  arguments: IFunctionCallArgument[];
}

export interface IFieldItem extends IFunctionCallArgumentType {
  field: IField;
}

export interface ITransformation {
  elements: ITransformationItem[];
}

export interface IMapping {
  id: string;
  name: string;
  source: ITransformation;
  targetFields: IField[];
}

export abstract class MappingItem {
  constructor(public name: string) {}
  id: string = generateRandomId(this.name);
  children: MappingItem[] = [];
}

export class FieldItem extends MappingItem {
  constructor(public field: IField) {
    super('field');
  }
}

export interface ExpressionItem {
  expression: string;
}

export interface ConditionItem {
  isCondition: true;
}

export class IfItem extends MappingItem implements ExpressionItem, ConditionItem {
  constructor() {
    super('if');
  }
  isCondition = true as const;
  expression = '';
}

export class ChooseItem extends MappingItem implements ConditionItem {
  constructor() {
    super('choose');
  }
  isCondition = true as const;
  when: WhenItem[] = [];
  otherwise?: OtherwiseItem;
}

export class WhenItem extends MappingItem implements ExpressionItem, ConditionItem {
  constructor() {
    super('when');
  }
  isCondition = true as const;
  expression = '';
}

export class OtherwiseItem extends MappingItem implements ConditionItem {
  constructor() {
    super('otherwise');
  }
  isCondition = true as const;
}

export class ForEachItem extends MappingItem implements ExpressionItem, ConditionItem {
  constructor() {
    super('for-each');
  }
  isCondition = true as const;
  expression = '';
}

export class SortItem extends MappingItem implements ExpressionItem, ConditionItem {
  constructor() {
    super('sort');
  }
  isCondition = true as const;
  expression = '';
}

export class ValueSelector extends MappingItem implements ExpressionItem {
  constructor() {
    super('value');
  }
  expression = '';
}

export class MappingTree {
  children: MappingItem[] = [];
}
