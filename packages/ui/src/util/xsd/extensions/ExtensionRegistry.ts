import { QName } from '../QName';
import { XmlSchemaObject } from '../XmlSchemaObject';
import { DefaultExtensionDeserializer } from './DefaultExtensionDeserializer';
import { DefaultExtensionSerializer } from './DefaultExtensionSerializer';
import { ExtensionDeserializer } from './ExtensionDeserializer';
import { ExtensionSerializer } from './ExtensionSerializer';

export class ExtensionRegistry {
  /**
   * Maps for the storage of extension serializers /deserializers
   */
  private extensionSerializers = new Map<string, ExtensionSerializer>();
  private extensionDeserializers = new Map<QName, ExtensionDeserializer>();

  /**
   * Default serializer and serializer
   */
  private defaultExtensionSerializer = new DefaultExtensionSerializer();
  private defaultExtensionDeserializer = new DefaultExtensionDeserializer();

  getDefaultExtensionSerializer() {
    return this.defaultExtensionSerializer;
  }

  setDefaultExtensionSerializer(defaultExtensionSerializer: ExtensionSerializer) {
    this.defaultExtensionSerializer = defaultExtensionSerializer;
  }

  getDefaultExtensionDeserializer() {
    return this.defaultExtensionDeserializer;
  }

  setDefaultExtensionDeserializer(defaultExtensionDeserializer: ExtensionDeserializer) {
    this.defaultExtensionDeserializer = defaultExtensionDeserializer;
  }

  /**
   * Register a deserializer with a QName
   *
   * @param name
   * @param deserializer
   */
  registerDeserializer(name: QName, deserializer: ExtensionDeserializer) {
    this.extensionDeserializers.set(name, deserializer);
  }

  /**
   * Register a serializer with a Class
   *
   * @param classOfType - the class of the object that would be serialized
   * @param serializer - an instance of the deserializer
   */
  registerSerializer(typeName: string, serializer: ExtensionSerializer) {
    this.extensionSerializers.set(typeName, serializer);
  }

  /**
   * remove the registration for a serializer with a Class
   *
   * @param classOfType - the Class of the element/attribute the serializer is associated with
   */
  unregisterSerializer(typeName: string) {
    this.extensionSerializers.delete(typeName);
  }

  /**
   * remove the registration for a deserializer with a QName
   *
   * @param name - the QName fo the element that the deserializer is associated with
   */
  unregisterDeserializer(name: QName) {
    this.extensionDeserializers.delete(name);
  }

  /**
   * Serialize a given extension element
   *
   * @param parentSchemaObject - the parent schema object. This is what would contain the extension object,
   *            probably in side its meta information map
   * @param typeName - The class of type to be serialized
   * @param node - the parent DOM Node that will ultimately be serialized. The XMLSchema serialization
   *            mechanism is to create a DOM tree first and serialize it
   */
  serializeExtension(parentSchemaObject: XmlSchemaObject, typeName: string, node: Node) {
    const serializerObject = this.extensionSerializers.get(typeName);
    if (serializerObject != null) {
      serializerObject.serialize(parentSchemaObject, typeName, node);
    } else if (this.defaultExtensionSerializer != null) {
      this.defaultExtensionSerializer.serialize(parentSchemaObject, typeName, node);
    }
  }

  /**
   * Deserialize a given extension element
   *
   * @param parentSchemaObject - the parent schema object. This is anticipated to be created already and the
   *            relevant object would contain the extension object, probably in side its meta information
   *            map
   * @param name - The qname of the element/attribute to be deserialized. This will be used to search for
   *            the extension as well as by the deserializer if a single deserializer is registered against
   *            a number of qnames
   * @param rawNode - the raw DOM Node read from the source. This will be the extension element itself if
   *            for an element or extension attribute itself in case of an attribute
   */
  deserializeExtension(parentSchemaObject: XmlSchemaObject, name: QName, rawNode: Node) {
    const deserializerObject = this.extensionDeserializers.get(name);
    if (deserializerObject != null) {
      deserializerObject.deserialize(parentSchemaObject, name, rawNode);
    } else if (this.defaultExtensionDeserializer != null) {
      this.defaultExtensionDeserializer.deserialize(parentSchemaObject, name, rawNode);
    }
  }
}
