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

export type IFunctionCallArgument = IFunctionCall | IField | string | number;

export interface IForEach {
  collection: IField;
  transformation: ITransformation;
}

export interface IFunctionCall {
  ref: IFunctionDefinition;
  arguments: IFunctionCallArgument[];
}

export type TransformationElement = IFunctionCall | IForEach | IField | string | number;

export interface ITransformation {
  elements: TransformationElement[];
}

export interface IMapping {
  id: string;
  name: string;
  sourceFields: IField[];
  targetFields: IField[];
  transformation?: ITransformation;
}
