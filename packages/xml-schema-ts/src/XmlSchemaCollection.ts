import type { QName } from './QName';
import type { SchemaKey } from './SchemaKey';
import type { TypeReceiver } from './TypeReceiver';
import type { XmlSchemaFacet } from './facet/XmlSchemaFacet';
import type { XmlSchemaType } from './XmlSchemaType';
import type { CollectionURIResolver } from './resolver/CollectionURIResolver';
import type { URIResolver } from './resolver/URIResolver';
import type { NamespacePrefixList } from './utils/NamespacePrefixList';

import { XmlSchema } from './XmlSchema';
import { XmlSchemaMaxInclusiveFacet } from './facet/XmlSchemaMaxInclusiveFacet';
import { XmlSchemaMinInclusiveFacet } from './facet/XmlSchemaMinInclusiveFacet';
import { XmlSchemaPatternFacet } from './facet/XmlSchemaPatternFacet';
import { XmlSchemaWhiteSpaceFacet } from './facet/XmlSchemaWhiteSpaceFacet';
import { XmlSchemaSimpleTypeRestriction } from './simple/XmlSchemaSimpleTypeRestriction';
import { XmlSchemaSimpleTypeList } from './simple/XmlSchemaSimpleTypeList';
import { SchemaBuilder } from './SchemaBuilder';
import { XmlSchemaSimpleType } from './simple/XmlSchemaSimpleType';
import { ExtensionRegistry } from './extensions/ExtensionRegistry';
import * as Constants from './constants';
import { DefaultURIResolver } from './resolver/DefaultURIResolver';
import { XmlSchemaFractionDigitsFacet } from './facet/XmlSchemaFractionDigitsFacet';
import { QNameMap, SchemaKeyMap } from './utils/ObjectMap';

export class XmlSchemaCollection {
  baseUri: string | null;
  private stack: SchemaKey[];
  private unresolvedTypes: QNameMap<TypeReceiver[]>;
  private xsd: XmlSchema;
  private extReg: ExtensionRegistry;

  private knownNamespaceMap: Record<string, XmlSchema>;
  private namespaceContext: NamespacePrefixList | null;
  private schemaResolver: URIResolver;
  private schemas: SchemaKeyMap<XmlSchema>;
  constructor() {
    this.baseUri = null;
    this.stack = [];
    this.unresolvedTypes = new QNameMap();
    this.extReg = new ExtensionRegistry();
    this.knownNamespaceMap = {};
    this.namespaceContext = null;
    this.schemaResolver = new DefaultURIResolver();
    this.schemas = new SchemaKeyMap();
    this.xsd = new XmlSchema(XmlSchema.SCHEMA_NS, undefined, this);
    this.init();
  }

  /**
   * Return an indication of whether a particular schema is not in the working stack of schemas. This function,
   * while public, is probably not useful outside of the implementation.
   *
   * @param pKey schema key
   * @return false if the schema is in the stack.
   */
  check(pKey: SchemaKey) {
    return !this.stack.includes(pKey);
  }

  getExtReg() {
    return this.extReg;
  }

  /**
   * get the namespace map
   *
   * @return a map of previously known XMLSchema objects keyed by their namespace (String)
   */
  getKnownNamespaceMap() {
    return this.knownNamespaceMap;
  }

  /**
   * Retrieve the namespace context.
   *
   * @return the namespace context.
   */
  getNamespaceContext() {
    return this.namespaceContext;
  }

  /**
   * Retrieve the custom URI resolver, if any.
   *
   * @return the current resolver.
   */
  getSchemaResolver() {
    return this.schemaResolver;
  }

  /**
   * Retrieve a global type from the schema collection.
   *
   * @param schemaTypeName the QName of the type.
   * @return the type object, or null.
   */
  getTypeByQName(schemaTypeName: QName) {
    const uri = schemaTypeName.getNamespaceURI();
    for (const entry of this.schemas.entries()) {
      if (entry[0].getNamespace() === uri) {
        const type = entry[1].getTypeByQName(schemaTypeName);
        if (type != null) {
          return type;
        }
      }
    }
    return null;
  }

  /**
   * Retrieve a set containing the XmlSchema instances with the given system ID. In general, this will
   * return a single instance, or none. However, if the schema has no targetNamespace attribute and was
   * included from schemata with different target namespaces, then it may occur, that multiple schema
   * instances with different logical target namespaces may be returned.
   *
   * @param systemId the system id for this schema
   * @return array of XmlSchema objects
   */
  getXmlSchema(systemId: string | null) {
    if (systemId == null) {
      systemId = '';
    }
    const result: XmlSchema[] = [];
    for (const entry of this.schemas.entries()) {
      if (entry[0].getSystemId() === systemId) {
        result.push(entry[1]);
      }
    }
    return result;
  }

  getXmlSchemas() {
    return Array.from(this.schemas.values());
  }

  init(): void {
    /*
     * Defined in section 4.
     */
    this.addSimpleType(this.xsd, Constants.XSD_ANYSIMPLETYPE.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_ANYTYPE.getLocalPart()!);

    /*
     * Primitive types 3.2.1 string 3.2.2 boolean 3.2.3 decimal 3.2.4 float 3.2.5 double 3.2.6 duration
     * 3.2.7 dateTime 3.2.8 time 3.2.9 date 3.2.10 gYearMonth 3.2.11 gYear 3.2.12 gMonthDay 3.2.13 gDay
     * 3.2.14 gMonth 3.2.15 hexBinary 3.2.16 base64Binary 3.2.17 anyURI 3.2.18 QName 3.2.19 NOTATION
     */
    this.addSimpleType(this.xsd, Constants.XSD_STRING.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_BOOLEAN.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_FLOAT.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_DOUBLE.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_QNAME.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_DECIMAL.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_DURATION.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_DATE.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_TIME.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_DATETIME.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_DAY.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_MONTH.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_MONTHDAY.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_YEAR.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_YEARMONTH.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_NOTATION.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_HEXBIN.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_BASE64.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_ANYURI.getLocalPart()!);

    /*
     * 3.3.1 normalizedString 3.3.2 token 3.3.3 language 3.3.4 NMTOKEN 3.3.5 NMTOKENS 3.3.6 Name 3.3.7
     * NCName 3.3.8 ID 3.3.9 IDREF 3.3.10 IDREFS 3.3.11 ENTITY 3.3.12 ENTITIES 3.3.13 integer 3.3.14
     * nonPositiveInteger 3.3.15 negativeInteger 3.3.16 long 3.3.17 int 3.3.18 short 3.3.19 byte 3.3.20
     * nonNegativeInteger 3.3.21 unsignedLong 3.3.22 unsignedInt 3.3.23 unsignedShort 3.3.24 unsignedByte
     * 3.3.25 positiveInteger
     */

    // derived types from decimal
    this.addSimpleType(this.xsd, Constants.XSD_LONG.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_SHORT.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_BYTE.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_INTEGER.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_INT.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_POSITIVEINTEGER.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_NEGATIVEINTEGER.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_NONPOSITIVEINTEGER.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_NONNEGATIVEINTEGER.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_UNSIGNEDBYTE.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_UNSIGNEDINT.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_UNSIGNEDLONG.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_UNSIGNEDSHORT.getLocalPart()!);

    // derived types from string
    this.addSimpleType(this.xsd, Constants.XSD_NAME.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_NORMALIZEDSTRING.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_NCNAME.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_NMTOKEN.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_NMTOKENS.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_ENTITY.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_ENTITIES.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_ID.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_IDREF.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_IDREFS.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_LANGUAGE.getLocalPart()!);
    this.addSimpleType(this.xsd, Constants.XSD_TOKEN.getLocalPart()!);

    // 2.5.3 setup built-in datatype hierarchy
    this.setupBuiltinDatatypeHierarchy(this.xsd);

    /*
     * Removed loading ExtensionRegistry from system property.
     * It should be enough to register it from application side when necessary.
     */
  }

  private setupBuiltinDatatypeHierarchy(xsd: XmlSchema) {
    this.setDerivationByRestriction(xsd, Constants.XSD_ANYSIMPLETYPE, Constants.XSD_ANYTYPE);
    this.setDerivationByRestriction(xsd, Constants.XSD_DURATION, Constants.XSD_ANYSIMPLETYPE, [
      new XmlSchemaWhiteSpaceFacet('collapse', true),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_DATETIME, Constants.XSD_ANYSIMPLETYPE, [
      new XmlSchemaWhiteSpaceFacet('collapse', true),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_TIME, Constants.XSD_ANYSIMPLETYPE, [
      new XmlSchemaWhiteSpaceFacet('collapse', true),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_DATE, Constants.XSD_ANYSIMPLETYPE, [
      new XmlSchemaWhiteSpaceFacet('collapse', true),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_YEARMONTH, Constants.XSD_ANYSIMPLETYPE, [
      new XmlSchemaWhiteSpaceFacet('collapse', true),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_YEAR, Constants.XSD_ANYSIMPLETYPE, [
      new XmlSchemaWhiteSpaceFacet('collapse', true),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_MONTHDAY, Constants.XSD_ANYSIMPLETYPE, [
      new XmlSchemaWhiteSpaceFacet('collapse', true),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_DAY, Constants.XSD_ANYSIMPLETYPE, [
      new XmlSchemaWhiteSpaceFacet('collapse', true),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_MONTH, Constants.XSD_ANYSIMPLETYPE, [
      new XmlSchemaWhiteSpaceFacet('collapse', true),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_BOOLEAN, Constants.XSD_ANYSIMPLETYPE, [
      new XmlSchemaWhiteSpaceFacet('collapse', true),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_BASE64, Constants.XSD_ANYSIMPLETYPE, [
      new XmlSchemaWhiteSpaceFacet('collapse', true),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_HEXBIN, Constants.XSD_ANYSIMPLETYPE, [
      new XmlSchemaWhiteSpaceFacet('collapse', true),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_FLOAT, Constants.XSD_ANYSIMPLETYPE, [
      new XmlSchemaWhiteSpaceFacet('collapse', true),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_DOUBLE, Constants.XSD_ANYSIMPLETYPE, [
      new XmlSchemaWhiteSpaceFacet('collapse', true),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_ANYURI, Constants.XSD_ANYSIMPLETYPE, [
      new XmlSchemaWhiteSpaceFacet('collapse', true),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_QNAME, Constants.XSD_ANYSIMPLETYPE, [
      new XmlSchemaWhiteSpaceFacet('collapse', true),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_NOTATION, Constants.XSD_ANYSIMPLETYPE, [
      new XmlSchemaWhiteSpaceFacet('collapse', true),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_DECIMAL, Constants.XSD_ANYSIMPLETYPE, [
      new XmlSchemaWhiteSpaceFacet('collapse', true),
    ]);

    this.setDerivationByRestriction(xsd, Constants.XSD_INTEGER, Constants.XSD_DECIMAL, [
      new XmlSchemaFractionDigitsFacet(0, true),
      new XmlSchemaPatternFacet('[\\-+]?[0-9]+', false),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_NONPOSITIVEINTEGER, Constants.XSD_INTEGER, [
      new XmlSchemaMaxInclusiveFacet(0, false),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_NEGATIVEINTEGER, Constants.XSD_NONPOSITIVEINTEGER, [
      new XmlSchemaMaxInclusiveFacet(-1, false),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_LONG, Constants.XSD_INTEGER, [
      new XmlSchemaMinInclusiveFacet(BigInt('-9223372036854775808'), false),
      new XmlSchemaMaxInclusiveFacet(BigInt('9223372036854775807'), false),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_INT, Constants.XSD_LONG, [
      new XmlSchemaMinInclusiveFacet(-2147483648, false),
      new XmlSchemaMaxInclusiveFacet(2147483647, false),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_SHORT, Constants.XSD_INT, [
      new XmlSchemaMinInclusiveFacet(-32768, false),
      new XmlSchemaMaxInclusiveFacet(32767, false),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_BYTE, Constants.XSD_SHORT, [
      new XmlSchemaMinInclusiveFacet(-128, false),
      new XmlSchemaMaxInclusiveFacet(127, false),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_NONNEGATIVEINTEGER, Constants.XSD_INTEGER, [
      new XmlSchemaMinInclusiveFacet(0, false),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_POSITIVEINTEGER, Constants.XSD_NONNEGATIVEINTEGER, [
      new XmlSchemaMinInclusiveFacet(1, false),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_UNSIGNEDLONG, Constants.XSD_NONNEGATIVEINTEGER, [
      new XmlSchemaMaxInclusiveFacet(BigInt('18446744073709551615'), false),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_UNSIGNEDINT, Constants.XSD_UNSIGNEDLONG, [
      new XmlSchemaMaxInclusiveFacet(4294967295, false),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_UNSIGNEDSHORT, Constants.XSD_UNSIGNEDINT, [
      new XmlSchemaMaxInclusiveFacet(65535, false),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_UNSIGNEDBYTE, Constants.XSD_UNSIGNEDSHORT, [
      new XmlSchemaMaxInclusiveFacet(255, false),
    ]);

    this.setDerivationByRestriction(xsd, Constants.XSD_STRING, Constants.XSD_ANYSIMPLETYPE, [
      new XmlSchemaWhiteSpaceFacet('preserve', false),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_NORMALIZEDSTRING, Constants.XSD_STRING, [
      new XmlSchemaWhiteSpaceFacet('replace', false),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_TOKEN, Constants.XSD_NORMALIZEDSTRING, [
      new XmlSchemaWhiteSpaceFacet('collapse', false),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_LANGUAGE, Constants.XSD_TOKEN, [
      new XmlSchemaPatternFacet('[a-zA-Z]{1,8}(-[a-zA-Z0-9]{1,8})*', false),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_NMTOKEN, Constants.XSD_TOKEN, [
      new XmlSchemaPatternFacet('\\c+', false),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_NAME, Constants.XSD_NMTOKEN, [
      new XmlSchemaPatternFacet('\\i\\c*', false),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_NCNAME, Constants.XSD_TOKEN, [
      new XmlSchemaPatternFacet('[\\i-[:]][\\c-[:]]*', false),
    ]);
    this.setDerivationByRestriction(xsd, Constants.XSD_ID, Constants.XSD_NCNAME);
    this.setDerivationByRestriction(xsd, Constants.XSD_IDREF, Constants.XSD_NCNAME);
    this.setDerivationByRestriction(xsd, Constants.XSD_ENTITY, Constants.XSD_NCNAME);

    this.setDerivationByList(xsd, Constants.XSD_NMTOKENS, Constants.XSD_NMTOKEN);
    this.setDerivationByList(xsd, Constants.XSD_IDREFS, Constants.XSD_IDREF);
    this.setDerivationByList(xsd, Constants.XSD_ENTITIES, Constants.XSD_ENTITY);
  }

  private setDerivationByRestriction(xsd: XmlSchema, child: QName, parent: QName, facets?: XmlSchemaFacet[]) {
    const simple = xsd.getTypeByQName(child) as XmlSchemaSimpleType;
    const restriction = new XmlSchemaSimpleTypeRestriction();
    restriction.setBaseTypeName(parent);
    restriction.setBaseType(xsd.getTypeByQName(parent) as XmlSchemaSimpleType);

    facets != null && restriction.getFacets().push(...facets);
    simple.setContent(restriction);
  }

  private setDerivationByList(xsd: XmlSchema, child: QName, parent: QName) {
    const simple = xsd.getTypeByQName(child) as XmlSchemaSimpleType;
    const restriction = new XmlSchemaSimpleTypeList();
    restriction.setItemTypeName(parent);
    restriction.setItemType(xsd.getTypeByQName(parent) as XmlSchemaSimpleType);
    simple.setContent(restriction);
  }

  /**
   * Pop the stack of schemas. This function, while public, is probably not useful outside of the
   * implementation.
   */
  pop() {
    this.stack.pop();
  }

  /**
   * Push a schema onto the stack of schemas. This function, while public, is probably not useful outside of
   * the implementation.
   *
   * @param pKey the schema key.
   */
  push(pKey: SchemaKey) {
    this.stack.push(pKey);
  }

  read(content: string, validator: (schema: XmlSchema) => void): XmlSchema {
    const parser = new DOMParser();
    const document = parser.parseFromString(content, 'text/xml');
    const error = document.querySelector('parsererror');
    if (error)
      throw new Error(
        `XML Parser Error: ${error.textContent ?? 'The XML schema file had a parse error, but there was no reason provided'}`,
      );
    const builder = new SchemaBuilder(this, validator);
    return builder.build(document);
  }

  /**
   * Return the schema from this collection for a particular targetNamespace.
   *
   * @param uri target namespace URI.
   * @return the schema.
   */
  schemaForNamespace(uri: string) {
    for (const entry of Array.from(this.schemas.entries())) {
      if (entry[0].getNamespace() === uri) {
        return entry[1];
      }
    }
    return null;
  }

  /**
   * Set the base URI. This is used when schemas need to be loaded from relative locations
   *
   * @param baseUri baseUri for this collection.
   */
  setBaseUri(baseUri: string) {
    this.baseUri = baseUri;
    const target = (this.schemaResolver as CollectionURIResolver)?.setCollectionBaseURI;
    target && target(baseUri);
  }

  setExtReg(extReg: ExtensionRegistry) {
    this.extReg = extReg;
  }

  /**
   * sets the known namespace map
   *
   * @param knownNamespaceMap a map of previously known XMLSchema objects keyed by their namespace (String)
   */
  setKnownNamespaceMap(knownNamespaceMap: Record<string, XmlSchema>) {
    this.knownNamespaceMap = knownNamespaceMap;
  }

  /**
   * Set the namespace context for this collection, which controls the assignment of namespace prefixes to
   * namespaces.
   *
   * @param namespaceContext the context.
   */
  setNamespaceContext(namespaceContext: NamespacePrefixList) {
    this.namespaceContext = namespaceContext;
  }

  /**
   * Register a custom URI resolver
   *
   * @param schemaResolver resolver
   */
  setSchemaResolver(schemaResolver: URIResolver) {
    this.schemaResolver = schemaResolver;
  }

  addSchema(pKey: SchemaKey, pSchema: XmlSchema) {
    if (this.schemas?.has(pKey)) {
      throw new Error(
        `A schema with target namespace ${pKey.getNamespace()} and system ID ${pKey.getSystemId()} is already present.`,
      );
    }
    this.schemas.set(pKey, pSchema);
  }

  addUnresolvedType(type: QName, receiver: TypeReceiver) {
    let receivers = this.unresolvedTypes.get(type);
    if (receivers == null) {
      receivers = [];
      this.unresolvedTypes.set(type, receivers);
    }
    receivers.push(receiver);
  }

  containsSchema(pKey: SchemaKey): boolean {
    return !!this.schemas && this.schemas.has(pKey);
  }

  /**
   * gets a schema from the external namespace map
   *
   * @param namespace
   * @return
   */
  getKnownSchema(namespace: string | null) {
    return namespace == null ? null : this.knownNamespaceMap[namespace];
  }

  /**
   * Get a schema given a SchemaKey
   *
   * @param pKey
   * @return
   */
  getSchema(pKey: SchemaKey) {
    return this.schemas.get(pKey);
  }

  resolveType(typeName: QName, type: XmlSchemaType) {
    const receivers = this.unresolvedTypes.get(typeName);
    if (receivers == null) {
      return;
    }
    for (const receiver of receivers) {
      receiver.setType(type);
    }
    this.unresolvedTypes.delete(typeName);
  }

  private addSimpleType(schema: XmlSchema, typeName: string) {
    const type = new XmlSchemaSimpleType(schema, true);
    type.setName(typeName);
  }

  /**
   * Find a global attribute by QName in this collection of schemas.
   *
   * @param schemaAttributeName the name of the attribute.
   * @return the attribute or null.
   */
  getAttributeByQName(schemaAttributeName: QName | null) {
    if (schemaAttributeName == null) {
      return null;
    }
    const uri = schemaAttributeName.getNamespaceURI();
    for (const entry of Array.from(this.schemas.entries())) {
      if (entry[0].getNamespace() === uri) {
        const attribute = entry[1].getAttributeByQName(schemaAttributeName);
        if (attribute != null) {
          return attribute;
        }
      }
    }
    return null;
  }

  /**
   * Retrieve a global element from the schema collection.
   *
   * @param qname the element QName.
   * @return the element object, or null.
   */
  getElementByQName(qname: QName | null) {
    if (qname == null) {
      return null;
    }
    const uri = qname.getNamespaceURI();
    for (const entry of Array.from(this.schemas.entries())) {
      if (entry[0].getNamespace() === uri) {
        const element = entry[1].getElementByQName(qname);
        if (element != null) {
          return element;
        }
      }
    }
    return null;
  }

  getAttributeGroupByQName(name: QName | null) {
    if (name == null) {
      return null;
    }
    const uri = name.getNamespaceURI();
    const entries = this.schemas.entries();
    for (const entry of Array.from(this.schemas.entries())) {
      if (entry[0].getNamespace() === uri) {
        const group = entry[1].getAttributeGroupByQName(name);
        if (group != null) {
          return group;
        }
      }
    }
    return null;
  }

  getGroupByQName(name: QName | null) {
    if (name == null) {
      return null;
    }
    const uri = name.getNamespaceURI();
    for (const entry of Array.from(this.schemas.entries())) {
      if (entry[0].getNamespace() === uri) {
        const group = entry[1].getGroupByQName(name);
        if (group != null) {
          return group;
        }
      }
    }
    return null;
  }

  getNotationByQName(name: QName | null) {
    if (name == null) {
      return null;
    }
    const uri = name.getNamespaceURI();
    for (const entry of Array.from(this.schemas.entries())) {
      if (entry[0].getNamespace() === uri) {
        const notation = entry[1].getNotationByQName(name);
        if (notation != null) {
          return notation;
        }
      }
    }
    return null;
  }
}
