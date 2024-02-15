import { IDocument, Document } from '../models';
import { XmlSchema, XmlSchemaCollection } from '../util/xsd';

export class DocumentService {
  static parseXmlSchema(content: string): IDocument {
    const collection = new XmlSchemaCollection();
    const xmlSchema = collection.read(content);
    return DocumentService.fromXmlSchema(xmlSchema);
  }

  private static fromXmlSchema(xmlSchema: XmlSchema): IDocument {
    const answer = new Document();
    xmlSchema.getElements();
    return answer;
  }
}
