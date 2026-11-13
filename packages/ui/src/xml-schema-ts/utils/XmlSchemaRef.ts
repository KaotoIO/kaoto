import type { XmlSchema } from '../XmlSchema';
import type { XmlSchemaNamed } from './XmlSchemaNamed';
import { XmlSchemaNamedType } from './XmlSchemaNamedType';
import { XmlSchemaRefBase } from './XmlSchemaRefBase';

export class XmlSchemaRef<T extends XmlSchemaNamed> extends XmlSchemaRefBase {
  private targetObject: XmlSchemaNamed | null = null;
  private readonly targetType: XmlSchemaNamedType;

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
        this.targetObject =
          this.parent?.getElementByQName(this.targetQName, true) ??
          parentCollection.getElementByQName(this.targetQName);
      } else if (this.targetType === XmlSchemaNamedType.XmlSchemaAttribute) {
        this.targetObject =
          this.parent?.getAttributeByQName(this.targetQName, true) ??
          parentCollection.getAttributeByQName(this.targetQName);
      } else if (this.targetType === XmlSchemaNamedType.XmlSchemaType) {
        this.targetObject =
          this.parent?.getTypeByQName(this.targetQName, true) ?? parentCollection.getTypeByQName(this.targetQName);
      } else if (this.targetType === XmlSchemaNamedType.XmlSchemaAttributeGroup) {
        this.targetObject =
          this.parent?.getAttributeGroupByQName(this.targetQName, true) ??
          parentCollection.getAttributeGroupByQName(this.targetQName);
      } else if (this.targetType === XmlSchemaNamedType.XmlSchemaGroup) {
        this.targetObject =
          this.parent?.getGroupByQName(this.targetQName, true) ?? parentCollection.getGroupByQName(this.targetQName);
      } else if (this.targetType === XmlSchemaNamedType.XmlSchemaNotation) {
        this.targetObject =
          this.parent?.getNotationByQName(this.targetQName, true) ??
          parentCollection.getNotationByQName(this.targetQName);
      }
    }
    return this.targetObject as T;
  }
}
