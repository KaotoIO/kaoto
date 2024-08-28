import type { QName } from '../QName';
import type { TypeReceiver } from '../TypeReceiver';
import type { XmlSchema } from '../XmlSchema';
import type { XmlSchemaAllMember } from './XmlSchemaAllMember';
import type { XmlSchemaChoiceMember } from './XmlSchemaChoiceMember';
import type { XmlSchemaForm } from '../XmlSchemaForm';
import type { XmlSchemaIdentityConstraint } from '../constraint/XmlSchemaIdentityConstraint';
import type { XmlSchemaItemWithRef } from '../XmlSchemaItemWithRef';
import type { XmlSchemaSequenceMember } from './XmlSchemaSequenceMember';
import type { XmlSchemaType } from '../XmlSchemaType';
import type { XmlSchemaNamedWithForm } from '../utils/XmlSchemaNamedWithForm';

import { XmlSchemaNamedWithFormImpl } from '../utils/XmlSchemaNamedWithFormImpl';
import { XmlSchemaRef } from '../utils/XmlSchemaRef';
import { XmlSchemaNamedType } from '../utils/XmlSchemaNamedType';
import { XmlSchemaParticle } from './XmlSchemaParticle';
import { XmlSchemaDerivationMethod } from '../XmlSchemaDerivationMethod';

export class XmlSchemaElement
  extends XmlSchemaParticle
  implements
    TypeReceiver,
    XmlSchemaNamedWithForm,
    XmlSchemaChoiceMember,
    XmlSchemaSequenceMember,
    XmlSchemaAllMember,
    XmlSchemaItemWithRef<XmlSchemaElement>
{
  /**
   * Attribute used to block a type derivation.
   */
  private block: XmlSchemaDerivationMethod;

  private constraints: XmlSchemaIdentityConstraint[] = [];

  /**
   * Provides the default value of the element if its content is a simple type or the element's content is
   * textOnly.
   */
  defaultValue: string | null = null;
  fixedValue: string | null = null;

  finalDerivation: XmlSchemaDerivationMethod;

  abstractElement: boolean;
  nillable: boolean;
  ref: XmlSchemaRef<XmlSchemaElement>;

  /**
   * Returns the type of the element. This can either be a complex type or a simple type.
   */
  private schemaType: XmlSchemaType | null = null;

  /**
   * QName of a built-in data type defined in this schema or another schema indicated by the specified
   * namespace.
   */
  private schemaTypeName: QName | null = null;

  /**
   * QName of an element that can be a substitute for this element.
   */
  private substitutionGroup: QName | null = null;

  private namedDelegate: XmlSchemaNamedWithFormImpl;

  /**
   * Creates new XmlSchemaElement
   */
  constructor(parentSchema: XmlSchema, topLevel: boolean) {
    super();
    this.namedDelegate = new XmlSchemaNamedWithFormImpl(parentSchema, topLevel, true);
    this.ref = new XmlSchemaRef<XmlSchemaElement>(parentSchema, XmlSchemaNamedType.XmlSchemaElement);
    this.namedDelegate.setRefObject(this.ref);
    this.ref.setNamedObject(this.namedDelegate);

    this.abstractElement = false;
    this.nillable = false;
    this.finalDerivation = XmlSchemaDerivationMethod.NONE;
    this.block = XmlSchemaDerivationMethod.NONE;
    const fParentSchema = parentSchema;
    if (topLevel) {
      fParentSchema.getItems().push(this);
    }
  }

  /**
   * Returns a collection of constraints on the element.
   */
  getConstraints() {
    return this.constraints;
  }

  getDefaultValue() {
    return this.defaultValue;
  }

  setDefaultValue(defaultValue: string | null) {
    this.defaultValue = defaultValue;
  }

  getBlock(): XmlSchemaDerivationMethod {
    return this.block;
  }

  setBlock(block: XmlSchemaDerivationMethod) {
    this.block = block;
  }

  getFinal(): XmlSchemaDerivationMethod {
    return this.finalDerivation;
  }

  setFinal(finalDerivationValue: XmlSchemaDerivationMethod) {
    this.finalDerivation = finalDerivationValue;
  }

  getFixedValue() {
    return this.fixedValue;
  }

  setFixedValue(fixedValue: string | null) {
    this.fixedValue = fixedValue;
  }

  isAbstract() {
    return this.abstractElement;
  }

  setAbstract(isAbstract: boolean) {
    this.abstractElement = isAbstract;
  }

  isNillable() {
    return this.nillable;
  }

  setNillable(isNillable: boolean) {
    this.nillable = isNillable;
  }

  getRef() {
    return this.ref;
  }

  getSchemaType() {
    return this.schemaType;
  }

  setSchemaType(schemaType: XmlSchemaType | null) {
    this.schemaType = schemaType;
  }

  getSchemaTypeName() {
    return this.schemaTypeName;
  }

  setSchemaTypeName(schemaTypeName: QName | null) {
    this.schemaTypeName = schemaTypeName;
  }

  getSubstitutionGroup() {
    return this.substitutionGroup;
  }

  setSubstitutionGroup(substitutionGroup: QName) {
    this.substitutionGroup = substitutionGroup;
  }

  setType(type: XmlSchemaType) {
    this.schemaType = type;
  }

  getName() {
    return this.namedDelegate.getName();
  }

  getParent() {
    return this.namedDelegate.getParent();
  }

  getQName() {
    return this.namedDelegate.getQName();
  }

  isAnonymous() {
    return this.namedDelegate.isAnonymous();
  }

  isTopLevel() {
    return this.namedDelegate.isTopLevel();
  }

  setName(name: string | null) {
    const fName = name;
    if (this.isTopLevel() && this.getName() != null) {
      this.getParent().getElements().delete(this.getQName()!);
    }
    this.namedDelegate.setName(fName);
    if (this.namedDelegate.isTopLevel()) {
      this.getParent().getElements().set(this.getQName()!, this);
    }
  }

  getForm() {
    return this.namedDelegate.getForm();
  }

  isFormSpecified() {
    return this.namedDelegate.isFormSpecified();
  }

  setForm(form: XmlSchemaForm) {
    this.namedDelegate.setForm(form);
  }

  getWireName() {
    return this.namedDelegate.getWireName();
  }

  setFinalDerivation(finalDerivation: XmlSchemaDerivationMethod) {
    this.finalDerivation = finalDerivation;
  }

  getFinalDerivation() {
    return this.finalDerivation;
  }

  setAbstractElement(abstractElement: boolean) {
    this.abstractElement = abstractElement;
  }

  isAbstractElement() {
    return this.abstractElement;
  }

  isRef() {
    return this.ref.getTargetQName() != null;
  }

  getTargetQName() {
    return this.ref.getTargetQName();
  }

  getRefBase() {
    return this.ref;
  }
}
