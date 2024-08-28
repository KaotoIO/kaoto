import type { XmlSchemaAttribute } from './attribute/XmlSchemaAttribute';
import type { XmlSchemaAttributeGroup } from './attribute/XmlSchemaAttributeGroup';
import type { XmlSchemaCollection } from './XmlSchemaCollection';
import type { XmlSchemaElement } from './particle/XmlSchemaElement';
import type { XmlSchemaExternal } from './external/XmlSchemaExternal';
import type { XmlSchemaGroup } from './XmlSchemaGroup';
import type { XmlSchemaNotation } from './XmlSchemaNotation';
import type { XmlSchemaObject } from './XmlSchemaObject';
import type { XmlSchemaType } from './XmlSchemaType';
import type { NamespaceContextOwner } from './utils/NamespaceContextOwner';
import type { NamespacePrefixList } from './utils/NamespacePrefixList';

import { QName } from './QName';
import { SchemaKey } from './SchemaKey';
import { URI_2001_SCHEMA_XSD } from './constants';
import { XmlSchemaAnnotated } from './XmlSchemaAnnotated';
import { XmlSchemaDerivationMethod } from './XmlSchemaDerivationMethod';
import { XmlSchemaForm } from './XmlSchemaForm';
import { XmlSchemaImport } from './external/XmlSchemaImport';
import { XmlSchemaInclude } from './external/XmlSchemaInclude';
import { QNameMap } from './utils/ObjectMap';

export class XmlSchema extends XmlSchemaAnnotated implements NamespaceContextOwner {
  static readonly SCHEMA_NS = URI_2001_SCHEMA_XSD;
  static readonly UTF_8_ENCODING = 'UTF-8';

  private items: XmlSchemaObject[] = [];
  private parent: XmlSchemaCollection | null = null;
  private blockDefault = XmlSchemaDerivationMethod.NONE;
  private finalDefault = XmlSchemaDerivationMethod.NONE;
  private elementFormDefault = XmlSchemaForm.UNQUALIFIED;
  private attributeFormDefault = XmlSchemaForm.UNQUALIFIED;
  private externals: XmlSchemaExternal[] = [];
  private attributeGroups = new QNameMap<XmlSchemaAttributeGroup>();
  private attributes = new QNameMap<XmlSchemaAttribute>();
  private elements = new QNameMap<XmlSchemaElement>();
  private groups = new QNameMap<XmlSchemaGroup>();
  private notations = new QNameMap<XmlSchemaNotation>();
  private schemaTypes = new QNameMap<XmlSchemaType>();
  private syntacticalTargetNamespace: string | null = null;
  private schemaNamespacePrefix: string | null = null;
  private logicalTargetNamespace: string | null = null;
  private version: string | null = null;
  private namespaceContext: NamespacePrefixList | null = null;
  private inputEncoding: string | null = null;

  constructor(namespace?: string, systemId?: string, parent?: XmlSchemaCollection) {
    super();
    if (namespace == null) return;
    const systemIdToUse = systemId ? systemId : namespace;
    this.parent = parent || null;
    this.logicalTargetNamespace = namespace;
    this.syntacticalTargetNamespace = namespace;
    const schemaKey = new SchemaKey(this.logicalTargetNamespace, systemIdToUse);
    if (this.parent?.containsSchema(schemaKey)) {
      throw new Error(`Schema name '${schemaKey.toString()}' conflicts in collection`);
    }
    this.parent?.addSchema(schemaKey, this);
  }

  /**
   * Return an array of DOM documents consisting of this schema and any schemas that it references.
   * Referenced schemas are only returned if the {@link XmlSchemaExternal} objects corresponding to them
   * have their 'schema' fields filled in.
   *
   * @return DOM documents.
  getAllSchemas() {
    const xser = new XmlSchemaSerializer();
      xser.setExtReg(this.parent.getExtReg());
      return xser.serializeSchema(this, true);

    } catch (XmlSchemaSerializer.XmlSchemaSerializerException e) {
      throw new XmlSchemaException("Error serializing schema", e);
    }
  }
   */

  /**
   *
   * @param name
   * @param deep
   * @param schemaStack
   * @protected
   */
  getAttributeByQName(name: QName, deep: boolean = true, schemaStack?: XmlSchema[]): XmlSchemaAttribute | null {
    if (schemaStack != null && schemaStack.includes(this)) {
      // recursive schema - just return null
      return null;
    }
    let attribute = this.attributes.get(name) as XmlSchemaAttribute | null;
    if (deep) {
      if (attribute == null) {
        // search the imports
        for (const item of this.externals) {
          const schema = this.getSchema(item);

          if (schema != null) {
            if (schemaStack == null) {
              schemaStack = [];
            }
            schemaStack.push(this);
            attribute = schema.getAttributeByQName(name, deep, schemaStack);
            if (attribute != null) {
              return attribute;
            }
          }
        }
      } else {
        return attribute;
      }
    }
    return attribute;
  }

  /**
   * Look for an attribute by its local name.
   *
   * @param name
   * @return the attribute
   */
  getAttributeByName(name: string) {
    const nameToSearchFor = new QName(this.getTargetNamespace(), name);
    return this.getAttributeByQName(nameToSearchFor, false);
  }

  /**
   * @return the default attribute form for this schema.
   */
  getAttributeFormDefault() {
    return this.attributeFormDefault;
  }

  /**
   * Retrieve an attribute group by QName.
   *
   * @param name
   * @param deep
   * @param schemaStack
   * @return
   */
  getAttributeGroupByQName(
    name: QName,
    deep: boolean = true,
    schemaStack?: XmlSchema[],
  ): XmlSchemaAttributeGroup | null {
    if (schemaStack != null && schemaStack.includes(this)) {
      // recursive schema - just return null
      return null;
    }

    let group = this.attributeGroups.get(name) || null;
    if (deep) {
      if (group == null) {
        // search the imports
        for (const item of this.externals) {
          const schema = this.getSchema(item);

          if (schema != null) {
            // create an empty stack - push the current parent in
            // and
            // use the protected method to process the schema
            if (schemaStack == null) {
              schemaStack = [];
            }
            schemaStack.push(this);
            group = schema.getAttributeGroupByQName(name, deep, schemaStack);
            if (group != null) {
              return group;
            }
          }
        }
      } else {
        return group;
      }
    }
    return group;
  }

  /**
   * Return a map containing all the defined attribute groups of this schema. The keys are QNames, where the
   * namespace will always be the target namespace of this schema. This makes it easier to look up items for
   * cross-schema references.
   * <br>
   * If org.apache.ws.commons.schema.protectReadOnlyCollections
   * is 'true', this will return a map that checks at runtime.
   *
   * @return the map of attribute groups.
   */
  getAttributeGroups() {
    return this.attributeGroups;
  }

  /**
   * Return a map containing all the defined attributes of this schema. The keys are QNames, where the
   * namespace will always be the target namespace of this schema. This makes it easier to look up items for
   * cross-schema references.
   * <br>
   * If org.apache.ws.commons.schema.protectReadOnlyCollections
   * is 'true', this will return a map that checks at runtime.
   *
   * @return the map of attributes.
   */
  getAttributes() {
    return this.attributes;
  }

  /**
   * Return the default block value for this schema.
   *
   * @return the default block value.
   */
  getBlockDefault() {
    return this.blockDefault;
  }

  /**
   * Look for a element by its QName.
   *
   * @param name
   * @param deep
   * @param schemaStack
   * @return the element.
   */
  getElementByQName(name: QName, deep: boolean = true, schemaStack?: XmlSchema[]): XmlSchemaElement | null {
    if (schemaStack != null && schemaStack.includes(this)) {
      // recursive schema - just return null
      return null;
    }

    let element = this.elements.get(name) || null;
    if (deep) {
      if (element == null) {
        // search the imports
        for (const item of this.externals) {
          const schema = this.getSchema(item);

          if (schema != null) {
            // create an empty stack - push the current parent in
            // and
            // use the protected method to process the schema
            if (schemaStack == null) {
              schemaStack = [];
            }
            schemaStack.push(this);
            element = schema.getElementByQName(name, deep, schemaStack);
            if (element != null) {
              return element;
            }
          }
        }
      } else {
        return element;
      }
    }
    return element;
  }

  /**
   * get an element by its local name.
   *
   * @param name
   * @return the element.
   */
  getElementByName(name: string) {
    const nameToSearchFor = new QName(this.getTargetNamespace(), name);
    return this.getElementByQName(nameToSearchFor, false);
  }

  /**
   * @return the default element form for this schema.
   */
  getElementFormDefault() {
    return this.elementFormDefault;
  }

  /**
   * Return a map containing all the defined elements of this schema. The keys are QNames, where the
   * namespace will always be the target namespace of this schema. This makes it easier to look up items for
   * cross-schema references.
   * <br>
   * If org.apache.ws.commons.schema.protectReadOnlyCollections
   * is 'true', this will return a map that checks at runtime
   *
   * @return the map of elements.
   */
  getElements(): QNameMap<XmlSchemaElement> {
    return this.elements;
  }

  /**
   * Return all of the includes, imports, and redefines for this schema.
   * <br>
   * If org.apache.ws.commons.schema.protectReadOnlyCollections
   * is 'true', this will return a list that checks at runtime
   *
   * @return a list of the objects representing includes, imports, and redefines.
   */
  getExternals() {
    return this.externals;
  }

  /**
   * @return the default 'final' value for this schema.
   */
  getFinalDefault() {
    return this.finalDefault;
  }

  /**
   * Retrieve a group by QName.
   *
   * @param name
   * @param deep
   * @param schemaStack
   * @return
   */
  getGroupByQName(name: QName, deep: boolean = true, schemaStack?: XmlSchema[]): XmlSchemaGroup | null {
    if (schemaStack != null && schemaStack.includes(this)) {
      // recursive schema - just return null
      return null;
    }
    let group = this.groups.get(name) || null;
    if (deep) {
      if (group == null) {
        // search the imports
        for (const item of this.externals) {
          const schema = this.getSchema(item);

          if (schema != null) {
            // create an empty stack - push the current parent in
            // and
            // use the protected method to process the schema
            if (schemaStack == null) {
              schemaStack = [];
            }
            schemaStack.push(this);
            group = schema.getGroupByQName(name, deep, schemaStack);
            if (group != null) {
              return group;
            }
          }
        }
      } else {
        return group;
      }
    }
    return group;
  }

  /**
   * Return a map containing all the defined groups of this schema. The keys are QNames, where the namespace
   * will always be the target namespace of this schema. This makes it easier to look up items for
   * cross-schema references.<br>
   * If org.apache.ws.commons.schema.protectReadOnlyCollections
   * is 'true', this will return a map that checks at runtime
   *
   * @return the map of groups.
   */
  getGroups() {
    return this.groups;
  }

  /**
   * Return the character encoding for this schema. This will only be present if either the schema was read
   * from an XML document or there was a call to {@link #setInputEncoding(String)}.
   *
   * @return
   */
  getInputEncoding() {
    return this.inputEncoding;
  }

  /**
   * Return all of the global items in this schema.<br>
   * If org.apache.ws.commons.schema.protectReadOnlyCollections
   * is 'true', this will return a map that checks at runtime.
   * @return <strong>all</strong> of the global items from this schema.
   *
   */
  getItems() {
    return this.items;
  }

  /**
   * Return the logical target namespace. If a schema document has no target namespace, but it is referenced
   * via an xs:include or xs:redefine, its logical target namespace is the target namespace of the including
   * schema.
   *
   * @return the logical target namespace.
   */
  getLogicalTargetNamespace() {
    return this.logicalTargetNamespace;
  }

  getNamespaceContext(): NamespacePrefixList | null {
    return this.namespaceContext;
  }

  /**
   * Retrieve a notation by QName.
   *
   * @param name
   * @param deep
   * @param schemaStack
   * @return the notation
   */
  getNotationByQName(name: QName, deep: boolean = true, schemaStack?: XmlSchema[]): XmlSchemaNotation | null {
    if (schemaStack != null && schemaStack.includes(this)) {
      // recursive schema - just return null
      return null;
    }
    let notation = this.notations.get(name) || null;
    if (deep) {
      if (notation == null) {
        // search the imports
        for (const item of this.externals) {
          const schema = this.getSchema(item);

          if (schema != null) {
            // create an empty stack - push the current parent in
            // and
            // use the protected method to process the schema
            if (schemaStack == null) {
              schemaStack = [];
            }
            schemaStack.push(this);
            notation = schema.getNotationByQName(name, deep, schemaStack);
            if (notation != null) {
              return notation;
            }
          }
        }
      } else {
        return notation;
      }
    }
    return notation;
  }

  /**
   * Return a map containing all the defined notations of this schema. The keys are QNames, where the
   * namespace will always be the target namespace of this schema. This makes it easier to look up items for
   * cross-schema references.
   * <br>
   * If org.apache.ws.commons.schema.protectReadOnlyCollections
   * is 'true', this will return a map that checks at runtime.
   *
   * @return the map of notations.
   */
  getNotations() {
    return this.notations;
  }

  /**
   * Return the parent XmlSchemaCollection. If this schema was not initialized in a collection the return
   * value will be null.
   *
   * @return the parent collection.
   */
  getParent() {
    return this.parent;
  }

  /**
   * Retrieve a DOM tree for this one schema, independent of any included or related schemas.
   *
   * @return The DOM document.
   * @throws XmlSchemaSerializerException
  getSchemaDocument() {
    const xser = new XmlSchemaSerializer();
    xser.setExtReg(this.parent.getExtReg());
    return xser.serializeSchema(this, false)[0];
  }
   */

  /**
   * @return the namespace prefix for the target namespace.
   */
  getSchemaNamespacePrefix() {
    return this.schemaNamespacePrefix;
  }

  /**
   * Return a map containing all the defined types of this schema. The keys are QNames, where the namespace
   * will always be the target namespace of this schema. This makes it easier to look up items for
   * cross-schema references.
   *
   * @return the map of types.
   */
  getSchemaTypes() {
    return this.schemaTypes;
  }

  /**
   * Return the declared target namespace of this schema.
   *
   * @see #getLogicalTargetNamespace()
   * @return the namespace URI.
   */
  getTargetNamespace() {
    return this.syntacticalTargetNamespace;
  }

  /**
   * Search this schema, and its peers in its parent collection, for a schema type specified by QName.
   *
   * @param name the type name.
   * @param deep
   * @param schemaStack
   * @return the type.
   */
  getTypeByQName(name: QName, deep: boolean = true, schemaStack?: XmlSchema[]): XmlSchemaType | null {
    if (schemaStack != null && schemaStack.includes(this)) {
      // recursive schema - just return null
      return null;
    }
    let type = this.schemaTypes.get(name) || null;

    if (deep) {
      if (type == null) {
        // search the imports
        for (const item of this.externals) {
          const schema = this.getSchema(item);

          if (schema != null) {
            // create an empty stack - push the current parent
            // use the protected method to process the schema
            if (schemaStack == null) {
              schemaStack = [];
            }
            schemaStack.push(this);
            type = schema.getTypeByQName(name, deep, schemaStack);
            if (type != null) {
              return type;
            }
          }
        }
      } else {
        return type;
      }
    }
    return type;
  }

  /**
   * Retrieve a named type from this schema.
   *
   * @param name
   * @return the type.
   */
  getTypeByName(name: string) {
    const nameToSearchFor = new QName(this.getTargetNamespace(), name);
    return this.getTypeByQName(nameToSearchFor, false);
  }

  /**
   * Return the declared XML Schema version of this schema. XmlSchema supports only version 1.0.
   *
   * @return
   */
  getVersion() {
    return this.version;
  }

  /**
   * Set the declared XML Schema version of this schema
   *
   * @param version the new version.
   */
  setVersion(version: string | null) {
    this.version = version;
  }

  /**
   * Set the default attribute form for this schema.
   *
   * @param attributeFormDefault
   */
  setAttributeFormDefault(attributeFormDefault: XmlSchemaForm) {
    this.attributeFormDefault = attributeFormDefault;
  }

  /**
   * Set the default block value for this schema.
   *
   * @param blockDefault the new block value.
   */
  setBlockDefault(blockDefault: XmlSchemaDerivationMethod) {
    this.blockDefault = blockDefault;
  }

  /**
   * Set the default element form for this schema.
   *
   * @param elementFormDefault the element form. This may not be null.
   */
  setElementFormDefault(elementFormDefault: XmlSchemaForm) {
    this.elementFormDefault = elementFormDefault;
  }

  /**
   * Set the default 'final' value for this schema. The value may not be null.
   *
   * @param finalDefault the new final value.
   */
  setFinalDefault(finalDefault: XmlSchemaDerivationMethod) {
    this.finalDefault = finalDefault;
  }

  /**
   * Set the character encoding name for the schema. This is typically set when reading a schema from an XML
   * file, so that it can be written back out in the same encoding.
   *
   * @param encoding Character encoding name.
   */
  setInputEncoding(encoding: string) {
    this.inputEncoding = encoding;
  }

  /**
   * Sets the schema elements namespace context. This may be used for schema serialization, until a better
   * mechanism was found.
   */
  setNamespaceContext(namespaceContext: NamespacePrefixList): void {
    this.namespaceContext = namespaceContext;
  }

  /**
   * Set the namespace prefix corresponding to the target namespace.
   *
   * @param schemaNamespacePrefix
   */
  setSchemaNamespacePrefix(schemaNamespacePrefix: string) {
    this.schemaNamespacePrefix = schemaNamespacePrefix;
  }

  /**
   * Set the target namespace for this schema.
   *
   * @param targetNamespace the new target namespace URI. A value of "" is ignored.
   */
  setTargetNamespace(targetNamespace: string) {
    if ('' !== targetNamespace) {
      this.logicalTargetNamespace = targetNamespace;
      this.syntacticalTargetNamespace = targetNamespace;
    }
  }

  /**
   * Serialize the schema as XML to the specified stream using the encoding established with
   * {@link #setInputEncoding(String)}.
   *
   * @param out - the output stream to write to
   * @throws UnsupportedEncodingException for an invalid encoding.
  public void write(OutputStream out) throws UnsupportedEncodingException {
  if (this.inputEncoding != null && !"".equals(this.inputEncoding)) {
  write(new OutputStreamWriter(out, this.inputEncoding));
} else {
  // As per the XML spec the default is taken to be UTF 8
  write(new OutputStreamWriter(out, UTF_8_ENCODING));
}

}
   */

  /**
 * Serialize the schema as XML to the specified stream using the encoding established with
 * {@link #setInputEncoding(String)}.
 *
 * @param out - the output stream to write to
 * @param options - a map of options
 * @throws UnsupportedEncodingException
 *
 *
public void write(OutputStream out, Map<String, String> options) throws UnsupportedEncodingException {
  if (this.inputEncoding != null && !"".equals(this.inputEncoding)) {
    write(new OutputStreamWriter(out, this.inputEncoding), options);
  } else {
    write(new OutputStreamWriter(out, UTF_8_ENCODING), options);
  }
}
*/

  /**
 * Serialize the schema to a {@link java.io.Writer}.
 *
 * @param writer - the writer to write this
public void write(Writer writer) {
  serializeInternal(writer, null);
}
 */

  /**
 * Serialize the schema to a {@link java.io.Writer}.
 *
 * @param writer - the writer to write this
public void write(Writer writer, Map<String, String> options) {
  serializeInternal(writer, options);
}
 */

  getSyntacticalTargetNamespace() {
    return this.syntacticalTargetNamespace;
  }

  setLogicalTargetNamespace(logicalTargetNamespace: string | null) {
    this.logicalTargetNamespace = logicalTargetNamespace;
  }

  setParent(parent: XmlSchemaCollection) {
    this.parent = parent;
  }

  setSyntacticalTargetNamespace(syntacticalTargetNamespace: string) {
    this.syntacticalTargetNamespace = syntacticalTargetNamespace;
  }

  /**
   * Get a schema from an import
   *
   * @param includeOrImport
   * @return return the schema object.
   */
  private getSchema(includeOrImport: object): XmlSchema | null {
    let schema: XmlSchema | null = null;
    if (includeOrImport instanceof XmlSchemaImport) {
      schema = (includeOrImport as XmlSchemaImport).getSchema();
    } else if (includeOrImport instanceof XmlSchemaInclude) {
      schema = (includeOrImport as XmlSchemaInclude).getSchema();
    }
    return schema;
  }

  /**
   * Load the default options
   *
   * @param options - the map of
  private loadDefaultOptions(options: Map<string, string> ) {
    options.put(OutputKeys.OMIT_XML_DECLARATION, "yes");
    options.put(OutputKeys.INDENT, "yes");
  }
   */

  /**
 * serialize the schema - this is the method tht does to work
 *
 * @param out
 * @param options
private void serializeInternal(Writer out, Map<String, String> options) {

  try {
    XmlSchemaSerializer xser = new XmlSchemaSerializer();
    xser.setExtReg(this.parent.getExtReg());
    Document[] serializedSchemas = xser.serializeSchema(this, false);
    TransformerFactory trFac = TransformerFactory.newInstance();
    trFac.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, Boolean.TRUE);

    try {
      trFac.setAttribute("indent-number", "4");
    } catch (IllegalArgumentException e) {
      // do nothing - we'll just silently let this pass if it
      // was not compatible
    }

    Source source = new DOMSource(serializedSchemas[0]);
    Result result = new StreamResult(out);
    javax.xml.transform.Transformer tr = trFac.newTransformer();

    // use the input encoding if there is one
    if (this.inputEncoding != null && !"".equals(this.inputEncoding)) {
      tr.setOutputProperty(OutputKeys.ENCODING, this.inputEncoding);
    }

    // let these be configured from outside if any is present
    // Note that one can enforce the encoding by passing the necessary
    // property in options

    if (options == null) {
      options = new HashMap<String, String>();
      loadDefaultOptions(options);
    }
    Iterator<String> keys = options.keySet().iterator();
    while (keys.hasNext()) {
      Object key = keys.next();
      tr.setOutputProperty((String)key, options.get(key));
    }

    tr.transform(source, result);
    out.flush();
  } catch (TransformerConfigurationException e) {
    throw new XmlSchemaException(e.getMessage());
  } catch (TransformerException e) {
    throw new XmlSchemaException(e.getMessage());
  } catch (XmlSchemaSerializer.XmlSchemaSerializerException e) {
    throw new XmlSchemaException(e.getMessage());
  } catch (IOException e) {
    throw new XmlSchemaException(e.getMessage());
  }
}
 */
}
