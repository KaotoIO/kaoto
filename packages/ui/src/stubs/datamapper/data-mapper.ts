import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';
import { DocumentType, IDocument, PrimitiveDocument } from '../../models/datamapper/document';
import { XmlSchemaDocumentService } from '../../services/xml-schema-document.service';
import { DATAMAPPER_ID_PREFIX, XSLT_COMPONENT_NAME } from '../../utils';

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

export const twoDataMapperRouteDefinitionStub = parse(`
  from:
    id: from-8888
    uri: direct:start
    parameters: {}
    steps:
      - step:
          id: ${DATAMAPPER_ID_PREFIX}-1234
          steps:
            - to:
                uri: ${XSLT_COMPONENT_NAME}:transform-1.xsl
      - step:
          id: ${DATAMAPPER_ID_PREFIX}-5678
          steps:
            - to:
                uri: ${XSLT_COMPONENT_NAME}:transform-2.xsl`);

export const shipOrderXsd = fs
  .readFileSync(path.resolve(__dirname, '../../xml-schema-ts/test-resources/ShipOrder.xsd'))
  .toString();
export const testDocumentXsd = fs
  .readFileSync(path.resolve(__dirname, '../../xml-schema-ts/test-resources/TestDocument.xsd'))
  .toString();
export const noTopElementXsd = fs
  .readFileSync(path.resolve(__dirname, '../../xml-schema-ts/test-resources/NoTopElement.xsd'))
  .toString();
export const camelSpringXsd = fs
  .readFileSync(path.resolve(__dirname, '../../xml-schema-ts/test-resources/camel-spring.xsd'))
  .toString();
export const shipOrderToShipOrderXslt = fs
  .readFileSync(path.resolve(__dirname, '../../xml-schema-ts/test-resources/ShipOrderToShipOrder.xsl'))
  .toString();
export const shipOrderToShipOrderInvalidForEachXslt = fs
  .readFileSync(path.resolve(__dirname, '../../xml-schema-ts/test-resources/ShipOrderToShipOrderInvalidForEach.xsl'))
  .toString();
export const shipOrderEmptyFirstLineXsd = fs
  .readFileSync(path.resolve(__dirname, '../../xml-schema-ts/test-resources/ShipOrderEmptyFirstLine.xsd'))
  .toString();
export const shipOrderToShipOrderMultipleForEachXslt = fs
  .readFileSync(path.resolve(__dirname, '../../xml-schema-ts/test-resources/ShipOrderToShipOrderMultipleForEach.xsl'))
  .toString();
export const shipOrderToShipOrderCollectionIndexXslt = fs
  .readFileSync(path.resolve(__dirname, '../../xml-schema-ts/test-resources/ShipOrderToShipOrderCollectionIndex.xsl'))
  .toString();

export const x12837PDfdlXsd = fs
  .readFileSync(path.resolve(__dirname, '../../xml-schema-ts/test-resources/X12-837P.dfdl.xsd'))
  .toString();
export const message837Xsd = fs
  .readFileSync(path.resolve(__dirname, '../../xml-schema-ts/test-resources/Message837.xsd'))
  .toString();
export const x12837PXslt = fs
  .readFileSync(path.resolve(__dirname, '../../xml-schema-ts/test-resources/X12-837.xsl'))
  .toString();

export const x12850DfdlXsd = fs
  .readFileSync(path.resolve(__dirname, '../../xml-schema-ts/test-resources/X12-850.dfdl.xsd'))
  .toString();
export const invoice850Xsd = fs
  .readFileSync(path.resolve(__dirname, '../../xml-schema-ts/test-resources/Invoice850.xsd'))
  .toString();
export const x12850ForEachXslt = fs
  .readFileSync(path.resolve(__dirname, '../../xml-schema-ts/test-resources/X12-850-Invoice-for-each.xsl'))
  .toString();

export const camelYamlDslJsonSchema = fs.readFileSync(path.resolve(__dirname, './camelYamlDsl.json')).toString();

export const cartJsonSchema = fs.readFileSync(path.resolve(__dirname, './Cart.schema.json')).toString();
export const accountJsonSchema = fs.readFileSync(path.resolve(__dirname, './Account.schema.json')).toString();
export const shipOrderJsonSchema = fs.readFileSync(path.resolve(__dirname, './ShipOrder.schema.json')).toString();
export const shipOrderJsonXslt = fs.readFileSync(path.resolve(__dirname, './ShipOrderJson.xsl')).toString();

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
