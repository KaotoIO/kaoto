import type { XmlSchemaAttributeOrGroupRef } from '../attribute/XmlSchemaAttributeOrGroupRef';
import type { XmlSchemaAnyAttribute } from '../XmlSchemaAnyAttribute';
import type { QName } from '../QName';
import { XmlSchemaContent } from '../XmlSchemaContent';

/**
 * Class for simple types that are derived by extension. Extends the simple type content of the element by
 * adding attributes. Represents the World Wide Web Consortium (W3C) extension element for simple content.
 */
export class XmlSchemaSimpleContentExtension extends XmlSchemaContent {
  /* Allows an XmlSchemaAnyAttribute to be used for the attribute value. */
  private anyAttribute: XmlSchemaAnyAttribute | null = null;

  /*
   * Contains XmlSchemaAttribute and XmlSchemaAttributeGroupRef. Collection of attributes for the simple
   * type.
   */
  private attributes: XmlSchemaAttributeOrGroupRef[] = [];

  /* Name of the built-in data type, simple type, or complex type. */
  private baseTypeName: QName | null = null;

  getAnyAttribute() {
    return this.anyAttribute;
  }

  getAttributes() {
    return this.attributes;
  }

  getBaseTypeName() {
    return this.baseTypeName;
  }

  setAnyAttribute(anyAttribute: XmlSchemaAnyAttribute) {
    this.anyAttribute = anyAttribute;
  }

  setBaseTypeName(baseTypeName: QName) {
    this.baseTypeName = baseTypeName;
  }

  setAttributes(attributes: XmlSchemaAttributeOrGroupRef[]) {
    this.attributes = attributes;
  }
}
