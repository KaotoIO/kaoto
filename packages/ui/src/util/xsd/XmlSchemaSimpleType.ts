import { QName, XmlSchemaAnnotated, XmlSchemaFacet, XmlSchemaType } from '.';

export abstract class XmlSchemaSimpleTypeContent extends XmlSchemaAnnotated {}

export class XmlSchemaSimpleTypeRestriction extends XmlSchemaSimpleTypeContent {
  private baseType?: XmlSchemaSimpleType;
  private baseTypeName?: QName;
  private facets: XmlSchemaFacet[] = [];

  getBaseType() {
    return this.baseType;
  }

  setBaseType(baseType: XmlSchemaSimpleType) {
    this.baseType = baseType;
  }

  getBaseTypeName() {
    return this.baseTypeName;
  }

  setBaseTypeName(baseTypeName: QName) {
    this.baseTypeName = baseTypeName;
  }

  getFacets() {
    return this.facets;
  }
}

export class XmlSchemaSimpleTypeList extends XmlSchemaSimpleTypeContent {
  itemType?: XmlSchemaSimpleType;
  itemTypeName?: QName;

  getItemType() {
    return this.itemType;
  }

  setItemType(itemType: XmlSchemaSimpleType) {
    this.itemType = itemType;
  }

  getItemTypeName() {
    return this.itemTypeName;
  }

  setItemTypeName(itemTypeName: QName) {
    this.itemTypeName = itemTypeName;
  }
}

export class XmlSchemaSimpleType extends XmlSchemaType {
  content?: XmlSchemaSimpleTypeContent;

  getContent() {
    return this.content;
  }
  setContent(content: XmlSchemaSimpleTypeContent) {
    this.content = content;
  }
}
