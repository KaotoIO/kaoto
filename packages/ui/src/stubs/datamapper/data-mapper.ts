import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';

import {
  BaseDocument,
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IDocument,
  PrimitiveDocument,
} from '../../models/datamapper/document';
import { JsonSchemaDocumentService } from '../../services/json-schema-document.service';
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

const fileCache = new Map<string, string>();
function readStubFile(relativePath: string): string {
  if (!fileCache.has(relativePath)) {
    fileCache.set(relativePath, fs.readFileSync(path.resolve(__dirname, relativePath)).toString());
  }
  return fileCache.get(relativePath)!;
}

export function getShipOrderXsd(): string {
  return readStubFile('./xml/ShipOrder.xsd');
}
export function getCartXsd(): string {
  return readStubFile('./xml/Cart.xsd');
}
export function getCrossSchemaBaseTypesXsd(): string {
  return readStubFile('./xml/CrossSchemaBaseTypes.xsd');
}
export function getCrossSchemaDerivedTypesXsd(): string {
  return readStubFile('./xml/CrossSchemaDerivedTypes.xsd');
}
export function getTestDocumentXsd(): string {
  return readStubFile('./xml/TestDocument.xsd');
}
export function getNoTopElementXsd(): string {
  return readStubFile('./xml/NoTopElement.xsd');
}
export function getNamedTypesXsd(): string {
  return readStubFile('./xml/NamedTypes.xsd');
}
export function getCamelSpringXsd(): string {
  return readStubFile('./xml/camel-spring.xsd');
}
export function getMultipleElementsXsd(): string {
  return readStubFile('./xml/MultipleElements.xsd');
}
export function getCartToShipOrderXslt(): string {
  return readStubFile('./xml/CartToShipOrder.xsl');
}
export function getShipOrderToShipOrderXslt(): string {
  return readStubFile('./xml/ShipOrderToShipOrder.xsl');
}
export function getConditionalMappingsToShipOrderXslt(): string {
  return readStubFile('./xml/ConditionalMappingsToShipOrder.xsl');
}
export function getShipOrderToShipOrderInvalidForEachXslt(): string {
  return readStubFile('./xml/ShipOrderToShipOrderInvalidForEach.xsl');
}
export function getShipOrderEmptyFirstLineXsd(): string {
  return readStubFile('./xml/ShipOrderEmptyFirstLine.xsd');
}
export function getShipOrderToShipOrderMultipleForEachXslt(): string {
  return readStubFile('./xml/ShipOrderToShipOrderMultipleForEach.xsl');
}
export function getShipOrderToShipOrderCollectionIndexXslt(): string {
  return readStubFile('./xml/ShipOrderToShipOrderCollectionIndex.xsl');
}
export function getNestedConditionalsToShipOrderXslt(): string {
  return readStubFile('./xml/NestedConditionalsToShipOrder.xsl');
}
export function getShipOrderWithCurrentXslt(): string {
  return readStubFile('./xml/ShipOrderWithCurrent.xsl');
}
export function getX12837PDfdlXsd(): string {
  return readStubFile('./xml/X12-837P.dfdl.xsd');
}
export function getMessage837Xsd(): string {
  return readStubFile('./xml/Message837.xsd');
}
export function getX12837PXslt(): string {
  return readStubFile('./xml/X12-837.xsl');
}
export function getX12850DfdlXsd(): string {
  return readStubFile('./xml/X12-850.dfdl.xsd');
}
export function getInvoice850Xsd(): string {
  return readStubFile('./xml/Invoice850.xsd');
}
export function getX12850ForEachXslt(): string {
  return readStubFile('./xml/X12-850-Invoice-for-each.xsl');
}
export function getCamelYamlDslJsonSchema(): string {
  return readStubFile('./json/camelYamlDsl.json');
}
export function getCartJsonSchema(): string {
  return readStubFile('./json/Cart.schema.json');
}
export function getAccountJsonSchema(): string {
  return readStubFile('./json/Account.schema.json');
}
export function getShipOrderJsonSchema(): string {
  return readStubFile('./json/ShipOrder.schema.json');
}
export function getShipOrderJsonXslt(): string {
  return readStubFile('./json/ShipOrderJson.xsl');
}
export function getCartToShipOrderJsonXslt(): string {
  return readStubFile('./json/CartToShipOrderJson.xsl');
}
export function getConditionalMappingsToShipOrderJsonXslt(): string {
  return readStubFile('./json/ConditionalMappingsToShipOrderJson.xsl');
}
export function getMultipleForEachJsonXslt(): string {
  return readStubFile('./json/MultipleForEach.xsl');
}
export function getJsonBodyToShipOrderXslt(): string {
  return readStubFile('./json/JsonBodyToShipOrder.xsl');
}
export function getCommonTypesJsonSchema(): string {
  return readStubFile('./json/CommonTypes.schema.json');
}
export function getCustomerJsonSchema(): string {
  return readStubFile('./json/Customer.schema.json');
}
export function getOrderJsonSchema(): string {
  return readStubFile('./json/Order.schema.json');
}
export function getMainWithRefJsonSchema(): string {
  return readStubFile('./json/MainWithRef.schema.json');
}
export function getProductJsonSchema(): string {
  return readStubFile('./json/nested/Product.schema.json');
}
export function getOrgXsd(): string {
  return readStubFile('./xml/Org.xsd');
}
export function getContactsXsd(): string {
  return readStubFile('./xml/Contacts.xsd');
}
export function getOrgToContactsXslt(): string {
  return readStubFile('./xml/OrgToContacts.xsl');
}
export function getExtensionSimpleXsd(): string {
  return readStubFile('./xml/ExtensionSimple.xsd');
}
export function getExtensionComplexXsd(): string {
  return readStubFile('./xml/ExtensionComplex.xsd');
}
export function getSchemaTestXsd(): string {
  return readStubFile('./xml/SchemaTest.xsd');
}
export function getRestrictionComplexXsd(): string {
  return readStubFile('./xml/RestrictionComplex.xsd');
}
export function getRestrictionSimpleXsd(): string {
  return readStubFile('./xml/RestrictionSimple.xsd');
}
export function getRestrictionInheritanceXsd(): string {
  return readStubFile('./xml/RestrictionInheritance.xsd');
}
export function getMultiLevelExtensionXsd(): string {
  return readStubFile('./xml/MultiLevelExtension.xsd');
}
export function getMultiLevelRestrictionXsd(): string {
  return readStubFile('./xml/MultiLevelRestriction.xsd');
}
export function getInvalidComplexExtensionXsd(): string {
  return readStubFile('./xml/InvalidComplexExtension.xsd');
}
export function getSimpleTypeInheritanceXsd(): string {
  return readStubFile('./xml/SimpleTypeInheritance.xsd');
}
export function getSimpleTypeRestrictionXsd(): string {
  return readStubFile('./xml/SimpleTypeRestriction.xsd');
}
export function getLazyLoadingTestXsd(): string {
  return readStubFile('./xml/LazyLoadingTest.xsd');
}
export function getAdtInXsd(): string {
  return readStubFile('./xml/ADT_IN.xsd');
}
export function getAdtOutXsd(): string {
  return readStubFile('./xml/ADT_OUT.xsd');
}
export function getElementRefXsd(): string {
  return readStubFile('./xml/element-ref.xsd');
}
export function getAccountLcXsd(): string {
  return readStubFile('./xml/account-lc.xsd');
}
export function getAccountNsXsd(): string {
  return readStubFile('./xml/account-ns.xsd');
}
export function getAccountNs2Xsd(): string {
  return readStubFile('./xml/account-ns2.xsd');
}
export function getMainWithIncludeXsd(): string {
  return readStubFile('./xml/MainWithInclude.xsd');
}
export function getCommonTypesXsd(): string {
  return readStubFile('./xml/CommonTypes.xsd');
}
export function getMainWithImportXsd(): string {
  return readStubFile('./xml/MainWithImport.xsd');
}
export function getImportedTypesXsd(): string {
  return readStubFile('./xml/ImportedTypes.xsd');
}
export function getMultiIncludeMainXsd(): string {
  return readStubFile('./xml/MultiIncludeMain.xsd');
}
export function getMultiIncludeComponentAXsd(): string {
  return readStubFile('./xml/MultiIncludeComponentA.xsd');
}
export function getMultiIncludeComponentBXsd(): string {
  return readStubFile('./xml/MultiIncludeComponentB.xsd');
}
export function getInlineAttrSimpleTypeXsd(): string {
  return readStubFile('./xml/InlineAttrSimpleType.xsd');
}
export function getAnonymousGlobalElementRefLargeXsd(): string {
  return readStubFile('./xml/AnonymousGlobalElementRefLarge.xsd');
}
export function getFieldSubstitutionXsd(): string {
  return readStubFile('./xml/FieldSubstitution.xsd');
}

export class TestUtil {
  static createSourceOrderDoc() {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'shipOrder.xsd': getShipOrderXsd(),
      },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    if (result.validationStatus !== 'success' || !result.document) {
      throw new Error(result.errors?.map((e) => e.message).join('; ') || 'Failed to create document');
    }
    return result.document;
  }

  static createCamelSpringXsdSourceDoc() {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'camelSpring.xsd': getCamelSpringXsd(),
      },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    if (result.validationStatus !== 'success' || !result.document) {
      throw new Error(result.errors?.map((e) => e.message).join('; ') || 'Failed to create document');
    }
    return result.document;
  }

  static createTargetOrderDoc() {
    const definition = new DocumentDefinition(
      DocumentType.TARGET_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'shipOrder.xsd': getShipOrderXsd(),
      },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    if (result.validationStatus !== 'success' || !result.document) {
      throw new Error(result.errors?.map((e) => e.message).join('; ') || 'Failed to create document');
    }
    return result.document;
  }

  static createJSONSourceBodyOrderDoc() {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.JSON_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'shipOrder.json': getShipOrderJsonSchema(),
      },
    );
    const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
    if (result.validationStatus !== 'success' || !result.document) {
      throw new Error(result.errors?.map((e) => e.message).join('; ') || 'Failed to create document');
    }
    return result.document;
  }

  static createJSONTargetOrderDoc() {
    const definition = new DocumentDefinition(
      DocumentType.TARGET_BODY,
      DocumentDefinitionType.JSON_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'shipOrder.json': getShipOrderJsonSchema(),
      },
    );
    const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
    if (result.validationStatus !== 'success' || !result.document) {
      throw new Error(result.errors?.map((e) => e.message).join('; ') || 'Failed to create document');
    }
    return result.document;
  }

  static createParamOrderDoc(name: string, schemaType?: DocumentDefinitionType, content?: string) {
    let answer: BaseDocument;
    if (schemaType === DocumentDefinitionType.JSON_SCHEMA) {
      const definition = new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.JSON_SCHEMA, name, {
        [`${name}.json`]: content || getCartJsonSchema(),
      });
      answer = JsonSchemaDocumentService.createJsonSchemaDocument(definition).document!;
    } else {
      const definition = new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.XML_SCHEMA, name, {
        [`${name}.xsd`]: content || getShipOrderXsd(),
      });
      answer = XmlSchemaDocumentService.createXmlSchemaDocument(definition).document!;
    }
    answer.name = name;
    return answer;
  }

  static createParameterMap() {
    const sourceParamDoc = TestUtil.createParamOrderDoc('sourceParam1');
    const sourcePrimitiveParamDoc = new PrimitiveDocument(
      new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.Primitive, 'primitive'),
    );
    const cartParamDoc = TestUtil.createParamOrderDoc('cart', DocumentDefinitionType.XML_SCHEMA, getCartXsd());
    return new Map<string, IDocument>([
      ['sourceParam1', sourceParamDoc],
      ['primitive', sourcePrimitiveParamDoc],
      ['cart', cartParamDoc],
    ]);
  }

  static createJSONParameterMap() {
    const sourcePrimitiveParamDoc = new PrimitiveDocument(
      new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.Primitive, 'primitive'),
    );
    const cartParamDoc = TestUtil.createParamOrderDoc('cart', DocumentDefinitionType.JSON_SCHEMA, getCartJsonSchema());
    const cart2ParamDoc = TestUtil.createParamOrderDoc(
      'cart2',
      DocumentDefinitionType.JSON_SCHEMA,
      getCartJsonSchema(),
    );
    return new Map<string, IDocument>([
      ['primitive', sourcePrimitiveParamDoc],
      ['cart', cartParamDoc],
      ['cart2', cart2ParamDoc],
    ]);
  }

  static createAdtInDoc() {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'ADT_IN.xsd': getAdtInXsd(),
      },
    );
    return XmlSchemaDocumentService.createXmlSchemaDocument(definition);
  }

  static createAdtOutDoc() {
    const definition = new DocumentDefinition(
      DocumentType.TARGET_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'ADT_OUT.xsd': getAdtOutXsd(),
      },
    );
    return XmlSchemaDocumentService.createXmlSchemaDocument(definition);
  }
}
