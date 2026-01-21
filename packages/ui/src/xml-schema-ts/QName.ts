export class QName {
  private readonly namespaceURI: string = '';

  constructor(
    namespaceURI: string | null,
    private readonly localPart: string | null,
    private readonly prefix: string | null = null,
  ) {
    if (namespaceURI) {
      this.namespaceURI = namespaceURI;
    }
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

  static fromString(qNameAsString: string): QName {
    if (qNameAsString == null) {
      throw new Error('cannot create QName from null');
    } else if (qNameAsString === '') {
      return new QName('', qNameAsString, null);
    } else if (!qNameAsString.startsWith('{')) {
      return new QName('', qNameAsString, null);
    } else if (qNameAsString.startsWith('{}')) {
      return new QName('', qNameAsString.substring(2), null);
    } else {
      const endOfNamespaceURI = qNameAsString.indexOf('}');
      if (endOfNamespaceURI === -1) {
        throw new Error(`cannot create QName from ${qNameAsString}, missing closing "}"`);
      } else {
        return new QName(
          qNameAsString.substring(1, endOfNamespaceURI),
          qNameAsString.substring(endOfNamespaceURI + 1),
          null,
        );
      }
    }
  }

  valueOf(qNameAsString: string): QName {
    return QName.fromString(qNameAsString);
  }

  toString() {
    const answer = this.namespaceURI ? `{${this.namespaceURI}}` : '';
    return answer + this.localPart;
  }
}
