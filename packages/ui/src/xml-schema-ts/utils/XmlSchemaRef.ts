import type { XmlSchema } from '../XmlSchema';
import type { XmlSchemaNamed } from './XmlSchemaNamed';
import { XmlSchemaRefBase } from './XmlSchemaRefBase';
import { XmlSchemaNamedType } from './XmlSchemaNamedType';

export class XmlSchemaRef<T extends XmlSchemaNamed> extends XmlSchemaRefBase {
  private targetObject: XmlSchemaNamed | null = null;
  private targetType: XmlSchemaNamedType;

  constructor(parent: XmlSchema, targetType: XmlSchemaNamedType) {
    super();
    this.parent = parent;
    this.targetType = targetType;
  }

  forgetTargetObject() {
    this.targetObject = null;
  }

  getTarget(): T | null {
    if (this.targetObject == null && this.targetQName != null) {
      const parentCollection = this.parent!.getParent();
      if (parentCollection == null) {
        return this.targetObject;
      }

      if (this.targetType === XmlSchemaNamedType.XmlSchemaElement) {
        this.targetObject = parentCollection.getElementByQName(this.targetQName);
      } else if (this.targetType == XmlSchemaNamedType.XmlSchemaAttribute) {
        this.targetObject = parentCollection.getAttributeByQName(this.targetQName);
      } else if (this.targetType == XmlSchemaNamedType.XmlSchemaType) {
        this.targetObject = parentCollection.getTypeByQName(this.targetQName);
      } else if (this.targetType == XmlSchemaNamedType.XmlSchemaAttributeGroup) {
        this.targetObject = parentCollection.getAttributeGroupByQName(this.targetQName);
      } else if (this.targetType == XmlSchemaNamedType.XmlSchemaGroup) {
        this.targetObject = parentCollection.getGroupByQName(this.targetQName);
      } else if (this.targetType == XmlSchemaNamedType.XmlSchemaNotation) {
        this.targetObject = parentCollection.getNotationByQName(this.targetQName);
      }
    }
    return this.targetObject as T;
  }
}
