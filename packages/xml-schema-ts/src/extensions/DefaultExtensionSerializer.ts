import type { ExtensionSerializer } from './ExtensionSerializer';
import type { XmlSchemaObject } from '../XmlSchemaObject';
import { MetaDataConstants } from '../constants';

/**

 */
export class DefaultExtensionSerializer implements ExtensionSerializer {
  /**
   * serialize the given element
   *
   * @param schemaObject - Parent schema element
   * @param _typeName - the class of the object to be serialized
   * @param node - The DOM Node that is the parent of the serialzation
   */
  serialize(schemaObject: XmlSchemaObject, _typeName: string, node: Node) {
    // serialization is somewhat tricky in most cases hence this default serializer will
    // do the exact reverse of the deserializer - look for any plain 'as is' items
    // and attach them to the parent node.
    // we just attach the raw node either to the meta map of
    // elements or the attributes
    const metaInfoMap = schemaObject.getMetaInfoMap();
    const parentDoc = node.ownerDocument;
    if (metaInfoMap.has(MetaDataConstants.EXTERNAL_ATTRIBUTES)) {
      const attribMap = metaInfoMap.get(MetaDataConstants.EXTERNAL_ATTRIBUTES) as Map<string, Node>;
      for (const value of attribMap.values()) {
        if (node.nodeType == Node.ELEMENT_NODE) {
          (node as Element).setAttributeNodeNS(parentDoc!.importNode(value, true) as Attr);
        }
      }
    }

    if (metaInfoMap.has(MetaDataConstants.EXTERNAL_ELEMENTS)) {
      const elementMap = metaInfoMap.get(MetaDataConstants.EXTERNAL_ELEMENTS) as Map<string, Node>;
      for (const value of elementMap.values()) {
        node.appendChild(parentDoc!.importNode(value, true));
      }
    }
  }
}
