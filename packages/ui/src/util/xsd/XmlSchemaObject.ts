import { XmlSchemaObjectBase } from './utils';

export abstract class XmlSchemaObject implements XmlSchemaObjectBase {
  lineNumber?: number;
  linePosition?: number;
  sourceURI: string | null = null;

  private metaInfoMap = new Map<object, object>();

  addMetaInfo(key: object, value: object) {
    this.metaInfoMap.set(key, value);
  }

  getLineNumber() {
    return this.lineNumber;
  }

  getLinePosition() {
    return this.linePosition;
  }

  getMetaInfoMap() {
    return this.metaInfoMap;
  }

  getSourceURI() {
    return this.sourceURI;
  }

  setLineNumber(lineNumber: number) {
    this.lineNumber = lineNumber;
  }

  setLinePosition(linePosition: number) {
    this.linePosition = linePosition;
  }

  setMetaInfoMap(metaInfoMap: Map<object, object>) {
    this.metaInfoMap = metaInfoMap;
  }

  setSourceURI(sourceURI: string | null) {
    this.sourceURI = sourceURI;
  }
}
