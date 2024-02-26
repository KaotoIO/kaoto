import type { XmlSchema } from './XmlSchema';
import type { XmlSchemaNamed } from './utils/XmlSchemaNamed';
import { XmlSchemaAnnotated } from './XmlSchemaAnnotated';
import { XmlSchemaDerivationMethod } from './XmlSchemaDerivationMethod';
import { XmlSchemaNamedImpl } from './utils/XmlSchemaNamedImpl';

export class XmlSchemaType extends XmlSchemaAnnotated implements XmlSchemaNamed {
  private deriveBy: XmlSchemaDerivationMethod | null = null;
  private finalDerivation: XmlSchemaDerivationMethod;
  private finalResolved?: XmlSchemaDerivationMethod;
  private _isMixed = false;
  private namedDelegate: XmlSchemaNamedImpl;

  constructor(schema: XmlSchema, topLevel: boolean) {
    super();
    this.namedDelegate = new XmlSchemaNamedImpl(schema, topLevel);
    this.finalDerivation = XmlSchemaDerivationMethod.NONE;
    if (topLevel) {
      schema.getItems().push(this);
    }
  }

  getDeriveBy() {
    return this.deriveBy;
  }

  getFinal() {
    return this.finalDerivation;
  }

  setFinal(finalDerivationValue: XmlSchemaDerivationMethod) {
    this.finalDerivation = finalDerivationValue;
  }

  getFinalResolved() {
    return this.finalResolved;
  }

  isMixed() {
    return this._isMixed;
  }

  setMixed(isMixedValue: boolean) {
    this._isMixed = isMixedValue;
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
    /*
     * Inside a redefine, a 'non-top-level' type can have a name.
     * This requires us to tolerate this case (non-top-level, named) even it
     * in any other case it's completely invalid.
     */
    if (this.isTopLevel() && name == null) {
      throw new Error('A non-top-level type may not be anonyous.');
    }
    if (this.isTopLevel() && this.getName() != null) {
      const qname = this.getQName();
      qname && this.getParent().getSchemaTypes().delete(qname);
    }
    this.namedDelegate.setName(name!);
    if (this.isTopLevel()) {
      const qname = this.getQName();
      qname && this.getParent().getSchemaTypes().set(qname, this);
    }
  }

  setFinalResolved(finalResolved: XmlSchemaDerivationMethod) {
    this.finalResolved = finalResolved;
  }

  setFinalDerivation(finalDerivation: XmlSchemaDerivationMethod) {
    this.finalDerivation = finalDerivation;
  }

  getFinalDerivation() {
    return this.finalDerivation;
  }

  setDeriveBy(deriveBy: XmlSchemaDerivationMethod) {
    this.deriveBy = deriveBy;
  }
}
