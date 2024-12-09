import type { XmlSchemaNamedWithForm } from './XmlSchemaNamedWithForm';
import type { XmlSchema } from '../XmlSchema';
import { XmlSchemaNamedImpl } from './XmlSchemaNamedImpl';
import { QName } from '../QName';
import { XmlSchemaForm } from '../XmlSchemaForm';

/**
 *
 */
export class XmlSchemaNamedWithFormImpl extends XmlSchemaNamedImpl implements XmlSchemaNamedWithForm {
  private form = XmlSchemaForm.NONE;
  private element = false;
  private wireName: QName | null = null;

  /**
   * Delegate object for managing names for attributes and elements.
   * @param parent containing schema.
   * @param topLevel if this object is global.
   * @param element true for an element, false for an attribute.
   */
  constructor(parent: XmlSchema, topLevel: boolean, element: boolean) {
    super(parent, topLevel);
    this.element = element;
  }

  /**
   * Return the <strong>effective</strong> 'form' for this item. If the item
   * has an explicit form declaration, this returns that declared form. If not,
   * it returns the appropriate default form from the containing schema.
   * @return {@link XmlSchemaForm#QUALIFIED} or {@link XmlSchemaForm#UNQUALIFIED}.
   */
  getForm() {
    if (this.form != XmlSchemaForm.NONE) {
      return this.form;
    } else if (this.isTopLevel()) {
      return XmlSchemaForm.QUALIFIED;
    } else if (this.element) {
      return this.parentSchema.getElementFormDefault();
    } else {
      return this.parentSchema.getAttributeFormDefault();
    }
  }

  isFormSpecified() {
    return this.form != XmlSchemaForm.NONE;
  }

  setForm(form: XmlSchemaForm) {
    if (form == null) {
      throw new Error('form may not be null. ' + 'Pass XmlSchemaForm.NONE to use schema default.');
    }
    this.form = form;
    this.setName(this.getName());
  }

  setName(name: string | null) {
    super.setName(name);
    if (this.getForm() == XmlSchemaForm.QUALIFIED) {
      this.wireName = this.getQName();
    } else {
      this.wireName = new QName('', this.getName());
    }
  }

  getWireName() {
    // If this is a ref= case, then we take the name from the ref=, not from the QName.
    // what about ref='foo' form='unqualified'? Is that possible?
    if (this.refTwin != null && this.refTwin.getTargetQName() != null) {
      return this.refTwin.getTargetQName();
    } else {
      return this.wireName;
    }
  }
}
