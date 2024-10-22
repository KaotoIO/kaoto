import { parse } from 'yaml';
import { DATAMAPPER_ID_PREFIX, XSLT_COMPONENT_NAME } from '../utils';
import fs from 'fs';
import { XmlSchemaDocumentService } from '../services/xml-schema-document.service';
import { DocumentType } from '../models/datamapper/path';
import { IDocument, PrimitiveDocument } from '../models/datamapper/document';

export const datamapperRouteDefinitionStub = parse(`
  from:
    id: from-8888
    uri: direct:start
    parameters: {}
    steps:
      - step:
          id: ${DATAMAPPER_ID_PREFIX}-1234
          steps:
            - to:
                uri: ${XSLT_COMPONENT_NAME}:transform.xsl`);

export const shipOrderXsd = fs
  .readFileSync(__dirname + '/../../../xml-schema-ts/test-resources/ShipOrder.xsd')
  .toString();
export const testDocumentXsd = fs
  .readFileSync(__dirname + '/../../../xml-schema-ts/test-resources/TestDocument.xsd')
  .toString();
export const noTopElementXsd = fs
  .readFileSync(__dirname + '/../../../xml-schema-ts/test-resources/NoTopElement.xsd')
  .toString();
export const camelSpringXsd = fs
  .readFileSync(__dirname + '/../../../xml-schema-ts/test-resources/camel-spring.xsd')
  .toString();
export const shipOrderToShipOrderXslt = fs
  .readFileSync(__dirname + '/../../../xml-schema-ts/test-resources/ShipOrderToShipOrder.xsl')
  .toString();
export const shipOrderEmptyFirstLineXsd = fs
  .readFileSync(__dirname + '/../../../xml-schema-ts/test-resources/ShipOrderEmptyFirstLine.xsd')
  .toString();

export class TestUtil {
  static createSourceOrderDoc() {
    return XmlSchemaDocumentService.createXmlSchemaDocument(DocumentType.SOURCE_BODY, 'ShipOrder.xsd', shipOrderXsd);
  }

  static createCamelSpringXsdSourceDoc() {
    return XmlSchemaDocumentService.createXmlSchemaDocument(
      DocumentType.SOURCE_BODY,
      'camel-spring.xsd',
      camelSpringXsd,
    );
  }

  static createTargetOrderDoc() {
    return XmlSchemaDocumentService.createXmlSchemaDocument(DocumentType.TARGET_BODY, 'ShipOrder.xsd', shipOrderXsd);
  }

  static createParamOrderDoc(name: string) {
    const answer = XmlSchemaDocumentService.createXmlSchemaDocument(DocumentType.PARAM, name, shipOrderXsd);
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
