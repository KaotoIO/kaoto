import type { ExtensionDeserializer } from './ExtensionDeserializer';
import type { QName } from '../QName';
import type { XmlSchemaObject } from '../XmlSchemaObject';
import { MetaDataConstants } from '../constants';

/**
 * Default deserializer. The action taken when there is nothing specific to be done would be to attach the raw
 * element object as it is to the meta information map for an element or the raw attribute object
 */
export class DefaultExtensionDeserializer implements ExtensionDeserializer {
  /**
   * deserialize the given element
   *
   * @param schemaObject - Parent schema element
   * @param name - the QName of the element/attribute to be deserialized. in the case where a deserializer
   *            is used to handle multiple elements/attributes this may be useful to determine the correct
   *            deserialization
   * @param node - the raw DOM Node read from the source. This will be the extension element itself if for
   *            an element or the extension attribute object if it is an attribute
   */
  deserialize(schemaObject: XmlSchemaObject, name: QName, node: Node) {
    // we just attach the raw node either to the meta map of
    // elements or the attributes

    let metaInfoMap = schemaObject.getMetaInfoMap();
    if (metaInfoMap == null) {
      metaInfoMap = new Map<string, object>();
    }

    if (node.nodeType == Node.ATTRIBUTE_NODE) {
      let attribMap: Map<QName, Node>;
      if (metaInfoMap.has(MetaDataConstants.EXTERNAL_ATTRIBUTES)) {
        attribMap = metaInfoMap.get(MetaDataConstants.EXTERNAL_ATTRIBUTES) as Map<QName, Node>;
      } else {
        attribMap = new Map<QName, Node>();
        metaInfoMap.set(MetaDataConstants.EXTERNAL_ATTRIBUTES, attribMap);
      }
      attribMap.set(name, node);
    } else if (node.nodeType == Node.ELEMENT_NODE) {
      let elementMap;
      if (metaInfoMap.has(MetaDataConstants.EXTERNAL_ELEMENTS)) {
        elementMap = metaInfoMap.get(MetaDataConstants.EXTERNAL_ELEMENTS) as Map<QName, Node>;
      } else {
        elementMap = new Map<QName, Node>();
        metaInfoMap.set(MetaDataConstants.EXTERNAL_ELEMENTS, elementMap);
      }
      elementMap.set(name, node);
    }

    // subsequent processing takes place only if this map is not empty
    if (metaInfoMap.size !== 0) {
      const metaInfoMapFromSchemaElement = schemaObject.getMetaInfoMap();
      if (metaInfoMapFromSchemaElement == null) {
        schemaObject.setMetaInfoMap(metaInfoMap);
      } else {
        metaInfoMap.forEach((value, key) => metaInfoMapFromSchemaElement.set(key, value));
      }
    }
  }
}
