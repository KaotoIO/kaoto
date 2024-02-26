import { XmlSchemaObject } from '../XmlSchemaObject';

/**
 * Interface for the extension serializer. The purpose of an instance of this is to serialize the relevant
 * custom object and generate attribute/elementa desired . This custom object may be stored in the metadata
 * map of the parent schema object. When to invoke a given serializer is a decision taken by the extension
 * registry
 */
export interface ExtensionSerializer {
  /**
   * serialize the given element
   *
   * @param schemaObject - Parent schema object.contains the extension to be serialized
   * @param typeName - The class of type to be serialized
   * @param domNode - the parent DOM Node that will ultimately be serialized. The XMLSchema serialization
   *            mechanism is to create a DOM tree first and serialize it
   */
  serialize(schemaObject: XmlSchemaObject, typeName: string, domNode: Node): void;
}
