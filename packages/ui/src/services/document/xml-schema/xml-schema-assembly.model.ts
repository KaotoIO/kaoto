import { NS_XML_SCHEMA } from '../../../models/datamapper/standard-namespaces';
import {
  XmlSchema,
  XmlSchemaAttribute,
  XmlSchemaAttributeGroup,
  XmlSchemaCollection,
  XmlSchemaElement,
  XmlSchemaGroup,
  XmlSchemaType,
} from '../../../xml-schema-ts';
import { QName } from '../../../xml-schema-ts/QName';

/**
 * The schemas of an XML Schema document as seen from its entry schema file: the entry schema and the files it reaches
 * first, then the whole collection.
 *
 * The entry is chosen after parsing and changes with the root element, so every component lookup by QName for a
 * chosen entry goes through the assembly instead of the collection. A different entry means a different assembly.
 * It holds no state besides its collection and entry, and reads the collection at every lookup, so schemas added to
 * the collection later are found without building a new assembly. Without an entry, every lookup goes to the
 * collection.
 *
 * @see XmlSchemaDocument.assembly
 */
export class XmlSchemaAssembly {
  constructor(
    readonly collection: XmlSchemaCollection,
    readonly entrySchemaFile?: string,
  ) {}

  /**
   * Looks up a user-defined schema type by QName, entry first, then in the whole collection.
   *
   * @param typeQName - The qualified name of the type to find
   * @returns The schema type, or null for a built-in XSD type or a type not declared anywhere
   */
  lookupType(typeQName: QName | null): XmlSchemaType | null {
    return this.findType(typeQName);
  }

  /**
   * Same as {@link lookupType}, but also resolves built-in XSD types through the collection.
   *
   * @param typeQName - The qualified name of the type to find
   * @returns The schema type, or null if it is not declared anywhere
   */
  lookupTypeOrBuiltIn(typeQName: QName): XmlSchemaType | null {
    return this.findType(typeQName) ?? this.collection.getTypeByQName(typeQName) ?? null;
  }

  /**
   * Looks up a global schema element by QName, entry first, then in the whole collection.
   *
   * @param elementQName - The qualified name of the element to find
   * @returns The schema element, or null if it is not declared anywhere
   */
  lookupElement(elementQName: QName | null): XmlSchemaElement | null {
    if (!elementQName) return null;
    return (
      this.findInEntry((schema) => schema.getElementByQName(elementQName, true)) ??
      this.collection.getElementByQName(elementQName) ??
      null
    );
  }

  /**
   * Looks up a global model group by QName, entry first, then in the whole collection.
   *
   * @param groupQName - The qualified name of the group to find
   * @returns The schema group, or null if it is not declared anywhere
   */
  lookupGroup(groupQName: QName | null): XmlSchemaGroup | null {
    if (!groupQName) return null;
    return (
      this.findInEntry((schema) => schema.getGroupByQName(groupQName, true)) ??
      this.collection.getGroupByQName(groupQName) ??
      null
    );
  }

  /**
   * Looks up a global attribute by QName, entry first, then in the whole collection.
   *
   * @param attributeQName - The qualified name of the attribute to find
   * @returns The schema attribute, or null if it is not declared anywhere
   */
  lookupAttribute(attributeQName: QName | null): XmlSchemaAttribute | null {
    if (!attributeQName) return null;
    return (
      this.findInEntry((schema) => schema.getAttributeByQName(attributeQName, true)) ??
      this.collection.getAttributeByQName(attributeQName) ??
      null
    );
  }

  /**
   * Looks up a global attribute group by QName, entry first, then in the whole collection.
   *
   * @param groupQName - The qualified name of the attribute group to find
   * @returns The attribute group, or null if it is not declared anywhere
   */
  lookupAttributeGroup(groupQName: QName | null): XmlSchemaAttributeGroup | null {
    if (!groupQName) return null;
    return (
      this.findInEntry((schema) => schema.getAttributeGroupByQName(groupQName, true)) ??
      this.collection.getAttributeGroupByQName(groupQName) ??
      null
    );
  }

  /**
   * Resolves the type of an element. `element.getSchemaType()` is bound at parse time to the first type with that
   * QName in the collection, so a named type is looked up again through the assembly, falling back to the bound type.
   *
   * @param element - The element whose type is resolved
   * @returns The type of the element, or null when it has none
   */
  resolveElementSchemaType(element: XmlSchemaElement): XmlSchemaType | null {
    const typeName = element.getSchemaTypeName();
    const scopedType = typeName ? this.findType(typeName) : null;
    return scopedType ?? element.getSchemaType();
  }

  private findType(typeQName: QName | null): XmlSchemaType | null {
    if (!typeQName || typeQName.getNamespaceURI() === NS_XML_SCHEMA) return null;
    return (
      this.findInEntry((schema) => schema.getTypeByQName(typeQName, true)) ??
      this.collection.getTypeByQName(typeQName) ??
      null
    );
  }

  private findInEntry<T>(find: (entrySchema: XmlSchema) => T | null | undefined): T | null {
    if (!this.entrySchemaFile) return null;
    for (const entrySchema of this.collection.getXmlSchema(this.entrySchemaFile)) {
      const found = find(entrySchema);
      if (found) return found;
    }
    return null;
  }
}
