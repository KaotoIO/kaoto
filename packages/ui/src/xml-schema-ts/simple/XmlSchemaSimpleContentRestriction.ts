/**
 * Class for simple types that are derived by restriction. Restricts the range of values for the element to a
 * subset of the inherited simple types. Represents the World Wide Web Consortium (W3C) restriction element
 * for simple content.
 */

import type { QName } from '../QName';
import type { XmlSchemaAnyAttribute } from '../XmlSchemaAnyAttribute';
import type { XmlSchemaAttributeOrGroupRef } from '../attribute/XmlSchemaAttributeOrGroupRef';
import type { XmlSchemaFacet } from '../facet/XmlSchemaFacet';
import type { XmlSchemaSimpleType } from './XmlSchemaSimpleType';
import { XmlSchemaContent } from '../XmlSchemaContent';

export class XmlSchemaSimpleContentRestriction extends XmlSchemaContent {
  anyAttribute: XmlSchemaAnyAttribute | null = null;
  /*
   * Contains XmlSchemaAttribute and XmlSchemaAttributeGroupRef. Collection of attributes for the simple
   * type.
   */
  private attributes: XmlSchemaAttributeOrGroupRef[] = [];

  /* Derived from the type specified by the base value. */
  private baseType: XmlSchemaSimpleType | null = null;

  /* Name of the built-in data type, simple type, or complex type. */
  private baseTypeName: QName | null = null;

  /* One or more of the facet classes: */
  private facets: XmlSchemaFacet[] = [];

  /* Allows an XmlSchemaAnyAttribute to be used for the attribute value. */

  setAnyAttribute(anyAttribute: XmlSchemaAnyAttribute) {
    this.anyAttribute = anyAttribute;
  }

  getAnyAttribute() {
    return this.anyAttribute;
  }

  getAttributes() {
    return this.attributes;
  }

  setBaseType(baseType: XmlSchemaSimpleType) {
    this.baseType = baseType;
  }

  getBaseType() {
    return this.baseType;
  }

  setBaseTypeName(baseTypeName: QName) {
    this.baseTypeName = baseTypeName;
  }

  getBaseTypeName() {
    return this.baseTypeName;
  }

  getFacets() {
    return this.facets;
  }
}
