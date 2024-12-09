import type { XmlSchemaAnnotationItem } from './XmlSchemaAnnotationItem';
import { XmlSchemaObject } from '../XmlSchemaObject';

export class XmlSchemaAnnotation extends XmlSchemaObject {
  private items: XmlSchemaAnnotationItem[] = [];

  public getItems() {
    return this.items;
  }
}
