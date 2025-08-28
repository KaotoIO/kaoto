import {
  DocumentDefinitionType,
  FieldItem,
  IDocument,
  IField,
  IParentType,
  MappingTree,
  NS_XSL,
  Types,
} from '../models/datamapper';
import { NS_XPATH_FUNCTIONS } from '../models/datamapper/xslt';
import {
  JsonSchemaDocument,
  JsonSchemaDocumentService,
  JsonSchemaField,
  JsonSchemaParentType,
} from './json-schema-document.service';

export const FROM_JSON_SOURCE_SUFFIX = '-x';
export const TO_JSON_TARGET_VARIABLE = 'mapped-xml';

/**
 * The collection of JSON mapping specific serialize/deserialize operations.
 */
export class MappingSerializerJsonAddon {
  /**
   * Populate a variable declaration of the mapping outcome in XSLT3 lossless JSON
   * representation (XML), which is eventually passed into `xml-to-json()` in the root template.
   * This also sets the output method to 'text'.
   * This returns the variable declaration element, which is supposed to be filled with
   * mappings.
   * @param mappings
   * @param template The root `xs:template` element
   * @return `xs:variable` element for the mappings to be filled into if the target document is JSON, null otherwise
   */
  static populateJsonTargetBase(mappings: MappingTree, template: Element): Element | null {
    if (mappings.documentDefinitionType !== DocumentDefinitionType.JSON_SCHEMA) return null;

    const xsltDocument = template.ownerDocument;
    const toJsonXmlVariable = xsltDocument.createElementNS(NS_XSL, 'variable');
    toJsonXmlVariable.setAttribute('name', TO_JSON_TARGET_VARIABLE);
    (template.parentNode as Element).insertBefore(toJsonXmlVariable, template);

    const toJson = xsltDocument.createElementNS(NS_XSL, 'value-of');
    toJson.setAttribute('select', `xml-to-json($${TO_JSON_TARGET_VARIABLE})`);
    template.appendChild(toJson);

    const stylesheet = template.parentNode as Element;
    const output = stylesheet.getElementsByTagNameNS(NS_XSL, 'output')[0];
    output.setAttribute('method', 'text');

    return toJsonXmlVariable;
  }

  /**
   * Populate a variable declaration of the JSON `xs:param` converted to the lossless XML with `json-to-xml()`
   * if the param is JSON, do nothing otherwise.
   * @param doc
   * @param stylesheet The root `xs:stylesheet` element
   * @param paramName `xs:param` name that contains JSON content
   */
  static populateJsonToXmlVariable(doc: IDocument, stylesheet: Element, paramName: string) {
    if (!(doc instanceof JsonSchemaDocument)) return;

    const jsonToXmlVariable = stylesheet.ownerDocument.createElementNS(NS_XSL, 'variable');
    jsonToXmlVariable.setAttribute('name', paramName + FROM_JSON_SOURCE_SUFFIX);
    jsonToXmlVariable.setAttribute('select', `json-to-xml($${paramName})`);
    stylesheet.appendChild(jsonToXmlVariable);
  }

  /**
   * Populate the Element in lossless XML syntax if the target document is JSON.
   * @param parent
   * @param mapping
   * @return populated lossless element if the target document is JSON, null otherwise.
   */
  static populateFieldItem(parent: Element, mapping: FieldItem): Element | null {
    if (mapping.mappingTree.documentDefinitionType !== DocumentDefinitionType.JSON_SCHEMA) return null;

    const xsltDocument = parent.ownerDocument;
    let elementName: string;
    switch (mapping.field.type) {
      case Types.Container:
        elementName = 'map';
        break;
      case Types.Array:
        elementName = 'array';
        break;
      case Types.Numeric:
      case Types.Integer:
        elementName = 'number';
        break;
      case Types.Boolean:
        elementName = 'boolean';
        break;
      default:
        elementName = 'string';
    }

    const element = xsltDocument.createElementNS(NS_XPATH_FUNCTIONS, elementName);
    const key = (mapping.field as JsonSchemaField).key;
    if (key) {
      element.setAttribute('key', key);
    }
    parent.appendChild(element);
    return element;
  }

  /**
   * Retrieves mapping root element in the XSLT if the target document is JSON, null otherwise.
   * @param xsltDoc
   * @param mappingTree
   * @return The mapping root element (xs:variable) if the target document is JSON, null otherwise
   */
  static getJsonTargetBase(xsltDoc: Document, mappingTree: MappingTree): Element | null {
    if (mappingTree.documentDefinitionType !== DocumentDefinitionType.JSON_SCHEMA) return null;

    const prefix = xsltDoc.lookupPrefix(NS_XSL);
    const nsResolver = xsltDoc.createNSResolver(xsltDoc);
    return xsltDoc
      .evaluate(
        `/${prefix}:stylesheet/${prefix}:variable[@name='${TO_JSON_TARGET_VARIABLE}']`,
        xsltDoc,
        nsResolver,
        XPathResult.ANY_TYPE,
      )
      .iterateNext() as Element;
  }

  /**
   * If the Element is a XSLT3 lossless JSON representation, search for the document field by looking at the key,
   * otherwise returns null.
   * @param item `xs:element` to test
   * @param parentField parent field
   * @return matched field if it's lossless JSON, null otherwise
   */
  static getOrCreateJsonField(item: Element, parentField: IParentType): IField | null {
    const namespace = item.namespaceURI;
    const elementName = item.localName;
    if (namespace !== NS_XPATH_FUNCTIONS || !['map', 'array', 'string', 'number', 'boolean'].includes(elementName)) {
      return null;
    }

    let type = Types.AnyType;
    switch (elementName) {
      case 'map':
        type = Types.Container;
        break;
      case 'array':
        type = Types.Array;
        break;
      case 'string':
        type = Types.String;
        break;
      case 'number':
        type = Types.Numeric;
        break;
      case 'boolean':
        type = Types.Boolean;
        break;
      default:
    }

    const fieldKey = item.getAttribute('key') ?? '';
    const existing = JsonSchemaDocumentService.getChildField(parentField, type, fieldKey, namespace);
    if (existing) return existing;
    const field = new JsonSchemaField(parentField as JsonSchemaParentType, fieldKey, type);
    field.namespaceURI = namespace;
    parentField.fields.push(field);
    return field;
  }
}
