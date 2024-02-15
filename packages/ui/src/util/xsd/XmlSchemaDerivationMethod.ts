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
    const tokens = name.split('\\s');
    const method = new XmlSchemaDerivationMethod();
    for (const t in tokens) {
      if ('#all' === t.toLowerCase() || 'all' === t.toLowerCase()) {
        if (method.notAll()) {
          throw new Error('Derivation method cannot be #all and something else.');
        } else {
          method.setAll(true);
        }
      } else {
        if (method.isAll()) {
          throw new Error('Derivation method cannot be #all and something else.');
        }
        if ('extension' === t) {
          method.setExtension(true);
        } else if ('list' === t) {
          method.setList(true);
        } else if ('restriction' === t) {
          method.setRestriction(true);
        } else if ('substitution' === t) {
          method.setSubstitution(true);
        } else if ('union' === t) {
          method.setUnion(true);
        }
      }
    }
    return method;
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
