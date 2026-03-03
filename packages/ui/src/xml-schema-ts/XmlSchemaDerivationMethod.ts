export class XmlSchemaDerivationMethod {
  static readonly NONE = new XmlSchemaDerivationMethod();
  private all = false;
  private empty = false;
  private extension = false;
  private list = false;
  private restriction = false;
  private substitution = false;
  private union = false;

  static schemaValueOf(name: string): XmlSchemaDerivationMethod {
    const tokens = name.trim().split(/\s+/);
    const method = new XmlSchemaDerivationMethod();
    for (const t of tokens) {
      XmlSchemaDerivationMethod.applyToken(method, t);
    }
    return method;
  }

  private static applyToken(method: XmlSchemaDerivationMethod, token: string): void {
    const lowerToken = token.toLowerCase();
    if ('#all' === lowerToken || 'all' === lowerToken) {
      if (method.notAll()) {
        throw new Error('Derivation method cannot be #all and something else.');
      }
      method.setAll(true);
    } else {
      if (method.isAll()) {
        throw new Error('Derivation method cannot be #all and something else.');
      }
      if ('extension' === lowerToken) {
        method.setExtension(true);
      } else if ('list' === lowerToken) {
        method.setList(true);
      } else if ('restriction' === lowerToken) {
        method.setRestriction(true);
      } else if ('substitution' === lowerToken) {
        method.setSubstitution(true);
      } else if ('union' === lowerToken) {
        method.setUnion(true);
      }
    }
  }

  notAll(): boolean {
    return this.empty || this.extension || this.list || this.restriction || this.substitution || this.union;
  }

  isAll(): boolean {
    return this.all;
  }

  setAll(all: boolean) {
    this.all = all;
    if (all) {
      this.empty = false;
      this.extension = false;
      this.list = false;
      this.restriction = false;
      this.substitution = false;
      this.union = false;
    }
  }

  isEmpty() {
    return this.empty;
  }

  setEmpty(empty: boolean) {
    this.empty = empty;
  }

  isExtension() {
    return this.extension;
  }

  setExtension(extension: boolean) {
    this.extension = extension;
  }

  isList() {
    return this.list;
  }

  setList(list: boolean) {
    this.list = list;
  }

  isNone() {
    return !(
      this.all ||
      this.empty ||
      this.extension ||
      this.list ||
      this.restriction ||
      this.substitution ||
      this.union
    );
  }

  setNone(_none: boolean) {
    this.all = false;
    this.empty = false;
    this.extension = false;
    this.list = false;
    this.restriction = false;
    this.substitution = false;
    this.union = false;
  }

  isRestriction() {
    return this.restriction;
  }

  setRestriction(restriction: boolean) {
    this.restriction = restriction;
  }

  isSubstitution() {
    return this.substitution;
  }

  setSubstitution(substitution: boolean) {
    this.substitution = substitution;
  }

  isUnion() {
    return this.union;
  }

  setUnion(union: boolean) {
    this.union = union;
  }
}
