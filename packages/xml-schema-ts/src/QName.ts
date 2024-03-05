export class QName {
  private namespaceURI: string;

  constructor(
    namespaceURI: string | null,
    private localPart: string | null,
    private prefix: string | null = null,
  ) {
    this.namespaceURI = namespaceURI != null ? namespaceURI : '';
  }

  getNamespaceURI(): string {
    return this.namespaceURI;
  }

  getLocalPart(): string | null {
    return this.localPart;
  }

  getPrefix(): string | null {
    return this.prefix;
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

  toString() {
    const answer = this.namespaceURI ? `{${this.namespaceURI}}` : '';
    return answer + this.localPart;
  }
}
