import { IDocument, IField } from './api';
import { generateRandomId } from '../util';
import { XmlSchema, XmlSchemaElement } from '@datamapper-poc/xml-schema-ts';

abstract class Document implements IDocument {
  fields: IField[] = [];
  id: string = generateRandomId('document');
  name: string = '';
  type: string = '';
}

export class XmlSchemaDocument extends Document {
  private rootElement: XmlSchemaElement;
  constructor(private xmlSchema: XmlSchema) {
    super();
    if (xmlSchema.getElements().size == 0) {
      throw Error("There's no top level Element in the schema");
    }
    this.rootElement = xmlSchema.getElements().values().next().value;
    this.type = 'XML';
  }
}
