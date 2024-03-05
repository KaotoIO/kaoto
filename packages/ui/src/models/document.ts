import { generateRandomId } from '../util';
import { XmlSchema, XmlSchemaElement } from '@datamapper-poc/xml-schema-ts';

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

abstract class BaseDocument implements IDocument {
  fields: IField[] = [];
  id: string = generateRandomId('document');
  name: string = '';
  type: string = '';
}

export class XmlSchemaDocument extends BaseDocument {
  private rootElement: XmlSchemaElement;
  fields: XmlSchemaField[] = [];
  constructor(private xmlSchema: XmlSchema) {
    super();
    if (this.xmlSchema.getElements().size == 0) {
      throw Error("There's no top level Element in the schema");
    }
    this.rootElement = this.xmlSchema.getElements().values().next().value;
    this.fields.push(new XmlSchemaField(this.rootElement));
    this.type = 'XML';
  }
}

abstract class BaseField implements IField {
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

export class XmlSchemaField extends BaseField {
  constructor(_element: XmlSchemaElement) {
    super();
  }
}
