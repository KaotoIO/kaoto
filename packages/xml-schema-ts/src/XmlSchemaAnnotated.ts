import type { XmlSchemaAnnotation } from './annotation/XmlSchemaAnnotation';
import { XmlSchemaObject } from './XmlSchemaObject';

export class XmlSchemaAnnotated extends XmlSchemaObject {
  private annotation?: XmlSchemaAnnotation;
  private id?: string | null;
  private unhandledAttributes?: Attr[];

  getId() {
    return this.id;
  }
  setId(id: string | null) {
    this.id = id;
  }
  getAnnotation() {
    return this.annotation;
  }
  setAnnotation(annotation: XmlSchemaAnnotation) {
    this.annotation = annotation;
  }
  getUnhandledAttributes() {
    return this.unhandledAttributes;
  }
  setUnhandledAttributes(unhandledAttributes: Attr[]) {
    this.unhandledAttributes = unhandledAttributes;
  }
  toString() {
    return this.id == null ? super.toString() : super.toString() + `[id:${this.id}]`;
  }
}
