import * as fs from 'fs';
import { XmlSchemaDocumentService } from '../services';
import { DocumentType } from '../models/path';
import { IDocument, PrimitiveDocument } from '../models/document';

export class TestUtil {
  static orderXsd = fs.readFileSync(__dirname + '/../../../../test-resources/ShipOrder.xsd').toString();
  static testXsd = fs.readFileSync(__dirname + '/../../../../test-resources/TestDocument.xsd').toString();
  static shipOrderToShipOrderXslt = fs
    .readFileSync(__dirname + '/../../../../test-resources/ShipOrderToShipOrder.xsl')
    .toString();

  static createSourceOrderDoc() {
    return XmlSchemaDocumentService.createXmlSchemaDocument(
      DocumentType.SOURCE_BODY,
      'ShipOrder.xsd',
      TestUtil.orderXsd,
    );
  }

  static createTargetOrderDoc() {
    return XmlSchemaDocumentService.createXmlSchemaDocument(
      DocumentType.TARGET_BODY,
      'ShipOrder.xsd',
      TestUtil.orderXsd,
    );
  }

  static createParamOrderDoc(name: string) {
    const answer = XmlSchemaDocumentService.createXmlSchemaDocument(DocumentType.PARAM, name, TestUtil.orderXsd);
    answer.name = name;
    return answer;
  }

  static createParameterMap() {
    const sourceParamDoc = TestUtil.createParamOrderDoc('sourceParam1');
    const sourcePrimitiveParamDoc = new PrimitiveDocument(DocumentType.PARAM, 'primitive');
    return new Map<string, IDocument>([
      ['sourceParam1', sourceParamDoc],
      ['primitive', sourcePrimitiveParamDoc],
    ]);
  }
}
