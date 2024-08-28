/**
 * Class for complex types with a complex content model derived by extension. Extends the complex type by
 * adding attributes or elements. Represents the World Wide Web Consortium (W3C) extension element for complex
 * content.
 */
import type { QName } from '../QName';
import type { XmlSchemaAnyAttribute } from '../XmlSchemaAnyAttribute';
import type { XmlSchemaAttributeOrGroupRef } from '../attribute/XmlSchemaAttributeOrGroupRef';
import type { XmlSchemaParticle } from '../particle/XmlSchemaParticle';
import { XmlSchemaContent } from '../XmlSchemaContent';

export class XmlSchemaComplexContentExtension extends XmlSchemaContent {
  /* Allows an XmlSchemaAnyAttribute to be used for the attribute value. */
  private anyAttribute: XmlSchemaAnyAttribute | null = null;
  /*
   * Contains XmlSchemaAttribute and XmlSchemaAttributeGroupRef. Collection of attributes for the simple
   * type.
   */
  private attributes: XmlSchemaAttributeOrGroupRef[] = [];
  /* Name of the built-in data type, simple type, or complex type. */
  private baseTypeName: QName | null = null;

  /* One of the XmlSchemaGroupRef, XmlSchemaChoice, XmlSchemaAll, or XmlSchemaSequence classes. */
  private particle: XmlSchemaParticle | null = null;

  setAnyAttribute(anyAttribute: XmlSchemaAnyAttribute) {
    this.anyAttribute = anyAttribute;
  }

  getAnyAttribute() {
    return this.anyAttribute;
  }

  public getAttributes() {
    return this.attributes;
  }

  setBaseTypeName(baseTypeName: QName) {
    this.baseTypeName = baseTypeName;
  }

  getBaseTypeName() {
    return this.baseTypeName;
  }

  getParticle() {
    return this.particle;
  }

  setParticle(particle: XmlSchemaParticle) {
    this.particle = particle;
  }

  setAttributes(attributes: XmlSchemaAttributeOrGroupRef[]) {
    this.attributes = attributes;
  }
}
