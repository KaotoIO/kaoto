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

export abstract class MappingTreeItem {
  id: string = generateRandomId('item');
  children: MappingTreeItem[] = [];
}

export class FieldItem extends MappingTreeItem {
  field?: IField;
}

export class Expression {
  expression: string = '';
}

export class Predicate extends Expression {}

export class IfItem extends MappingTreeItem {
  test?: Predicate;
}

export class ChooseItem extends MappingTreeItem {
  when: WhenItem[] = [];
  otherwise?: OtherwiseItem;
}

export class WhenItem extends MappingTreeItem {
  test?: Predicate;
}

export class OtherwiseItem extends MappingTreeItem {}

export class ForEachItem extends MappingTreeItem {
  select?: Expression;
}

export class ValueSelector extends MappingTreeItem {
  select?: Expression;
}

export class MappingTree {
  root?: MappingTreeItem;
}
