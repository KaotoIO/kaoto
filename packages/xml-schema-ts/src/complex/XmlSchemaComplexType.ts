import type { XmlSchema } from '../XmlSchema';
import type { XmlSchemaAnyAttribute } from '../XmlSchemaAnyAttribute';
import type { XmlSchemaAttributeOrGroupRef } from '../attribute/XmlSchemaAttributeOrGroupRef';
import type { XmlSchemaContentModel } from '../XmlSchemaContentModel';
import type { XmlSchemaContentType } from '../XmlSchemaContentType';
import type { XmlSchemaParticle } from '../particle/XmlSchemaParticle';

import { XmlSchemaType } from '../XmlSchemaType';
import { XmlSchemaDerivationMethod } from '../XmlSchemaDerivationMethod';
import { XmlSchemaComplexContentExtension } from './XmlSchemaComplexContentExtension';
import { XmlSchemaComplexContentRestriction } from './XmlSchemaComplexContentRestriction';

export class XmlSchemaComplexType extends XmlSchemaType {
  private anyAttribute: XmlSchemaAnyAttribute | null = null;
  private attributeWildcard: XmlSchemaAnyAttribute | null = null;
  private attributes: XmlSchemaAttributeOrGroupRef[] = [];
  private block: XmlSchemaDerivationMethod = XmlSchemaDerivationMethod.NONE;
  private blockResolved: XmlSchemaDerivationMethod | null = null;
  private contentModel: XmlSchemaContentModel | null = null;
  private contentType: XmlSchemaContentType | null = null;
  private particleType: XmlSchemaParticle | null = null;
  private particle: XmlSchemaParticle | null = null;
  private _isAbstract: boolean = false;

  /**
   * Creates new XmlSchemaComplexType
   */
  constructor(schema: XmlSchema, topLevel: boolean) {
    super(schema, topLevel);
  }

  getAnyAttribute() {
    return this.anyAttribute;
  }

  setAnyAttribute(anyAttribute: XmlSchemaAnyAttribute) {
    this.anyAttribute = anyAttribute;
  }

  public getAttributes() {
    return this.attributes;
  }

  public getAttributeWildcard() {
    return this.attributeWildcard;
  }

  getBlock() {
    return this.block;
  }

  setBlock(block: XmlSchemaDerivationMethod) {
    this.block = block;
  }

  getBlockResolved() {
    return this.blockResolved;
  }

  getContentModel() {
    return this.contentModel;
  }

  setContentModel(contentModel: XmlSchemaContentModel) {
    this.contentModel = contentModel;
  }

  getContentType() {
    return this.contentType;
  }

  setContentType(contentType: XmlSchemaContentType) {
    this.contentType = contentType;
  }

  getContentTypeParticle() {
    return this.particleType;
  }

  isAbstract() {
    return this._isAbstract;
  }

  setAbstract(b: boolean) {
    this._isAbstract = b;
  }

  getParticle() {
    return this.particle;
  }

  setParticle(particle: XmlSchemaParticle | null) {
    this.particle = particle;
  }

  /**
   * Return the QName of the base schema type, if any, as defined in the content model.
   */
  getBaseSchemaTypeName() {
    const model = this.getContentModel();
    if (model == null) {
      return null;
    }
    const content = model.getContent();
    if (content == null) {
      return null;
    }

    if (content instanceof XmlSchemaComplexContentExtension) {
      return (content as XmlSchemaComplexContentExtension).getBaseTypeName();
    }
    if (content instanceof XmlSchemaComplexContentRestriction) {
      return (content as XmlSchemaComplexContentRestriction).getBaseTypeName();
    }
    return null;
  }

  setAttributeWildcard(attributeWildcard: XmlSchemaAnyAttribute) {
    this.attributeWildcard = attributeWildcard;
  }

  setAttributes(attributes: XmlSchemaAttributeOrGroupRef[]) {
    this.attributes = attributes;
  }

  setBlockResolved(blockResolved: XmlSchemaDerivationMethod) {
    this.blockResolved = blockResolved;
  }

  setParticleType(particleType: XmlSchemaParticle) {
    this.particleType = particleType;
  }

  getParticleType() {
    return this.particleType;
  }
}
