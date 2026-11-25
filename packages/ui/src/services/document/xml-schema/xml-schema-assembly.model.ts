import { NS_XML_SCHEMA } from '../../../models/datamapper/standard-namespaces';
import {
  XmlSchema,
  XmlSchemaAll,
  XmlSchemaAttribute,
  XmlSchemaAttributeGroup,
  XmlSchemaAttributeGroupRef,
  XmlSchemaChoice,
  XmlSchemaCollection,
  XmlSchemaComplexContentExtension,
  XmlSchemaComplexContentRestriction,
  XmlSchemaComplexType,
  XmlSchemaElement,
  XmlSchemaGroup,
  XmlSchemaGroupRef,
  XmlSchemaSequence,
  XmlSchemaSimpleContentExtension,
  XmlSchemaSimpleContentRestriction,
  XmlSchemaSimpleType,
  XmlSchemaType,
} from '../../../xml-schema-ts';
import { XmlSchemaRedefine } from '../../../xml-schema-ts/external/XmlSchemaRedefine';
import { QName } from '../../../xml-schema-ts/QName';
import { XmlSchemaSimpleTypeRestriction } from '../../../xml-schema-ts/simple/XmlSchemaSimpleTypeRestriction';

/**
 * A derivation whose base can be a redefined type: the content of a complex or simple type that names a base type.
 */
export type XmlSchemaDerivation =
  | XmlSchemaComplexContentExtension
  | XmlSchemaComplexContentRestriction
  | XmlSchemaSimpleContentExtension
  | XmlSchemaSimpleContentRestriction
  | XmlSchemaSimpleTypeRestriction;

interface ComponentKind<T> {
  inSchema: (schema: XmlSchema, qName: QName) => T | null;
}

/**
 * A component kind that `xs:redefine` can redefine: simple and complex types, model groups and attribute groups.
 */
interface RedefinableKind<T> extends ComponentKind<T> {
  inRedefine: (redefine: XmlSchemaRedefine, qName: QName) => T | null;
}

const isRedefinable = <T>(kind: ComponentKind<T>): kind is RedefinableKind<T> => 'inRedefine' in kind;

const TYPE_KIND: RedefinableKind<XmlSchemaType> = {
  inSchema: (schema, qName) => schema.getTypeByQName(qName, false),
  inRedefine: (redefine, qName) => redefine.getSchemaTypes().get(qName) ?? null,
};

const ELEMENT_KIND: ComponentKind<XmlSchemaElement> = {
  inSchema: (schema, qName) => schema.getElementByQName(qName, false),
};

const GROUP_KIND: RedefinableKind<XmlSchemaGroup> = {
  inSchema: (schema, qName) => schema.getGroupByQName(qName, false),
  inRedefine: (redefine, qName) => redefine.getGroups().get(qName) ?? null,
};

const ATTRIBUTE_KIND: ComponentKind<XmlSchemaAttribute> = {
  inSchema: (schema, qName) => schema.getAttributeByQName(qName, false),
};

const ATTRIBUTE_GROUP_KIND: RedefinableKind<XmlSchemaAttributeGroup> = {
  inSchema: (schema, qName) => schema.getAttributeGroupByQName(qName, false),
  inRedefine: (redefine, qName) => redefine.getAttributeGroups().get(qName) ?? null,
};

/**
 * The schemas of an XML Schema document as seen from its entry schema file: the entry schema and the files it reaches
 * first, then the whole collection.
 *
 * The entry is chosen after parsing and changes with the root element, so every component lookup by QName for a
 * chosen entry goes through the assembly instead of the collection. A different entry means a different assembly.
 * It keeps no state per collection besides its collection and entry, and reads the collection at every lookup, so
 * schemas added to the collection later are found without building a new assembly. Without an entry, every lookup
 * goes to the collection. The only memo is keyed by parsed redefinitions, which do not change after parsing.
 *
 * The entry walk follows `xs:include`, `xs:import` and `xs:redefine`, unlike the deep lookups of {@link XmlSchema}
 * in `xml-schema-ts`, which skip `xs:redefine`. For each schema it checks the schema's own components and the
 * redefinitions of its `xs:redefine` externals before it descends, so a redefinition wins over the component it
 * redefines for every lookup of the assembly. A self-reference inside a redefinition (a group ref in the redefinition
 * of the same group, an attribute-group ref in the redefinition of the same attribute group, or the base of a type
 * that redefines itself) resolves one layer down instead: in the redefined schema, with the same walk. A redefined
 * file chosen as its own entry keeps its original content, since no redefinition is reached from it.
 *
 * Method names follow what a lookup may return: `lookup*` searches the entry first, then the whole collection;
 * `find*InEntry` searches the entry only, without the collection fallback; `resolve*` takes a reference or a
 * derivation rather than a QName, so that a self-reference inside a redefinition can resolve one layer down.
 *
 * @see XmlSchemaDocument.assembly
 */
export class XmlSchemaAssembly {
  private static readonly groupRefsOfRedefinition = new WeakMap<XmlSchemaGroup, Set<XmlSchemaGroupRef>>();

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
    return this.lookupUserType(typeQName);
  }

  /**
   * Same as {@link lookupType}, but also resolves built-in XSD types through the collection.
   *
   * @param typeQName - The qualified name of the type to find
   * @returns The schema type, or null if it is not declared anywhere
   */
  lookupTypeOrBuiltIn(typeQName: QName): XmlSchemaType | null {
    return this.lookupUserType(typeQName) ?? this.collection.getTypeByQName(typeQName) ?? null;
  }

  /**
   * Looks up a global schema element by QName, entry first, then in the whole collection.
   *
   * @param elementQName - The qualified name of the element to find
   * @returns The schema element, or null if it is not declared anywhere
   */
  lookupElement(elementQName: QName | null): XmlSchemaElement | null {
    if (!elementQName) return null;
    return this.findElementInEntry(elementQName) ?? this.collection.getElementByQName(elementQName) ?? null;
  }

  /**
   * Looks up a global schema element by QName in the entry and the files it reaches, without the collection fallback.
   *
   * @param elementQName - The qualified name of the element to find
   * @returns The schema element, or null without an entry or when the entry does not reach it
   */
  findElementInEntry(elementQName: QName | null): XmlSchemaElement | null {
    if (!elementQName) return null;
    return this.findInEntry(ELEMENT_KIND, elementQName);
  }

  /**
   * Looks up a global model group by QName, entry first, then in the whole collection. A group ref resolves through
   * {@link resolveGroupRef} instead, which also handles a ref inside the redefinition of the group it names.
   *
   * @param groupQName - The qualified name of the group to find
   * @returns The schema group, or null if it is not declared anywhere
   */
  lookupGroup(groupQName: QName | null): XmlSchemaGroup | null {
    if (!groupQName) return null;
    return this.findInEntry(GROUP_KIND, groupQName) ?? this.collection.getGroupByQName(groupQName) ?? null;
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
      this.findInEntry(ATTRIBUTE_KIND, attributeQName) ?? this.collection.getAttributeByQName(attributeQName) ?? null
    );
  }

  /**
   * Looks up a global attribute group by QName, entry first, then in the whole collection. An attribute-group ref
   * resolves through {@link resolveAttributeGroupRef} instead, which also handles a ref inside the redefinition of the
   * attribute group it names.
   *
   * @param groupQName - The qualified name of the attribute group to find
   * @returns The attribute group, or null if it is not declared anywhere
   */
  lookupAttributeGroup(groupQName: QName | null): XmlSchemaAttributeGroup | null {
    if (!groupQName) return null;
    return (
      this.findInEntry(ATTRIBUTE_GROUP_KIND, groupQName) ?? this.collection.getAttributeGroupByQName(groupQName) ?? null
    );
  }

  /**
   * Resolves the group a group ref points to. A ref inside the redefinition of the group it names resolves one layer
   * down, to the group it redefines; any other ref resolves like {@link lookupGroup}.
   *
   * @param groupRef - The group ref to resolve
   * @returns The referenced group, or null if it is not found
   */
  resolveGroupRef(groupRef: XmlSchemaGroupRef): XmlSchemaGroup | null {
    return this.resolveReference(
      GROUP_KIND,
      groupRef.getRefName(),
      (group) => XmlSchemaAssembly.getGroupRefsOf(group).has(groupRef),
      (qName) => this.lookupGroup(qName),
    );
  }

  /**
   * Resolves the attribute group an attribute-group ref points to. A ref directly inside the redefinition of the
   * attribute group it names resolves one layer down, to the attribute group it redefines; any other ref resolves
   * like {@link lookupAttributeGroup}.
   *
   * @param groupRef - The attribute-group ref to resolve
   * @returns The referenced attribute group, or null if it is not found
   */
  resolveAttributeGroupRef(groupRef: XmlSchemaAttributeGroupRef): XmlSchemaAttributeGroup | null {
    return this.resolveReference(
      ATTRIBUTE_GROUP_KIND,
      groupRef.getRef().getTargetQName(),
      (group) => group.getAttributes().includes(groupRef),
      (qName) => this.lookupAttributeGroup(qName),
    );
  }

  /**
   * Resolves the base type of a derivation. The derivation of a type that redefines itself resolves one layer down,
   * to the type it redefines; any other derivation resolves its base like {@link lookupType}.
   *
   * @param derivation - The extension or restriction whose base is resolved
   * @returns The user-defined base type, or null for a built-in base or a base not declared anywhere
   */
  resolveDerivationBase(derivation: XmlSchemaDerivation): XmlSchemaType | null {
    return this.resolveDerivation(derivation, (baseQName) => this.lookupUserType(baseQName));
  }

  /**
   * Same as {@link resolveDerivationBase}, but also resolves a built-in base type through the collection.
   *
   * @param derivation - The extension or restriction whose base is resolved
   * @returns The base type, or null if it is not declared anywhere
   */
  resolveDerivationBaseOrBuiltIn(derivation: XmlSchemaDerivation): XmlSchemaType | null {
    return this.resolveDerivation(derivation, (baseQName) => this.lookupTypeOrBuiltIn(baseQName));
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
    const scopedType = typeName ? this.lookupUserType(typeName) : null;
    return scopedType ?? element.getSchemaType();
  }

  private lookupUserType(typeQName: QName | null): XmlSchemaType | null {
    if (!typeQName || typeQName.getNamespaceURI() === NS_XML_SCHEMA) return null;
    return this.findInEntry(TYPE_KIND, typeQName) ?? this.collection.getTypeByQName(typeQName) ?? null;
  }

  private findInEntry<T>(kind: ComponentKind<T>, qName: QName): T | null {
    if (!this.entrySchemaFile) return null;
    return XmlSchemaAssembly.findInSchemas(this.collection.getXmlSchema(this.entrySchemaFile), kind, qName);
  }

  private resolveReference<T>(
    kind: RedefinableKind<T>,
    qName: QName | null,
    isSelfReference: (redefinition: T) => boolean,
    lookup: (qName: QName) => T | null,
  ): T | null {
    if (!qName) return null;
    const redefine = this.findRedefinitionOf(kind, qName, isSelfReference);
    return redefine ? this.findOneLayerDown(redefine, kind, qName) : lookup(qName);
  }

  private resolveDerivation(
    derivation: XmlSchemaDerivation,
    lookup: (baseQName: QName) => XmlSchemaType | null,
  ): XmlSchemaType | null {
    return this.resolveReference(
      TYPE_KIND,
      derivation.getBaseTypeName(),
      (redefinition) => XmlSchemaAssembly.getDerivationOf(redefinition) === derivation,
      lookup,
    );
  }

  private findOneLayerDown<T>(redefine: XmlSchemaRedefine, kind: ComponentKind<T>, qName: QName): T | null {
    const redefinedSchema = redefine.getSchema();
    return redefinedSchema ? XmlSchemaAssembly.findInSchemas([redefinedSchema], kind, qName) : null;
  }

  private static findInSchemas<T>(schemas: XmlSchema[], kind: ComponentKind<T>, qName: QName): T | null {
    const searched = new Set<XmlSchema>();
    for (const schema of schemas) {
      const found = XmlSchemaAssembly.findInSchema(schema, kind, qName, searched);
      if (found) return found;
    }
    return null;
  }

  /**
   * `searched` collects every schema already searched during one lookup, not only the current path, like
   * `XmlSchema.findByQName`: a schema reached a second time cannot hold the name either, and redefine cycles stop.
   */
  private static findInSchema<T>(
    schema: XmlSchema,
    kind: ComponentKind<T>,
    qName: QName,
    searched: Set<XmlSchema>,
  ): T | null {
    if (searched.has(schema)) return null;
    searched.add(schema);

    const own = kind.inSchema(schema, qName) ?? XmlSchemaAssembly.findInRedefinitionsOf(schema, kind, qName);
    if (own) return own;

    for (const external of schema.getExternals()) {
      const target = external.getSchema();
      const found = target ? XmlSchemaAssembly.findInSchema(target, kind, qName, searched) : null;
      if (found) return found;
    }
    return null;
  }

  private static findInRedefinitionsOf<T>(schema: XmlSchema, kind: ComponentKind<T>, qName: QName): T | null {
    if (!isRedefinable(kind)) return null;
    for (const external of schema.getExternals()) {
      const redefined = external instanceof XmlSchemaRedefine ? kind.inRedefine(external, qName) : null;
      if (redefined) return redefined;
    }
    return null;
  }

  private *redefinesOfCollection(): Generator<XmlSchemaRedefine> {
    for (const schema of this.collection.getXmlSchemas()) {
      for (const external of schema.getExternals()) {
        if (external instanceof XmlSchemaRedefine) yield external;
      }
    }
  }

  private findRedefinitionOf<T>(
    kind: RedefinableKind<T>,
    qName: QName,
    isSelfReference: (redefinition: T) => boolean,
  ): XmlSchemaRedefine | null {
    for (const redefine of this.redefinesOfCollection()) {
      const redefinition = kind.inRedefine(redefine, qName);
      if (redefinition && isSelfReference(redefinition)) return redefine;
    }
    return null;
  }

  /**
   * A schema type is either an {@link XmlSchemaComplexType} or an {@link XmlSchemaSimpleType}.
   */
  private static getDerivationOf(type: XmlSchemaType): unknown {
    return type instanceof XmlSchemaComplexType
      ? type.getContentModel()?.getContent()
      : (type as XmlSchemaSimpleType).getContent();
  }

  private static getGroupRefsOf(group: XmlSchemaGroup): Set<XmlSchemaGroupRef> {
    let groupRefs = XmlSchemaAssembly.groupRefsOfRedefinition.get(group);
    if (!groupRefs) {
      groupRefs = new Set();
      XmlSchemaAssembly.collectGroupRefs(group.getParticle(), groupRefs);
      XmlSchemaAssembly.groupRefsOfRedefinition.set(group, groupRefs);
    }
    return groupRefs;
  }

  /**
   * Collects the group refs anywhere in a particle tree, without following refs: nested sequences, choices and
   * alls, and the particles of local elements' anonymous complex types, including those of a `complexContent`
   * extension or restriction.
   */
  private static collectGroupRefs(particle: unknown, groupRefs: Set<XmlSchemaGroupRef>) {
    if (particle instanceof XmlSchemaGroupRef) {
      groupRefs.add(particle);
    } else if (
      particle instanceof XmlSchemaSequence ||
      particle instanceof XmlSchemaChoice ||
      particle instanceof XmlSchemaAll
    ) {
      for (const item of particle.getItems()) {
        XmlSchemaAssembly.collectGroupRefs(item, groupRefs);
      }
    } else if (particle instanceof XmlSchemaElement && !particle.isRef()) {
      XmlSchemaAssembly.collectGroupRefsOfAnonymousType(particle.getSchemaType(), groupRefs);
    }
  }

  private static collectGroupRefsOfAnonymousType(type: XmlSchemaType | null, groupRefs: Set<XmlSchemaGroupRef>) {
    if (!(type instanceof XmlSchemaComplexType) || type.getQName()) return;
    XmlSchemaAssembly.collectGroupRefs(type.getParticle(), groupRefs);
    const content = type.getContentModel()?.getContent();
    if (content instanceof XmlSchemaComplexContentExtension || content instanceof XmlSchemaComplexContentRestriction) {
      XmlSchemaAssembly.collectGroupRefs(content.getParticle(), groupRefs);
    }
  }
}
