export class QName {
  private namespaceURI: string;

  constructor(
    namespaceURI: string | null,
    private localPart: string,
    private prefix?: string,
  ) {
    this.namespaceURI = namespaceURI != null ? namespaceURI : '';
  }

  getNamespaceURI(): string {
    return this.namespaceURI;
  }

  getLocalPart(): string {
    return this.localPart;
  }

  getPrefix(): string | undefined {
    return this.prefix;
  }

  toString(): string {
    return this.namespaceURI === '' ? this.localPart : `{${this.namespaceURI}}${this.localPart}`;
  }

  valueOf(qNameAsString: string): QName {
    if (qNameAsString == null) {
      throw new Error('cannot create QName from null');
    } else if (qNameAsString === '') {
      return new QName('', qNameAsString, '');
    } else if (qNameAsString.charAt(0) !== '{') {
      return new QName('', qNameAsString, '');
    } else if (qNameAsString.startsWith('{}')) {
      return new QName('', qNameAsString.substring(2), '');
    } else {
      const endOfNamespaceURI = qNameAsString.indexOf('}');
      if (endOfNamespaceURI === -1) {
        throw new Error(`cannot create QName from ${qNameAsString}, missing closing "}"`);
      } else {
        return new QName(
          qNameAsString.substring(1, endOfNamespaceURI),
          qNameAsString.substring(endOfNamespaceURI + 1),
          '' /* prefix */,
        );
      }
    }
  }
}
