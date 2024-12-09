/**
 * Class for complex types with a complex content model that are derived by restriction. Restricts the
 * contents of the complex type to a subset of the inherited complex type. Represents the World Wide Web
 * Consortium (W3C) restriction element for complex content.
 */
import type { QName } from '../QName';
import type { XmlSchemaAnyAttribute } from '../XmlSchemaAnyAttribute';
import type { XmlSchemaAttributeOrGroupRef } from '../attribute/XmlSchemaAttributeOrGroupRef';
import type { XmlSchemaParticle } from '../particle/XmlSchemaParticle';
import { XmlSchemaContent } from '../XmlSchemaContent';

export class XmlSchemaComplexContentRestriction extends XmlSchemaContent {
  /* Allows an XmlSchemaAnyAttribute to be used for the attribute value. */
  private anyAttribute: XmlSchemaAnyAttribute | null = null;
  /*
   * Contains XmlSchemaAttribute and XmlSchemaAttributeGroupRef. Collection of attributes for the simple
   * type.
   */
  private attributes: XmlSchemaAttributeOrGroupRef[] = [];
  /* Name of the built-in data type, simple type, or complex type. */
  private baseTypeName: QName | null = null;
  /*
   * One of the XmlSchemaGroupRef, XmlSchemaChoice, XmlSchemaAll, or XmlSchemaSequence classes.
   */
  private particle: XmlSchemaParticle | null = null;

  setAnyAttribute(anyAttribute: XmlSchemaAnyAttribute) {
    this.anyAttribute = anyAttribute;
  }

  getAnyAttribute() {
    return this.anyAttribute;
  }

  getAttributes() {
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
