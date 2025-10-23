import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';
import {
  BaseDocument,
  BODY_DOCUMENT_ID,
  DocumentDefinitionType,
  DocumentType,
  IDocument,
  PrimitiveDocument,
} from '../../models/datamapper/document';
import { XmlSchemaDocumentService } from '../../services/xml-schema-document.service';
import { DATAMAPPER_ID_PREFIX, XSLT_COMPONENT_NAME } from '../../utils';
import { JsonSchemaDocumentService } from '../../services/json-schema-document.service';

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

export const shipOrderXsd = fs.readFileSync(path.resolve(__dirname, './xml/ShipOrder.xsd')).toString();
export const cartXsd = fs.readFileSync(path.resolve(__dirname, './xml/Cart.xsd')).toString();

export const testDocumentXsd = fs.readFileSync(path.resolve(__dirname, './xml/TestDocument.xsd')).toString();
export const noTopElementXsd = fs.readFileSync(path.resolve(__dirname, './xml/NoTopElement.xsd')).toString();
export const namedTypesXsd = fs.readFileSync(path.resolve(__dirname, './xml/NamedTypes.xsd')).toString();
export const camelSpringXsd = fs.readFileSync(path.resolve(__dirname, './xml/camel-spring.xsd')).toString();
export const multipleElementsXsd = fs.readFileSync(path.resolve(__dirname, './xml/MultipleElements.xsd')).toString();
export const cartToShipOrderXslt = fs.readFileSync(path.resolve(__dirname, './xml/CartToShipOrder.xsl')).toString();
export const shipOrderToShipOrderXslt = fs
  .readFileSync(path.resolve(__dirname, './xml/ShipOrderToShipOrder.xsl'))
  .toString();
export const conditionalMappingsToShipOrderXslt = fs
  .readFileSync(path.resolve(__dirname, './xml/ConditionalMappingsToShipOrder.xsl'))
  .toString();
export const shipOrderToShipOrderInvalidForEachXslt = fs
  .readFileSync(path.resolve(__dirname, './xml/ShipOrderToShipOrderInvalidForEach.xsl'))
  .toString();
export const shipOrderEmptyFirstLineXsd = fs
  .readFileSync(path.resolve(__dirname, './xml/ShipOrderEmptyFirstLine.xsd'))
  .toString();
export const shipOrderToShipOrderMultipleForEachXslt = fs
  .readFileSync(path.resolve(__dirname, './xml/ShipOrderToShipOrderMultipleForEach.xsl'))
  .toString();
export const shipOrderToShipOrderCollectionIndexXslt = fs
  .readFileSync(path.resolve(__dirname, './xml/ShipOrderToShipOrderCollectionIndex.xsl'))
  .toString();
export const nestedConditionalsToShipOrderXslt = fs
  .readFileSync(path.resolve(__dirname, './xml/NestedConditionalsToShipOrder.xsl'))
  .toString();

export const x12837PDfdlXsd = fs.readFileSync(path.resolve(__dirname, './xml/X12-837P.dfdl.xsd')).toString();
export const message837Xsd = fs.readFileSync(path.resolve(__dirname, './xml/Message837.xsd')).toString();
export const x12837PXslt = fs.readFileSync(path.resolve(__dirname, './xml/X12-837.xsl')).toString();

export const x12850DfdlXsd = fs.readFileSync(path.resolve(__dirname, './xml/X12-850.dfdl.xsd')).toString();
export const invoice850Xsd = fs.readFileSync(path.resolve(__dirname, './xml/Invoice850.xsd')).toString();
export const x12850ForEachXslt = fs
  .readFileSync(path.resolve(__dirname, './xml/X12-850-Invoice-for-each.xsl'))
  .toString();

export const camelYamlDslJsonSchema = fs.readFileSync(path.resolve(__dirname, './json/camelYamlDsl.json')).toString();

export const cartJsonSchema = fs.readFileSync(path.resolve(__dirname, './json/Cart.schema.json')).toString();
export const accountJsonSchema = fs.readFileSync(path.resolve(__dirname, './json/Account.schema.json')).toString();
export const shipOrderJsonSchema = fs.readFileSync(path.resolve(__dirname, './json/ShipOrder.schema.json')).toString();
export const shipOrderJsonXslt = fs.readFileSync(path.resolve(__dirname, './json/ShipOrderJson.xsl')).toString();
export const cartToShipOrderJsonXslt = fs
  .readFileSync(path.resolve(__dirname, './json/CartToShipOrderJson.xsl'))
  .toString();
export const conditionalMappingsToShipOrderJsonXslt = fs
  .readFileSync(path.resolve(__dirname, './json/ConditionalMappingsToShipOrderJson.xsl'))
  .toString();
export const multipleForEachJsonXslt = fs
  .readFileSync(path.resolve(__dirname, './json/MultipleForEach.xsl'))
  .toString();

export const orgXsd = fs.readFileSync(path.resolve(__dirname, './xml/Org.xsd')).toString();
export const contactsXsd = fs.readFileSync(path.resolve(__dirname, './xml/Contacts.xsd')).toString();
export const orgToContactsXslt = fs.readFileSync(path.resolve(__dirname, './xml/OrgToContacts.xsl')).toString();
export const extensionSimpleXsd = fs.readFileSync(path.resolve(__dirname, './xml/ExtensionSimple.xsd')).toString();
export const extensionComplexXsd = fs.readFileSync(path.resolve(__dirname, './xml/ExtensionComplex.xsd')).toString();
export const schemaTestXsd = fs.readFileSync(path.resolve(__dirname, './xml/SchemaTest.xsd')).toString();
export const restrictionComplexXsd = fs
  .readFileSync(path.resolve(__dirname, './xml/RestrictionComplex.xsd'))
  .toString();
export const restrictionSimpleXsd = fs.readFileSync(path.resolve(__dirname, './xml/RestrictionSimple.xsd')).toString();
export const restrictionInheritanceXsd = fs
  .readFileSync(path.resolve(__dirname, './xml/RestrictionInheritance.xsd'))
  .toString();
export const multiLevelExtensionXsd = fs
  .readFileSync(path.resolve(__dirname, './xml/MultiLevelExtension.xsd'))
  .toString();
export const multiLevelRestrictionXsd = fs
  .readFileSync(path.resolve(__dirname, './xml/MultiLevelRestriction.xsd'))
  .toString();
export const invalidComplexExtensionXsd = fs
  .readFileSync(path.resolve(__dirname, './xml/InvalidComplexExtension.xsd'))
  .toString();
export const simpleTypeInheritanceXsd = fs
  .readFileSync(path.resolve(__dirname, './xml/SimpleTypeInheritance.xsd'))
  .toString();

export class TestUtil {
  static createSourceOrderDoc() {
    return XmlSchemaDocumentService.createXmlSchemaDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID, shipOrderXsd);
  }

  static createJSONSourceOrderDoc() {
    return JsonSchemaDocumentService.createJsonSchemaDocument(
      DocumentType.SOURCE_BODY,
      BODY_DOCUMENT_ID,
      shipOrderJsonSchema,
    );
  }

  static createCamelSpringXsdSourceDoc() {
    return XmlSchemaDocumentService.createXmlSchemaDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID, camelSpringXsd);
  }

  static createTargetOrderDoc() {
    return XmlSchemaDocumentService.createXmlSchemaDocument(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, shipOrderXsd);
  }

  static createJSONTargetOrderDoc() {
    return JsonSchemaDocumentService.createJsonSchemaDocument(
      DocumentType.TARGET_BODY,
      BODY_DOCUMENT_ID,
      shipOrderJsonSchema,
    );
  }

  static createParamOrderDoc(name: string, schemaType?: DocumentDefinitionType, content?: string) {
    let answer: BaseDocument;
    if (schemaType === DocumentDefinitionType.JSON_SCHEMA) {
      answer = JsonSchemaDocumentService.createJsonSchemaDocument(DocumentType.PARAM, name, content || cartJsonSchema);
    } else {
      answer = XmlSchemaDocumentService.createXmlSchemaDocument(DocumentType.PARAM, name, content || shipOrderXsd);
    }
    answer.name = name;
    return answer;
  }

  static createParameterMap() {
    const sourceParamDoc = TestUtil.createParamOrderDoc('sourceParam1');
    const sourcePrimitiveParamDoc = new PrimitiveDocument(DocumentType.PARAM, 'primitive');
    const cartParamDoc = TestUtil.createParamOrderDoc('cart', DocumentDefinitionType.XML_SCHEMA, cartXsd);
    return new Map<string, IDocument>([
      ['sourceParam1', sourceParamDoc],
      ['primitive', sourcePrimitiveParamDoc],
      ['cart', cartParamDoc],
    ]);
  }

  static createJSONParameterMap() {
    const sourcePrimitiveParamDoc = new PrimitiveDocument(DocumentType.PARAM, 'primitive');
    const cartParamDoc = TestUtil.createParamOrderDoc('cart', DocumentDefinitionType.JSON_SCHEMA, cartJsonSchema);
    const cart2ParamDoc = TestUtil.createParamOrderDoc('cart2', DocumentDefinitionType.JSON_SCHEMA, cartJsonSchema);
    return new Map<string, IDocument>([
      ['primitive', sourcePrimitiveParamDoc],
      ['cart', cartParamDoc],
      ['cart2', cart2ParamDoc],
    ]);
  }
}
