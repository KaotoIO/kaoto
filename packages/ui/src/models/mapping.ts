import { IField } from './document';
import { Types } from './types';

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
  parent: ITransformationItem | ITransformation;
}

export interface IForEach extends ITransformationItem {
  collection: IField;
  transformation: ITransformation;
}

export interface IFunctionCallArgumentType extends ITransformationItem {}

export interface IFunctionCallArgument {
  definition: IFunctionArgumentDefinition;
  arguments: IFunctionCallArgumentType[];
}

export interface IFunctionCall extends IFunctionCallArgumentType {
  definition: IFunctionDefinition;
  arguments: IFunctionCallArgument[];
}

export interface IFieldItem extends IFunctionCallArgumentType {
  field: IField;
}

export interface ILiteralItem extends IFunctionCallArgumentType {
  value: string | number;
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
