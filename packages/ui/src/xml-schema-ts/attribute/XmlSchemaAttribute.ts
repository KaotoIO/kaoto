import type { QName } from '../QName';
import type { XmlSchema } from '../XmlSchema';
import type { XmlSchemaAttributeGroupMember } from './XmlSchemaAttributeGroupMember';
import type { XmlSchemaItemWithRef } from '../XmlSchemaItemWithRef';
import type { XmlSchemaSimpleType } from '../simple/XmlSchemaSimpleType';
import type { XmlSchemaNamedWithForm } from '../utils/XmlSchemaNamedWithForm';

import { XmlSchemaNamedWithFormImpl } from '../utils/XmlSchemaNamedWithFormImpl';
import { XmlSchemaNamedType } from '../utils/XmlSchemaNamedType';
import { XmlSchemaRef } from '../utils/XmlSchemaRef';
import { XmlSchemaAttributeOrGroupRef } from './XmlSchemaAttributeOrGroupRef';
import { XmlSchemaForm } from '../XmlSchemaForm';
import { XmlSchemaUse } from '../XmlSchemaUse';

export class XmlSchemaAttribute
  extends XmlSchemaAttributeOrGroupRef
  implements XmlSchemaNamedWithForm, XmlSchemaAttributeGroupMember, XmlSchemaItemWithRef<XmlSchemaAttribute>
{
  private defaultValue: string | null = null;
  private fixedValue: string | null = null;
  private schemaType: XmlSchemaSimpleType | null = null;
  private schemaTypeName: QName | null = null;
  private use: XmlSchemaUse;
  private namedDelegate: XmlSchemaNamedWithFormImpl;
  private ref: XmlSchemaRef<XmlSchemaAttribute>;

  /**
   * Create a new attribute.
   * @param schema containing scheme.
   * @param topLevel true if a global attribute.
   */
  constructor(schema: XmlSchema, topLevel: boolean) {
    super();
    this.namedDelegate = new XmlSchemaNamedWithFormImpl(schema, topLevel, false);
    this.ref = new XmlSchemaRef<XmlSchemaAttribute>(schema, XmlSchemaNamedType.XmlSchemaAttribute);
    this.namedDelegate.setRefObject(this.ref);
    this.ref.setNamedObject(this.namedDelegate);
    this.use = XmlSchemaUse.NONE;
    if (topLevel) {
      schema.getItems().push(this);
    }
  }

  getDefaultValue() {
    return this.defaultValue;
  }

  setDefaultValue(defaultValue: string) {
    this.defaultValue = defaultValue;
  }

  getFixedValue() {
    return this.fixedValue;
  }

  setFixedValue(fixedValue: string) {
    this.fixedValue = fixedValue;
  }

  getRef(): XmlSchemaRef<XmlSchemaAttribute> {
    return this.ref;
  }

  getSchemaType() {
    return this.schemaType;
  }

  setSchemaType(schemaType: XmlSchemaSimpleType) {
    this.schemaType = schemaType;
  }

  getSchemaTypeName() {
    return this.schemaTypeName;
  }

  setSchemaTypeName(schemaTypeName: QName) {
    this.schemaTypeName = schemaTypeName;
  }

  getUse() {
    return this.use;
  }

  setUse(use: XmlSchemaUse) {
    if (this.namedDelegate.isTopLevel() && use != null) {
      throw new Error("Top-level attributes may not have a 'use'");
    }
    this.use = use;
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

  setName(name: string) {
    const fName = name;
    if (this.isTopLevel() && this.getName() != null) {
      this.getParent().getAttributes().delete(this.getQName()!);
    }
    this.namedDelegate.setName(fName);
    if (this.isTopLevel()) {
      if (fName == null) {
        throw new Error('Top-level attributes may not be anonymous');
      }
      this.getParent().getAttributes().set(this.getQName()!, this);
    }
  }

  isFormSpecified() {
    return this.namedDelegate.isFormSpecified();
  }

  getForm() {
    return this.namedDelegate.getForm();
  }

  setForm(form: XmlSchemaForm) {
    if (this.isTopLevel() && form != XmlSchemaForm.NONE) {
      throw new Error("Top-level attributes may not have a 'form'");
    }
    this.namedDelegate.setForm(form);
  }

  getWireName() {
    return this.namedDelegate.getWireName();
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
