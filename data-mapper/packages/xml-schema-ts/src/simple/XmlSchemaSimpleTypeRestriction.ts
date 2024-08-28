import type { XmlSchemaSimpleType } from './XmlSchemaSimpleType';
import type { XmlSchemaFacet } from '../facet/XmlSchemaFacet';
import type { QName } from '../QName';

import { XmlSchemaSimpleTypeContent } from './XmlSchemaSimpleTypeContent';

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
