import type { QName } from '../QName';
import type { XmlSchema } from '../XmlSchema';
import { XmlSchemaObjectBase } from './XmlSchemaObjectBase';

export interface XmlSchemaNamed extends XmlSchemaObjectBase {
  /**
   * Retrieve the name.
   * @return the local name of this object within its schema.
   */
  getName(): string | null;

  /**
   * @return true if this object has no name.
   */
  isAnonymous(): boolean;

  /**
   * Set the name. Set to null to render the object anonymous, or to prepare to
   * change it to refer to some other object.
   * @param name the name.
   */
  setName(name: string): void;

  /**
   * Retrieve the parent schema.
   * @return the containing schema.
   */
  getParent(): XmlSchema;

  /**
   * Get the QName for this object. This is always the formal name that identifies this
   * item in the schema. If the item has a form (an element or attribute), and the form
   * is 'unqualified', this is <strong>not</strong> the appropriate QName in an instance
   * document. For those items, the getWiredName method returns the appropriate
   * QName for an instance document.
   * @see XmlSchemaNamedWithForm#getWireName()
   * @return The qualified name of this object.
   */
  getQName(): QName | null;

  /**
   * @return true if this item is a top-level item of the schema; false if this item
   * is nested inside of some other schema object.
   */
  isTopLevel(): boolean;
}
