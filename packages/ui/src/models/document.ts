import { generateRandomId } from '../util';

export interface INamespace {
  alias: string;
  uri: string;
  locationUri: string;
  isTarget: boolean;
}

export interface IField {
  id: string;
  name: string;
  type: string;
  fields: IField[];
  scope: string;
  value: string;
  path: string;
  isAttribute: boolean;
  isCollection: boolean;
  isConnected: boolean;
  isInCollection: boolean;
  isDisabled: boolean;
  enumeration: boolean;
}

export interface IDocument {
  id: string;
  name: string;
  type: string;
  fields: IField[];
  namespaces?: INamespace[];
}

export abstract class BaseDocument implements IDocument {
  fields: IField[] = [];
  id: string = generateRandomId('document');
  name: string = '';
  type: string = '';
}

export abstract class BaseField implements IField {
  enumeration: boolean = false;
  fields: IField[] = [];
  id: string = generateRandomId('field');
  isAttribute: boolean = false;
  isCollection: boolean = false;
  isConnected: boolean = false;
  isDisabled: boolean = false;
  isInCollection: boolean = false;
  name: string = '';
  path: string = '';
  scope: string = '';
  type: string = '';
  value: string = '';
}
