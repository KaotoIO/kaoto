import { IDocument, XmlSchemaDocument } from '../models';
import { XmlSchemaCollection } from '@datamapper-poc/xml-schema-ts';

export class DocumentService {
  static parseXmlSchema(content: string): IDocument {
    const collection = new XmlSchemaCollection();
    const xmlSchema = collection.read(content, () => {});
    return new XmlSchemaDocument(xmlSchema);
  }
}
