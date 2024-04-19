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

export type ITransformationArgument = ITransformation | IField | string | number;

export interface ITransformation {
  ref: IFunctionDefinition;
  arguments: ITransformationArgument[];
}

export interface IMapping {
  id: string;
  name: string;
  sourceFields: IField[];
  targetFields: IField[];
  transformation?: ITransformation;
  xpath?: string;
}
