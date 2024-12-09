import { QName } from './QName';
import { XmlSchemaRefBase } from './utils/XmlSchemaRefBase';

export interface XmlSchemaItemWithRefBase {
  /**
   * @return true if this object has a non-null ref.
   */
  isRef(): boolean;

  /**
   * @return the Qualified Name of the target of the ref.
   */
  getTargetQName(): QName | null;

  /**
   * @return the non-generic reference object.
   */
  getRefBase(): XmlSchemaRefBase;
}
