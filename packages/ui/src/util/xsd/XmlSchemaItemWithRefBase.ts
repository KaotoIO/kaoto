import { QName } from '.';
import { XmlSchemaRefBase } from './utils';

export interface XmlSchemaItemWithRefBase {
  /**
   * @return true if this object has a non-null ref.
   */
  isRef(): boolean;

  /**
   * @return the Qualified Name of the target of the ref.
   */
  getTargetQName(): QName;

  /**
   * @return the non-generic reference object.
   */
  getRefBase(): XmlSchemaRefBase;
}
