import { IField } from './document';
import { Types } from './types';
import { generateRandomId } from '../util';

export type MappingParentType = MappingTree | MappingItem;

export class MappingTree {
  children: MappingItem[] = [];
}
export abstract class MappingItem {
  constructor(
    public parent: MappingParentType,
    public name: string,
  ) {}
  id: string = generateRandomId(this.name);
  children: MappingItem[] = [];
}

export class FieldItem extends MappingItem {
  constructor(
    public parent: MappingParentType,
    public field: IField,
  ) {
    super(parent, 'field');
  }
}

export interface ExpressionItem {
  expression: string;
}

export interface ConditionItem {
  isCondition: true;
}

export class IfItem extends MappingItem implements ExpressionItem, ConditionItem {
  constructor(public parent: MappingParentType) {
    super(parent, 'if');
  }
  isCondition = true as const;
  expression = '';
}

export class ChooseItem extends MappingItem implements ConditionItem {
  constructor(public parent: MappingParentType) {
    super(parent, 'choose');
  }
  isCondition = true as const;
  when: WhenItem[] = [];
  otherwise?: OtherwiseItem;
}

export class WhenItem extends MappingItem implements ExpressionItem, ConditionItem {
  constructor(public parent: MappingParentType) {
    super(parent, 'when');
  }
  isCondition = true as const;
  expression = '';
}

export class OtherwiseItem extends MappingItem implements ConditionItem {
  constructor(public parent: MappingParentType) {
    super(parent, 'otherwise');
  }
  isCondition = true as const;
}

export class ForEachItem extends MappingItem implements ExpressionItem, ConditionItem {
  constructor(
    public parent: MappingParentType,
    field: IField,
  ) {
    super(parent, 'for-each');
    this.children.push(new FieldItem(this, field));
  }
  isCondition = true as const;
  expression = '';
  sortItems: SortItem[] = [];
}

export class SortItem {
  expression: string = '';
  order: 'ascending' | 'descending' = 'ascending';
}

export class ValueSelector extends MappingItem implements ExpressionItem {
  constructor(public parent: MappingParentType) {
    super(parent, 'value');
  }
  expression = '';
}

/**
 * Old mapping models - to be eventually removed
 */

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

export interface ITransformation {
  elements: ITransformationItem[];
}

export interface IMapping {
  id: string;
  name: string;
  source: ITransformation;
  targetFields: IField[];
}
