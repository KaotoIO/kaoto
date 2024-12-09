import { QName } from '../QName';
import { XmlSchemaObject } from '../XmlSchemaObject';

/**
 * Interface for the extension deserializer. The purpose of an instance of this is to deserialize the relevant
 * attribute/element and perhaps generate a desired custom object. This custom object can be stored in the
 * metadata map of the parent schema object. When to invoke a given deserializer is a decision taken by the
 * extension registry
 */
export interface ExtensionDeserializer {
  /**
   * deserialize the given element
   *
   * @param schemaObject - Parent schema element
   * @param name - the QName of the element/attribute to be deserialized. in the case where a deserializer
   *            is used to handle multiple elements/attributes this may be useful to determine the correct
   *            deserialization
   * @param domNode - the raw DOM Node read from the source. This will be the extension element itself if
   *            for an element or the extension attribute object if it is an attribute
   */
  deserialize(schemaObject: XmlSchemaObject, name: QName, domNode: Node): void;
}
