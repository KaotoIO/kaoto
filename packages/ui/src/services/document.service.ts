import { IDocument, XmlSchemaDocument } from '../models';
import { XmlSchemaCollection } from '../util/xsd/XmlSchemaCollection';

export class DocumentService {
  static parseXmlSchema(content: string): IDocument {
    const collection = new XmlSchemaCollection();
    const xmlSchema = collection.read(content, () => {});
    return new XmlSchemaDocument(xmlSchema);
  }
}
