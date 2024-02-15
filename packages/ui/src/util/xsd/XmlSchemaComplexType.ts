import { XmlSchema, XmlSchemaDerivationMethod, XmlSchemaParticle, XmlSchemaType } from '.';

export class XmlSchemaComplexType extends XmlSchemaType {
  private anyAttribute: XmlSchemaAnyAttribute;
  private attributeWildcard: XmlSchemaAnyAttribute;
  private attributes: XmlSchemaAttributeOrGroupRef[] = [];
  private block: XmlSchemaDerivationMethod = XmlSchemaDerivationMethod.NONE;
  private blockResolved: XmlSchemaDerivationMethod;
  private contentModel: XmlSchemaContentModel;
  private contentType: XmlSchemaContentType;
  private particleType: XmlSchemaParticle;
  private particle: XmlSchemaParticle;
  private isAbstract: boolean = false;

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
    return this.isAbstract;
  }

  setAbstract(b: boolean) {
    this.isAbstract = b;
  }

  getParticle() {
    return this.particle;
  }

  setParticle(particle: XmlSchemaParticle) {
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
