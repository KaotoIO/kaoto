import { XmlSchemaObject } from '../XmlSchemaObject';
import type { XmlSchemaAnnotationItem } from './XmlSchemaAnnotationItem';

export class XmlSchemaAnnotation extends XmlSchemaObject {
  private items: XmlSchemaAnnotationItem[] = [];

  public getItems() {
    return this.items;
  }
}
