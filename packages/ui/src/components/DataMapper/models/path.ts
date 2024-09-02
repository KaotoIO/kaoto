export enum DocumentType {
  SOURCE_BODY = 'sourceBody',
  TARGET_BODY = 'targetBody',
  PARAM = 'param',
}

export class NodePath {
  documentType: DocumentType = DocumentType.SOURCE_BODY;
  documentId: string = '';
  pathSegments: string[] = [];

  constructor(expression?: string) {
    if (!expression) return;
    const parts = expression.split('://');
    if (parts.length < 2) return;
    const index = parts[0].indexOf(':');
    this.documentType = (index !== -1 ? parts[0].substring(0, index) : parts[0]) as DocumentType;
    this.documentId = index !== -1 ? parts[0].substring(index + 1) : this.documentId;
    this.pathSegments = parts[1].length > 0 ? parts[1].split('/') : [];
  }

  toString() {
    const beforePath = `${this.documentType}:${this.documentId}://`;
    return this.pathSegments.length > 0 ? `${beforePath}${this.pathSegments.join('/')}` : beforePath;
  }

  static fromDocument(documentType: DocumentType, documentId: string) {
    return new NodePath(`${documentType}:${documentId}://`);
  }

  static childOf(parent: NodePath, childSegment: string) {
    const answer = new NodePath();
    answer.documentType = parent.documentType;
    answer.documentId = parent.documentId;
    answer.pathSegments = [...parent.pathSegments, childSegment];
    return answer;
  }
}

export class Path {
  constructor(
    public readonly expression: string,
    public readonly parent?: Path,
  ) {
    this.isRelative = true;
    let remainingExpression = this.expression;
    if (remainingExpression.startsWith('/')) {
      this.isRelative = false;
      remainingExpression = remainingExpression.substring(1);
    }
    if (remainingExpression.endsWith('/'))
      remainingExpression = remainingExpression.substring(0, remainingExpression.length - 1);
    if (remainingExpression.startsWith('$')) {
      this.isRelative = false;
      const pos = remainingExpression.indexOf('/');
      this.parameterName = pos !== -1 ? remainingExpression.substring(1, pos) : remainingExpression.substring(1);
      remainingExpression = pos !== -1 ? remainingExpression.substring(pos + 1) : '';
    }
    this.pathSegments = remainingExpression.split('/').map((segmentString) => new PathSegment(segmentString));
  }

  toString() {
    const prefix = this.parameterName ? `$${this.parameterName}/` : this.isRelative ? '' : '/';
    return this.pathSegments.length > 0 ? `${prefix}${this.pathSegments.join('/')}` : prefix;
  }

  toAbsolutePathString(): string {
    return this.isRelative ? this.parent?.toAbsolutePathString() + '/' + this.toString() : this.toString();
  }

  child(segment: string) {
    if (segment.startsWith('/')) segment = segment.substring(1);
    if (segment.endsWith('/')) segment = segment.substring(0, segment.length - 1);
    return new NodePath(this.toString() + '/' + segment);
  }

  isRelative: boolean;
  parameterName?: string;
  pathSegments: PathSegment[];
}

export class PathSegment {
  constructor(public readonly expression: string) {
    const splitted = expression.split(':');
    if (splitted.length > 1) {
      this.prefix = splitted[0];
      this.name = splitted[1];
    } else {
      this.name = splitted[0];
    }
  }

  toString() {
    return this.prefix ? `${this.prefix}:${this.name}` : this.name;
  }

  prefix?: string;
  name: string;
}
