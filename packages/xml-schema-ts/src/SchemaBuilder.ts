import type { XmlSchemaCollection } from './XmlSchemaCollection';
import type { XmlSchemaObject } from './XmlSchemaObject';
import type { XmlSchemaIdentityConstraint } from './constraint/XmlSchemaIdentityConstraint';
import type { NamespaceContext } from './utils/NamespaceContext';
import type { ExtensionRegistry } from './extensions/ExtensionRegistry';

import { DocumentFragmentNodeList } from './DocumentFragmentNodeList';
import { QName } from './QName';
import { SchemaKey } from './SchemaKey';
import { XmlSchema } from './XmlSchema';
import { XmlSchemaAll } from './particle/XmlSchemaAll';
import { XmlSchemaAny } from './particle/XmlSchemaAny';
import { XmlSchemaAnnotation } from './annotation/XmlSchemaAnnotation';
import { XmlSchemaAnyAttribute } from './XmlSchemaAnyAttribute';
import { XmlSchemaAppInfo } from './annotation/XmlSchemaAppInfo';
import { XmlSchemaAttribute } from './attribute/XmlSchemaAttribute';
import { XmlSchemaAttributeGroup } from './attribute/XmlSchemaAttributeGroup';
import { XmlSchemaAttributeGroupRef } from './attribute/XmlSchemaAttributeGroupRef';
import { XmlSchemaChoice } from './particle/XmlSchemaChoice';
import { XmlSchemaComplexContent } from './complex/XmlSchemaComplexContent';
import { XmlSchemaComplexContentExtension } from './complex/XmlSchemaComplexContentExtension';
import { XmlSchemaComplexContentRestriction } from './complex/XmlSchemaComplexContentRestriction';
import { XmlSchemaComplexType } from './complex/XmlSchemaComplexType';
import { XmlSchemaContentProcessing, xmlSchemaContentProcessingValueOf } from './XmlSchemaContentProcessing';
import { XmlSchemaDerivationMethod } from './XmlSchemaDerivationMethod';
import { XmlSchemaElement } from './particle/XmlSchemaElement';
import { XmlSchemaForm, xmlSchemaFormValueOf } from './XmlSchemaForm';
import { XmlSchemaGroup } from './XmlSchemaGroup';
import { XmlSchemaGroupRef } from './particle/XmlSchemaGroupRef';
import { XmlSchemaImport } from './external/XmlSchemaImport';
import { XmlSchemaInclude } from './external/XmlSchemaInclude';
import { XmlSchemaKeyref } from './constraint/XmlSchemaKeyref';
import { XmlSchemaNotation } from './XmlSchemaNotation';
import { XmlSchemaSequence } from './particle/XmlSchemaSequence';
import { XmlSchemaSimpleContent } from './simple/XmlSchemaSimpleContent';
import { XmlSchemaSimpleContentExtension } from './simple/XmlSchemaSimpleContentExtension';
import { XmlSchemaSimpleContentRestriction } from './simple/XmlSchemaSimpleContentRestriction';
import { XmlSchemaSimpleType } from './simple/XmlSchemaSimpleType';
import { XmlSchemaSimpleTypeList } from './simple/XmlSchemaSimpleTypeList';
import { XmlSchemaSimpleTypeRestriction } from './simple/XmlSchemaSimpleTypeRestriction';
import { XmlSchemaSimpleTypeUnion } from './simple/XmlSchemaSimpleTypeUnion';
import { XmlSchemaUnique } from './constraint/XmlSchemaUnique';
import { XmlSchemaXPath } from './XmlSchemaXPath';
import { xmlSchemaUseValueOf } from './XmlSchemaUse';
import { NodeNamespaceContext } from './utils/NodeNamespaceContext';
import { XDOMUtil } from './utils/XDOMUtil';
import * as Constants from './constants';
import { XmlSchemaKey } from './constraint/XmlSchemaKey';
import { XmlSchemaDocumentation } from './annotation/XmlSchemaDocumentation';
import { XmlSchemaRedefine } from './external/XmlSchemaRedefine';
import { XmlSchemaFacetConstructor } from './facet/XmlSchemaFacetConstructor';

export class SchemaBuilder {
  private resolvedSchemas = new Map<string, XmlSchema>();
  private static readonly RESERVED_ATTRIBUTES = new Set<string>([
    'name',
    'type',
    'default',
    'fixed',
    'form',
    'id',
    'use',
    'ref',
  ]);
  private currentSchema = new XmlSchema();
  private extReg?: ExtensionRegistry;

  constructor(
    private collection: XmlSchemaCollection,
    private currentValidator?: (s: XmlSchema) => void,
  ) {
    if (this.collection.getExtReg() != null) {
      this.extReg = this.collection.getExtReg();
    }
  }

  getExtReg() {
    return this.extReg;
  }

  setExtReg(extReg: ExtensionRegistry) {
    this.extReg = extReg;
  }

  build(doc: Document, uri?: string): XmlSchema {
    const schemaEl = doc.documentElement as Element;
    return this.handleXmlSchemaElement(schemaEl, uri);
  }

  getDerivation(el: Element, attrName: string) {
    if (el.hasAttribute(attrName) && !(el.getAttribute(attrName) === '')) {
      // #all | List of (extension | restriction | substitution)
      const derivationMethod = el.getAttribute(attrName)!.trim();
      return XmlSchemaDerivationMethod.schemaValueOf(derivationMethod);
    }
    return XmlSchemaDerivationMethod.NONE;
  }

  getEnumString(el: Element, attrName: string) {
    if (el.hasAttribute(attrName)) {
      return el.getAttribute(attrName)?.trim();
    }
    return 'none'; // local convention for empty value.
  }

  getFormDefault(el: Element, attrName: string) {
    if (el.getAttributeNode(attrName) != null) {
      const value = el.getAttribute(attrName)!;
      return xmlSchemaFormValueOf(value);
    } else {
      return XmlSchemaForm.UNQUALIFIED;
    }
  }

  getMaxOccurs(el: Element) {
    if (el.getAttributeNode('maxOccurs') != null) {
      const value = el.getAttribute('maxOccurs')!;
      if ('unbounded' === value) {
        return Number.MAX_SAFE_INTEGER;
      } else {
        return parseInt(value);
      }
    }
    return 1;
  }

  getMinOccurs(el: Element) {
    if (el.getAttributeNode('minOccurs') != null) {
      const value = el.getAttribute('minOccurs')!;
      if ('unbounded' === value) {
        return Number.MAX_SAFE_INTEGER;
      } else {
        return parseInt(value);
      }
    }
    return 1;
  }

  /**
   * Handles the annotation Traversing if encounter appinfo or documentation add it to annotation collection
   */
  handleAnnotation(annotEl: Element) {
    const annotation = new XmlSchemaAnnotation();
    const content = annotation.getItems();
    let appInfoObj: XmlSchemaAppInfo | null;

    for (
      let appinfo = XDOMUtil.getFirstChildElementNS(annotEl, XmlSchema.SCHEMA_NS, 'appinfo');
      appinfo != null;
      appinfo = XDOMUtil.getNextSiblingElementNS(appinfo, XmlSchema.SCHEMA_NS, 'appinfo')
    ) {
      appInfoObj = this.handleAppInfo(appinfo);
      if (appInfoObj != null) {
        content.push(appInfoObj);
      }
    }

    for (
      let documentation = XDOMUtil.getFirstChildElementNS(annotEl, XmlSchema.SCHEMA_NS, 'documentation');
      documentation != null;
      documentation = XDOMUtil.getNextSiblingElementNS(documentation, XmlSchema.SCHEMA_NS, 'documentation')
    ) {
      const docsObj = this.handleDocumentation(documentation);
      if (docsObj != null) {
        content.push(docsObj);
      }
    }

    // process extra attributes and elements
    this.processExtensibilityComponents(annotation, annotEl, true);
    return annotation;
  }

  /**
   * create new XmlSchemaAppinfo and add value gotten from element to this obj
   *
   * @param content
   */
  handleAppInfo(content: Element) {
    const appInfo = new XmlSchemaAppInfo();
    const markup = new DocumentFragmentNodeList(content);

    if (!content.hasAttribute('source') && markup.length == 0) {
      return null;
    }

    appInfo.setSource(this.getAttribute(content, 'source'));
    appInfo.setMarkup(markup);
    return appInfo;
  }

  /**
   * Handle complex types
   *
   * @param schema
   * @param complexEl
   * @param schemaEl
   * @param topLevel
   */
  handleComplexType(schema: XmlSchema, complexEl: Element, schemaEl: Element, topLevel: boolean) {
    const ct = new XmlSchemaComplexType(schema, topLevel);

    if (complexEl.hasAttribute('name')) {
      // String namespace = (schema.targetNamespace==null)?
      // "":schema.targetNamespace;

      ct.setName(complexEl.getAttribute('name'));
    }
    for (
      let el = XDOMUtil.getFirstChildElementNS(complexEl, XmlSchema.SCHEMA_NS);
      el != null;
      el = XDOMUtil.getNextSiblingElementNS(el, XmlSchema.SCHEMA_NS)
    ) {
      // String elPrefix = el.getPrefix() == null ? "" :
      // el.getPrefix();
      // if(elPrefix.equals(schema.schema_ns_prefix)) {
      if (el.localName === 'sequence') {
        ct.setParticle(this.handleSequence(schema, el, schemaEl));
      } else if (el.localName === 'choice') {
        ct.setParticle(this.handleChoice(schema, el, schemaEl));
      } else if (el.localName === 'all') {
        ct.setParticle(this.handleAll(schema, el, schemaEl));
      } else if (el.localName === 'attribute') {
        ct.getAttributes().push(this.handleAttribute(schema, el, schemaEl));
      } else if (el.localName === 'attributeGroup') {
        ct.getAttributes().push(this.handleAttributeGroupRef(schema, el));
      } else if (el.localName === 'group') {
        const group = this.handleGroupRef(schema, el, schemaEl);
        if (group.getParticle() == null) {
          ct.setParticle(group);
        } else {
          ct.setParticle(group.getParticle());
        }
      } else if (el.localName === 'simpleContent') {
        ct.setContentModel(this.handleSimpleContent(schema, el, schemaEl));
      } else if (el.localName === 'complexContent') {
        ct.setContentModel(this.handleComplexContent(schema, el, schemaEl));
      } else if (el.localName === 'annotation') {
        ct.setAnnotation(this.handleAnnotation(el));
      } else if (el.localName === 'anyAttribute') {
        ct.setAnyAttribute(this.handleAnyAttribute(schema, el, schemaEl));
      }
    }
    if (complexEl.hasAttribute('block')) {
      const blockStr = complexEl.getAttribute('block')!;
      ct.setBlock(XmlSchemaDerivationMethod.schemaValueOf(blockStr));
    }
    if (complexEl.hasAttribute('final')) {
      const finalstr = complexEl.getAttribute('final')!;
      ct.setFinal(XmlSchemaDerivationMethod.schemaValueOf(finalstr));
    }
    if (complexEl.hasAttribute('abstract')) {
      const abs = complexEl.getAttribute('abstract')!;
      if (abs.toLowerCase() === 'true') {
        ct.setAbstract(true);
      } else {
        ct.setAbstract(false);
      }
    }
    if (complexEl.hasAttribute('mixed')) {
      const mixed = complexEl.getAttribute('mixed')!;
      if (mixed.toLowerCase() === 'true') {
        ct.setMixed(true);
      } else {
        ct.setMixed(false);
      }
    }

    // process extra attributes and elements
    this.processExtensibilityComponents(ct, complexEl, true);

    return ct;
  }

  /**
   * iterate each documentation element, create new XmlSchemaAppinfo and add
   * to collection
   */
  handleDocumentation(content: Element) {
    const documentation = new XmlSchemaDocumentation();
    const markup = this.getChildren(content);

    if (!content.hasAttribute('source') && !content.hasAttribute('xml:lang') && markup == null) {
      return null;
    }

    documentation.setSource(this.getAttribute(content, 'source'));
    documentation.setLanguage(this.getAttribute(content, 'xml:lang'));
    documentation.setMarkup(new DocumentFragmentNodeList(content));

    return documentation;
  }

  /**
   * handle_complex_content_restriction
   */
  /**
   * handle elements
   *
   * @param schema
   * @param el
   * @param schemaEl
   * @param isGlobal
   */
  handleElement(schema: XmlSchema, el: Element, schemaEl: Element, isGlobal: boolean) {
    const element = new XmlSchemaElement(schema, isGlobal);

    if (el.getAttributeNode('name') != null) {
      element.setName(el.getAttribute('name'));
    }

    // String namespace = (schema.targetNamespace==null)?
    // "" : schema.targetNamespace;

    let isQualified = schema.getElementFormDefault() == XmlSchemaForm.QUALIFIED;
    isQualified = this.handleElementForm(el, element, isQualified);

    this.handleElementName(isGlobal, element, isQualified);
    this.handleElementAnnotation(el, element);
    this.handleElementGlobalType(el, element);

    let complexTypeEl: Element | null;
    let keyEl: Element | null;
    let keyrefEl: Element | null;
    let uniqueEl: Element | null;
    const simpleTypeEl = XDOMUtil.getFirstChildElementNS(el, XmlSchema.SCHEMA_NS, 'simpleType');
    if (simpleTypeEl != null) {
      const simpleType = this.handleSimpleType(schema, simpleTypeEl, schemaEl, false);
      element.setSchemaType(simpleType);
      element.setSchemaTypeName(simpleType.getQName());
    } else {
      complexTypeEl = XDOMUtil.getFirstChildElementNS(el, XmlSchema.SCHEMA_NS, 'complexType');
      if (complexTypeEl != null) {
        element.setSchemaType(this.handleComplexType(schema, complexTypeEl, schemaEl, false));
      }
    }

    keyEl = XDOMUtil.getFirstChildElementNS(el, XmlSchema.SCHEMA_NS, 'key');
    if (keyEl != null) {
      while (keyEl != null) {
        element.getConstraints().push(this.handleConstraint(keyEl, new XmlSchemaKey()));
        keyEl = XDOMUtil.getNextSiblingElementNS(keyEl, XmlSchema.SCHEMA_NS, 'key');
      }
    }

    keyrefEl = XDOMUtil.getFirstChildElementNS(el, XmlSchema.SCHEMA_NS, 'keyref');
    if (keyrefEl != null) {
      while (keyrefEl != null) {
        const keyRef = this.handleConstraint(keyrefEl, new XmlSchemaKeyref()) as XmlSchemaKeyref;
        if (keyrefEl.hasAttribute('refer')) {
          const name = keyrefEl.getAttribute('refer')!;
          keyRef.refer = this.getRefQName(name, el);
        }
        element.getConstraints().push(keyRef);
        keyrefEl = XDOMUtil.getNextSiblingElementNS(keyrefEl, XmlSchema.SCHEMA_NS, 'keyref');
      }
    }

    uniqueEl = XDOMUtil.getFirstChildElementNS(el, XmlSchema.SCHEMA_NS, 'unique');
    if (uniqueEl != null) {
      while (uniqueEl != null) {
        element.getConstraints().push(this.handleConstraint(uniqueEl, new XmlSchemaUnique()));
        uniqueEl = XDOMUtil.getNextSiblingElementNS(uniqueEl, XmlSchema.SCHEMA_NS, 'unique');
      }
    }

    if (el.hasAttribute('abstract')) {
      element.setAbstractElement(/true/i.test(el.getAttribute('abstract')!));
    }

    if (el.hasAttribute('block')) {
      element.setBlock(this.getDerivation(el, 'block'));
    }

    if (el.hasAttribute('default')) {
      element.setDefaultValue(el.getAttribute('default'));
    }

    if (el.hasAttribute('final')) {
      element.setFinalDerivation(this.getDerivation(el, 'final'));
    }

    if (el.hasAttribute('fixed')) {
      element.setFixedValue(el.getAttribute('fixed'));
    }

    if (el.hasAttribute('id')) {
      element.setId(el.getAttribute('id'));
    }

    if (el.hasAttribute('nillable')) {
      element.setNillable(/true/i.test(el.getAttribute('nillable')!));
    }

    if (el.hasAttribute('substitutionGroup')) {
      const substitutionGroup = el.getAttribute('substitutionGroup')!;
      element.setSubstitutionGroup(this.getRefQName(substitutionGroup, el));
    }

    element.setMinOccurs(this.getMinOccurs(el));
    element.setMaxOccurs(this.getMaxOccurs(el));

    // process extra attributes and elements
    this.processExtensibilityComponents(element, el, true);

    return element;
  }

  /**
   * Handle the import
   *
   * @param schema
   * @param importEl
   * @param _schemaEl
   * @return XmlSchemaObject
   */
  handleImport(schema: XmlSchema, importEl: Element, _schemaEl: Element) {
    const schemaImport = new XmlSchemaImport(schema);

    const annotationEl = XDOMUtil.getFirstChildElementNS(importEl, XmlSchema.SCHEMA_NS, 'annotation');

    if (annotationEl != null) {
      const importAnnotation = this.handleAnnotation(annotationEl);
      schemaImport.setAnnotation(importAnnotation);
    }

    schemaImport.namespace = importEl.getAttribute('namespace');
    const uri = schemaImport.namespace;
    schemaImport.schemaLocation = importEl.getAttribute('schemaLocation');

    const validator = (pSchema: XmlSchema) => {
      const isEmpty = (pValue: string | null) => {
        return pValue == null || Constants.NULL_NS_URI === pValue;
      };

      let valid: boolean;
      if (isEmpty(uri)) {
        valid = isEmpty(pSchema.getSyntacticalTargetNamespace());
      } else {
        valid = pSchema.getSyntacticalTargetNamespace() === uri;
      }
      if (!valid) {
        throw new Error(
          'An imported schema was announced to have the namespace ' +
            uri +
            ', but has the namespace ' +
            pSchema.getSyntacticalTargetNamespace(),
        );
      }
    };
    schemaImport.schema = this.resolveXmlSchema(uri, schemaImport.schemaLocation, schema.getSourceURI(), validator);
    return schemaImport;
  }

  /**
   * Handles the include
   *
   * @param schema
   * @param includeEl
   * @param _schemaEl
   */
  handleInclude(schema: XmlSchema, includeEl: Element, _schemaEl: Element) {
    const include = new XmlSchemaInclude(schema);

    const annotationEl = XDOMUtil.getFirstChildElementNS(includeEl, XmlSchema.SCHEMA_NS, 'annotation');

    if (annotationEl != null) {
      const includeAnnotation = this.handleAnnotation(annotationEl);
      include.setAnnotation(includeAnnotation);
    }

    include.schemaLocation = includeEl.getAttribute('schemaLocation');

    // includes are not supposed to have a target namespace
    // we should be passing in a null in place of the target
    // namespace

    const validator = this.newIncludeValidator(schema);
    include.schema = this.resolveXmlSchema(
      schema.getLogicalTargetNamespace(),
      include.schemaLocation,
      schema.getSourceURI(),
      validator,
    );

    // process extra attributes and elements
    this.processExtensibilityComponents(include, includeEl, true);
    return include;
  }

  /**
   * Handles simple types
   *
   * @param schema
   * @param simpleEl
   * @param schemaEl
   * @param topLevel
   */
  handleSimpleType(schema: XmlSchema, simpleEl: Element, schemaEl: Element, topLevel: boolean) {
    const simpleType = new XmlSchemaSimpleType(schema, topLevel);
    if (simpleEl.hasAttribute('name')) {
      simpleType.setName(simpleEl.getAttribute('name'));
    }

    this.handleSimpleTypeFinal(simpleEl, simpleType);

    const simpleTypeAnnotationEl = XDOMUtil.getFirstChildElementNS(simpleEl, XmlSchema.SCHEMA_NS, 'annotation');

    if (simpleTypeAnnotationEl != null) {
      const simpleTypeAnnotation = this.handleAnnotation(simpleTypeAnnotationEl);

      simpleType.setAnnotation(simpleTypeAnnotation);
    }

    const unionEl = XDOMUtil.getFirstChildElementNS(simpleEl, XmlSchema.SCHEMA_NS, 'union');
    const listEl = XDOMUtil.getFirstChildElementNS(simpleEl, XmlSchema.SCHEMA_NS, 'list');
    const restrictionEl = XDOMUtil.getFirstChildElementNS(simpleEl, XmlSchema.SCHEMA_NS, 'restriction');
    if (restrictionEl != null) {
      this.handleSimpleTypeRestriction(schema, schemaEl, simpleType, restrictionEl);
    } else if (listEl != null) {
      this.handleSimpleTypeList(schema, schemaEl, simpleType, listEl);
    } else if (unionEl != null) {
      this.handleSimpleTypeUnion(schema, schemaEl, simpleType, unionEl);
    }

    // process extra attributes and elements
    this.processExtensibilityComponents(simpleType, simpleEl, true);

    return simpleType;
  }

  handleXmlSchemaElement(schemaEl: Element, systemId?: string): XmlSchema {
    this.currentSchema.setNamespaceContext(NodeNamespaceContext.getNamespaceContext(schemaEl));
    this.setNamespaceAttributes(this.currentSchema, schemaEl);

    const schemaKey = new SchemaKey(this.currentSchema.getLogicalTargetNamespace(), systemId);
    this.handleSchemaElementBasics(schemaEl, systemId, schemaKey);

    let el = XDOMUtil.getFirstChildElementNS(schemaEl, XmlSchema.SCHEMA_NS);
    for (; el != null; el = XDOMUtil.getNextSiblingElementNS(el, XmlSchema.SCHEMA_NS)) {
      this.handleSchemaElementChild(schemaEl, el);
    }

    this.processExtensibilityComponents(this.currentSchema, schemaEl, false);
    return this.currentSchema;
  }

  /**
   * Resolve the schemas
   *
   * @param targetNamespace
   * @param schemaLocation
   * @param baseUri
   * @param validator
   */
  resolveXmlSchema(
    targetNamespace: string | null,
    schemaLocation: string | null,
    baseUri: string | null,
    validator: (s: XmlSchema) => void,
  ) {
    if (baseUri == null) {
      baseUri = this.collection.baseUri;
    }
    if (targetNamespace == null) {
      targetNamespace = Constants.NULL_NS_URI;
    }

    if (
      targetNamespace != null &&
      schemaLocation != null &&
      baseUri != null &&
      this.getCachedSchema(targetNamespace, schemaLocation, baseUri) != null
    ) {
      return this.getCachedSchema(targetNamespace, schemaLocation, baseUri);
    }

    // use the entity resolver provided if the schema location is present
    // null
    if (schemaLocation != null && !('' === schemaLocation)) {
      const source = this.collection.getSchemaResolver().resolveEntity(targetNamespace, schemaLocation, baseUri);

      // the entity resolver was unable to resolve this!!
      if (source == null) {
        // try resolving it with the target namespace only with the
        // known namespace map
        return this.collection.getKnownSchema(targetNamespace);
      }
      //const systemId = source.getSystemId() == null ? schemaLocation : source.getSystemId();
      const systemId = schemaLocation;
      // Push repaired system id back into source where read sees it.
      // It is perhaps a bad thing to patch the source, but this fixes
      // a problem.
      //source.setSystemId(systemId);
      const key = new SchemaKey(targetNamespace, systemId);
      const schema = this.collection.getSchema(key);
      if (schema != null) {
        return schema;
      }
      if (this.collection.check(key)) {
        this.collection.push(key);
        try {
          const readSchema = this.collection.read(source, validator);
          this.putCachedSchema(targetNamespace, schemaLocation, baseUri || '', readSchema);
          return readSchema;
        } finally {
          this.collection.pop();
        }
      }
    } else {
      const schema = this.collection.getKnownSchema(targetNamespace);
      if (schema != null) {
        return schema;
      }
    }
    return null;
  }

  setNamespaceAttributes(schema: XmlSchema, schemaEl: Element) {
    // no targetnamespace found !
    if (schemaEl.getAttributeNode('targetNamespace') != null) {
      const contain = schemaEl.getAttribute('targetNamespace')!;
      schema.setTargetNamespace(contain);
    }
    if (this.currentValidator != null) {
      this.currentValidator(schema);
    }
  }

  private getAttribute(content: Element, attrName: string) {
    if (content.hasAttribute(attrName)) {
      return content.getAttribute(attrName);
    }
    return null;
  }

  /**
   * Return a cached schema if one exists for this thread. In order for schemas to be cached the thread must
   * have done an initCache() previously. The parameters are used to construct a key used to lookup the
   * schema
   *
   * @param targetNamespace
   * @param schemaLocation
   * @param baseUri
   * @return The cached schema if one exists for this thread or null.
   */
  private getCachedSchema(targetNamespace: string, schemaLocation: string, baseUri: string) {
    let resolvedSchema: XmlSchema | null = null;

    if (this.resolvedSchemas != null) {
      // cache is initialized, use it
      const schemaKey = targetNamespace + schemaLocation + baseUri;
      resolvedSchema = this.resolvedSchemas.get(schemaKey) || null;
    }
    return resolvedSchema;
  }

  private getChildren(content: Element) {
    const result: Node[] = [];
    for (let n = content.firstChild; n != null; n = n.nextSibling) {
      result.push(n);
    }
    if (result.length == 0) {
      return null;
    } else {
      return result;
    }
  }

  private getRefQName(pName: string, pNode?: Node, pContext?: NamespaceContext) {
    if (pNode) {
      pContext = NodeNamespaceContext.getNamespaceContext(pNode);
    }
    if (!pContext) {
      throw new Error('Either Node or NamespaceContext must be specified');
    }

    const offset = pName.indexOf(':');
    let uri: string;
    let localName: string;
    let prefix: string;
    if (offset == -1) {
      uri = pContext.getNamespaceURI(Constants.DEFAULT_NS_PREFIX);
      if (Constants.NULL_NS_URI === uri) {
        if (
          this.currentSchema.getTargetNamespace() == null &&
          !(this.currentSchema.getLogicalTargetNamespace() === '')
        ) {
          // If object is unqualified in a schema without a target namespace then it could
          // be that this schema is included in another one. The including namespace
          // should then be used for this reference
          return new QName(this.currentSchema.getLogicalTargetNamespace(), pName);
        }
        return new QName(Constants.NULL_NS_URI, pName);
      }
      localName = pName;
      prefix = Constants.DEFAULT_NS_PREFIX;
    } else {
      prefix = pName.substring(0, offset);
      uri = pContext.getNamespaceURI(prefix);
      const parentSchema = this.currentSchema.getParent();
      if (
        uri == null ||
        (Constants.NULL_NS_URI === uri && parentSchema != null && parentSchema.getNamespaceContext() != null)
      ) {
        uri = parentSchema!.getNamespaceContext()!.getNamespaceURI(prefix);
      }

      if (uri == null || Constants.NULL_NS_URI === uri) {
        throw new Error('The prefix ' + prefix + ' is not bound.');
      }
      localName = pName.substring(offset + 1);
    }
    return new QName(uri, localName, prefix);
  }

  private handleAll(schema: XmlSchema, allEl: Element, schemaEl: Element) {
    const all = new XmlSchemaAll();

    // handle min and max occurences
    all.setMinOccurs(this.getMinOccurs(allEl));
    all.setMaxOccurs(this.getMaxOccurs(allEl));

    for (
      let el = XDOMUtil.getFirstChildElementNS(allEl, XmlSchema.SCHEMA_NS);
      el != null;
      el = XDOMUtil.getNextSiblingElementNS(el, XmlSchema.SCHEMA_NS)
    ) {
      if (el.localName === 'element') {
        const element = this.handleElement(schema, el, schemaEl, false);
        all.getItems().push(element);
      } else if (el.localName === 'annotation') {
        const annotation = this.handleAnnotation(el);
        all.setAnnotation(annotation);
      }
    }
    return all;
  }

  private handleAny(schema: XmlSchema, anyEl: Element, _schemaEl: Element) {
    const any = new XmlSchemaAny();

    any.setTargetNamespace(schema.getLogicalTargetNamespace());

    if (anyEl.hasAttribute('namespace')) {
      any.setNamespace(anyEl.getAttribute('namespace'));
    }

    if (anyEl.hasAttribute('processContents')) {
      const processContent = this.getEnumString(anyEl, 'processContents');

      processContent != null && any.setProcessContent(xmlSchemaContentProcessingValueOf(processContent));
    }

    const annotationEl = XDOMUtil.getFirstChildElementNS(anyEl, XmlSchema.SCHEMA_NS, 'annotation');

    if (annotationEl != null) {
      const annotation = this.handleAnnotation(annotationEl);
      any.setAnnotation(annotation);
    }
    any.setMinOccurs(this.getMinOccurs(anyEl));
    any.setMaxOccurs(this.getMaxOccurs(anyEl));

    return any;
  }

  private handleAnyAttribute(_schema: XmlSchema, anyAttrEl: Element, _schemaEl: Element) {
    const anyAttr = new XmlSchemaAnyAttribute();

    if (anyAttrEl.hasAttribute('namespace')) {
      anyAttr.namespace = anyAttrEl.getAttribute('namespace');
    }

    if (anyAttrEl.hasAttribute('processContents')) {
      const contentProcessing = this.getEnumString(anyAttrEl, 'processContents');

      anyAttr.processContent =
        contentProcessing != null
          ? xmlSchemaContentProcessingValueOf(contentProcessing)
          : XmlSchemaContentProcessing.NONE;
    }
    if (anyAttrEl.hasAttribute('id')) {
      anyAttr.setId(anyAttrEl.getAttribute('id'));
    }

    const annotationEl = XDOMUtil.getFirstChildElementNS(anyAttrEl, XmlSchema.SCHEMA_NS, 'annotation');

    if (annotationEl != null) {
      const annotation = this.handleAnnotation(annotationEl);

      anyAttr.setAnnotation(annotation);
    }
    return anyAttr;
  }

  /**
   * Process attributes
   *
   * @param schema
   * @param attrEl
   * @param schemaEl
   * @param topLevel
   * @return
   */
  private handleAttribute(schema: XmlSchema, attrEl: Element, schemaEl: Element, topLevel: boolean = false) {
    const attr = new XmlSchemaAttribute(schema, topLevel);

    if (attrEl.hasAttribute('name')) {
      const name = attrEl.getAttribute('name')!;
      attr.setName(name);
    }

    if (attrEl.hasAttribute('type')) {
      const name = attrEl.getAttribute('type')!;
      attr.setSchemaTypeName(this.getRefQName(name, attrEl));
    }

    if (attrEl.hasAttribute('default')) {
      attr.setDefaultValue(attrEl.getAttribute('default')!);
    }

    if (attrEl.hasAttribute('fixed')) {
      attr.setFixedValue(attrEl.getAttribute('fixed')!);
    }

    if (attrEl.hasAttribute('form')) {
      const formValue = this.getEnumString(attrEl, 'form')!;
      attr.setForm(xmlSchemaFormValueOf(formValue));
    }

    if (attrEl.hasAttribute('id')) {
      attr.setId(attrEl.getAttribute('id')!);
    }

    if (attrEl.hasAttribute('use')) {
      const useType = this.getEnumString(attrEl, 'use')!;
      attr.setUse(xmlSchemaUseValueOf(useType));
    }
    if (attrEl.hasAttribute('ref')) {
      const name = attrEl.getAttribute('ref')!;
      attr.getRef().setTargetQName(this.getRefQName(name, attrEl));
    }

    const simpleTypeEl = XDOMUtil.getFirstChildElementNS(attrEl, XmlSchema.SCHEMA_NS, 'simpleType');

    if (simpleTypeEl != null) {
      attr.setSchemaType(this.handleSimpleType(schema, simpleTypeEl, schemaEl, false));
    }

    const annotationEl = XDOMUtil.getFirstChildElementNS(attrEl, XmlSchema.SCHEMA_NS, 'annotation');

    if (annotationEl != null) {
      const annotation = this.handleAnnotation(annotationEl);

      attr.setAnnotation(annotation);
    }

    const attrNodes = attrEl.attributes;
    const attrs: Attr[] = [];
    let ctx: NodeNamespaceContext | null = null;
    for (let i = 0; i < attrNodes.length; i++) {
      const att = attrNodes.item(i) as Attr;
      const attName = att.name;
      if (!SchemaBuilder.RESERVED_ATTRIBUTES.has(attName)) {
        attrs.push(att);
        const value = att.value;

        if (value.indexOf(':') > -1) {
          // there is a possibility of some namespace mapping
          const prefix = value.substring(0, value.indexOf(':'));
          if (ctx == null) {
            ctx = NodeNamespaceContext.getNamespaceContext(attrEl);
          }
          const namespace = ctx.getNamespaceURI(prefix);
          if (Constants.NULL_NS_URI !== namespace) {
            const nsAttr = attrEl.ownerDocument.createAttributeNS(Constants.XMLNS_ATTRIBUTE_NS_URI, 'xmlns:' + prefix);
            nsAttr.value = namespace;
            attrs.push(nsAttr);
          }
        }
      }
    }

    if (attrs.length > 0) {
      attr.setUnhandledAttributes(attrs);
    }

    // process extra attributes and elements
    this.processExtensibilityComponents(attr, attrEl, true);
    return attr;
  }

  private handleAttributeGroup(schema: XmlSchema, groupEl: Element, schemaEl: Element) {
    const attrGroup = new XmlSchemaAttributeGroup(schema);

    if (groupEl.hasAttribute('name')) {
      attrGroup.setName(groupEl.getAttribute('name')!);
    }
    if (groupEl.hasAttribute('id')) {
      attrGroup.setId(groupEl.getAttribute('id'));
    }

    for (
      let el = XDOMUtil.getFirstChildElementNS(groupEl, XmlSchema.SCHEMA_NS);
      el != null;
      el = XDOMUtil.getNextSiblingElementNS(el, XmlSchema.SCHEMA_NS)
    ) {
      if (el.localName === 'attribute') {
        const attr = this.handleAttribute(schema, el, schemaEl);
        attrGroup.getAttributes().push(attr);
      } else if (el.localName === 'attributeGroup') {
        const attrGroupRef = this.handleAttributeGroupRef(schema, el);
        attrGroup.getAttributes().push(attrGroupRef);
      } else if (el.localName === 'anyAttribute') {
        attrGroup.setAnyAttribute(this.handleAnyAttribute(schema, el, schemaEl));
      } else if (el.localName === 'annotation') {
        const ann = this.handleAnnotation(el);
        attrGroup.setAnnotation(ann);
      }
    }
    return attrGroup;
  }

  private handleAttributeGroupRef(schema: XmlSchema, attrGroupEl: Element) {
    const attrGroup = new XmlSchemaAttributeGroupRef(schema);

    if (attrGroupEl.hasAttribute('ref')) {
      const ref = attrGroupEl.getAttribute('ref')!;
      attrGroup.getRef().setTargetQName(this.getRefQName(ref, attrGroupEl));
    }

    if (attrGroupEl.hasAttribute('id')) {
      attrGroup.setId(attrGroupEl.getAttribute('id'));
    }

    const annotationEl = XDOMUtil.getFirstChildElementNS(attrGroupEl, XmlSchema.SCHEMA_NS, 'annotation');

    if (annotationEl != null) {
      const annotation = this.handleAnnotation(annotationEl);
      attrGroup.setAnnotation(annotation);
    }
    return attrGroup;
  }

  private handleChoice(schema: XmlSchema, choiceEl: Element, schemaEl: Element) {
    const choice = new XmlSchemaChoice();

    if (choiceEl.hasAttribute('id')) {
      choice.setId(choiceEl.getAttribute('id'));
    }

    choice.setMinOccurs(this.getMinOccurs(choiceEl));
    choice.setMaxOccurs(this.getMaxOccurs(choiceEl));

    for (
      let el = XDOMUtil.getFirstChildElementNS(choiceEl, XmlSchema.SCHEMA_NS);
      el != null;
      el = XDOMUtil.getNextSiblingElementNS(el, XmlSchema.SCHEMA_NS)
    ) {
      if (el.localName === 'sequence') {
        const seq = this.handleSequence(schema, el, schemaEl);
        choice.getItems().push(seq);
      } else if (el.localName === 'element') {
        const element = this.handleElement(schema, el, schemaEl, false);
        choice.getItems().push(element);
      } else if (el.localName === 'group') {
        const group = this.handleGroupRef(schema, el, schemaEl);
        choice.getItems().push(group);
      } else if (el.localName === 'choice') {
        const choiceItem = this.handleChoice(schema, el, schemaEl);
        choice.getItems().push(choiceItem);
      } else if (el.localName === 'any') {
        const any = this.handleAny(schema, el, schemaEl);
        choice.getItems().push(any);
      } else if (el.localName === 'annotation') {
        const annotation = this.handleAnnotation(el);
        choice.setAnnotation(annotation);
      }
    }
    return choice;
  }

  private handleComplexContent(schema: XmlSchema, complexEl: Element, schemaEl: Element) {
    const complexContent = new XmlSchemaComplexContent();

    for (
      let el = XDOMUtil.getFirstChildElementNS(complexEl, XmlSchema.SCHEMA_NS);
      el != null;
      el = XDOMUtil.getNextSiblingElementNS(el, XmlSchema.SCHEMA_NS)
    ) {
      if (el.localName === 'restriction') {
        complexContent.content = this.handleComplexContentRestriction(schema, el, schemaEl);
      } else if (el.localName === 'extension') {
        complexContent.content = this.handleComplexContentExtension(schema, el, schemaEl);
      } else if (el.localName === 'annotation') {
        complexContent.setAnnotation(this.handleAnnotation(el));
      }
    }

    if (complexEl.hasAttribute('mixed')) {
      const mixed = complexEl.getAttribute('mixed')!;
      if (mixed.toLowerCase() === 'true') {
        complexContent.setMixed(true);
      } else {
        complexContent.setMixed(false);
      }
    }

    return complexContent;
  }

  private handleComplexContentExtension(schema: XmlSchema, extEl: Element, schemaEl: Element) {
    const ext = new XmlSchemaComplexContentExtension();

    if (extEl.hasAttribute('base')) {
      const name = extEl.getAttribute('base')!;
      ext.setBaseTypeName(this.getRefQName(name, extEl));
    }

    for (
      let el = XDOMUtil.getFirstChildElementNS(extEl, XmlSchema.SCHEMA_NS);
      el != null;
      el = XDOMUtil.getNextSiblingElementNS(el, XmlSchema.SCHEMA_NS)
    ) {
      if (el.localName === 'sequence') {
        ext.setParticle(this.handleSequence(schema, el, schemaEl));
      } else if (el.localName === 'choice') {
        ext.setParticle(this.handleChoice(schema, el, schemaEl));
      } else if (el.localName === 'all') {
        ext.setParticle(this.handleAll(schema, el, schemaEl));
      } else if (el.localName === 'attribute') {
        ext.getAttributes().push(this.handleAttribute(schema, el, schemaEl));
      } else if (el.localName === 'attributeGroup') {
        ext.getAttributes().push(this.handleAttributeGroupRef(schema, el));
      } else if (el.localName === 'group') {
        ext.setParticle(this.handleGroupRef(schema, el, schemaEl));
      } else if (el.localName === 'anyAttribute') {
        ext.setAnyAttribute(this.handleAnyAttribute(schema, el, schemaEl));
      } else if (el.localName === 'annotation') {
        ext.setAnnotation(this.handleAnnotation(el));
      }
    }
    return ext;
  }

  private handleComplexContentRestriction(schema: XmlSchema, restrictionEl: Element, schemaEl: Element) {
    const restriction = new XmlSchemaComplexContentRestriction();

    if (restrictionEl.hasAttribute('base')) {
      const name = restrictionEl.getAttribute('base')!;
      restriction.setBaseTypeName(this.getRefQName(name, restrictionEl));
    }
    for (
      let el = XDOMUtil.getFirstChildElementNS(restrictionEl, XmlSchema.SCHEMA_NS);
      el != null;
      el = XDOMUtil.getNextSiblingElementNS(el, XmlSchema.SCHEMA_NS)
    ) {
      if (el.localName === 'sequence') {
        restriction.setParticle(this.handleSequence(schema, el, schemaEl));
      } else if (el.localName === 'choice') {
        restriction.setParticle(this.handleChoice(schema, el, schemaEl));
      } else if (el.localName === 'all') {
        restriction.setParticle(this.handleAll(schema, el, schemaEl));
      } else if (el.localName === 'attribute') {
        restriction.getAttributes().push(this.handleAttribute(schema, el, schemaEl));
      } else if (el.localName === 'attributeGroup') {
        restriction.getAttributes().push(this.handleAttributeGroupRef(schema, el));
      } else if (el.localName === 'group') {
        restriction.setParticle(this.handleGroupRef(schema, el, schemaEl));
      } else if (el.localName === 'anyAttribute') {
        restriction.setAnyAttribute(this.handleAnyAttribute(schema, el, schemaEl));
      } else if (el.localName === 'annotation') {
        restriction.setAnnotation(this.handleAnnotation(el));
      }
    }
    return restriction;
  }

  private handleConstraint(constraintEl: Element, constraint: XmlSchemaIdentityConstraint) {
    if (constraintEl.hasAttribute('name')) {
      constraint.setName(constraintEl.getAttribute('name')!);
    }

    if (constraintEl.hasAttribute('refer')) {
      const name = constraintEl.getAttribute('refer')!;
      (constraint as XmlSchemaKeyref).refer = this.getRefQName(name, constraintEl);
    }
    for (
      let el = XDOMUtil.getFirstChildElementNS(constraintEl, XmlSchema.SCHEMA_NS);
      el != null;
      el = XDOMUtil.getNextSiblingElementNS(el, XmlSchema.SCHEMA_NS)
    ) {
      // String elPrefix = el.getPrefix() == null ? ""
      // : el.getPrefix();
      // if(elPrefix.equals(schema.schema_ns_prefix)) {
      if (el.localName === 'selector') {
        const selectorXPath = new XmlSchemaXPath();
        selectorXPath.xpath = el.getAttribute('xpath');

        const annotationEl = XDOMUtil.getFirstChildElementNS(el, XmlSchema.SCHEMA_NS, 'annotation');
        if (annotationEl != null) {
          const annotation = this.handleAnnotation(annotationEl);

          selectorXPath.setAnnotation(annotation);
        }
        constraint.setSelector(selectorXPath);
      } else if (el.localName === 'field') {
        const fieldXPath = new XmlSchemaXPath();
        fieldXPath.xpath = el.getAttribute('xpath');
        constraint.getFields().push(fieldXPath);

        const annotationEl = XDOMUtil.getFirstChildElementNS(el, XmlSchema.SCHEMA_NS, 'annotation');

        if (annotationEl != null) {
          const annotation = this.handleAnnotation(annotationEl);

          fieldXPath.setAnnotation(annotation);
        }
      } else if (el.localName === 'annotation') {
        const constraintAnnotation = this.handleAnnotation(el);
        constraint.setAnnotation(constraintAnnotation);
      }
    }
    return constraint;
  }

  private handleElementAnnotation(el: Element, element: XmlSchemaElement) {
    const annotationEl = XDOMUtil.getFirstChildElementNS(el, XmlSchema.SCHEMA_NS, 'annotation');

    if (annotationEl != null) {
      const annotation = this.handleAnnotation(annotationEl);

      element.setAnnotation(annotation);
    }
  }

  private handleElementForm(el: Element, element: XmlSchemaElement, isQualified: boolean) {
    if (el.hasAttribute('form')) {
      const formDef = el.getAttribute('form')!;
      element.setForm(xmlSchemaFormValueOf(formDef));
    }
    isQualified = element.getForm() == XmlSchemaForm.QUALIFIED;

    return isQualified;
  }

  private handleElementGlobalType(el: Element, element: XmlSchemaElement) {
    if (el.getAttributeNode('type') != null) {
      const typeName = el.getAttribute('type')!;
      element.setSchemaTypeName(this.getRefQName(typeName, el));
      const typeQName = element.getSchemaTypeName()!;

      const type = this.collection.getTypeByQName(typeQName);
      if (type == null) {
        // Could be a forward reference...
        this.collection.addUnresolvedType(typeQName, element);
      }
      element.setSchemaType(type);
    } else if (el.getAttributeNode('ref') != null) {
      const refName = el.getAttribute('ref')!;
      const refQName = this.getRefQName(refName, el);
      element.getRef().setTargetQName(refQName);
    }
  }

  private handleElementName(_isGlobal: boolean, _element: XmlSchemaElement, _isQualified: boolean) {}

  /*
   * handle_simple_content_restriction if( restriction has base attribute ) set the baseType else if(
   * restriction has an inline simpleType ) handleSimpleType add facets if any to the restriction
   */

  /*
   * handle_simple_content_extension extension should have a base name and cannot have any inline defn for(
   * each childNode ) if( attribute) handleAttribute else if( attributeGroup) handleAttributeGroup else if(
   * anyAttribute) handleAnyAttribute
   */

  private handleGroup(schema: XmlSchema, groupEl: Element, schemaEl: Element) {
    const group = new XmlSchemaGroup(schema);
    group.setName(groupEl.getAttribute('name'));

    for (
      let el = XDOMUtil.getFirstChildElementNS(groupEl, XmlSchema.SCHEMA_NS);
      el != null;
      el = XDOMUtil.getNextSiblingElementNS(el, XmlSchema.SCHEMA_NS)
    ) {
      if (el.localName === 'all') {
        group.setParticle(this.handleAll(schema, el, schemaEl));
      } else if (el.localName === 'sequence') {
        group.setParticle(this.handleSequence(schema, el, schemaEl));
      } else if (el.localName === 'choice') {
        group.setParticle(this.handleChoice(schema, el, schemaEl));
      } else if (el.localName === 'annotation') {
        const groupAnnotation = this.handleAnnotation(el);
        group.setAnnotation(groupAnnotation);
      }
    }
    return group;
  }

  private handleGroupRef(schema: XmlSchema, groupEl: Element, schemaEl: Element) {
    const group = new XmlSchemaGroupRef();

    group.setMaxOccurs(this.getMaxOccurs(groupEl));
    group.setMinOccurs(this.getMinOccurs(groupEl));

    const annotationEl = XDOMUtil.getFirstChildElementNS(groupEl, XmlSchema.SCHEMA_NS, 'annotation');

    if (annotationEl != null) {
      const annotation = this.handleAnnotation(annotationEl);

      group.setAnnotation(annotation);
    }

    if (groupEl.hasAttribute('ref')) {
      const ref = groupEl.getAttribute('ref')!;
      group.setRefName(this.getRefQName(ref, groupEl));
      return group;
    }
    for (
      let el = XDOMUtil.getFirstChildElementNS(groupEl, XmlSchema.SCHEMA_NS);
      el != null;
      el = XDOMUtil.getNextSiblingElement(el)
    ) {
      if (el.localName === 'sequence') {
        group.setParticle(this.handleSequence(schema, el, schemaEl));
      } else if (el.localName === 'all') {
        group.setParticle(this.handleAll(schema, el, schemaEl));
      } else if (el.localName === 'choice') {
        group.setParticle(this.handleChoice(schema, el, schemaEl));
      }
    }
    return group;
  }

  private handleNotation(schema: XmlSchema, notationEl: Element) {
    const notation = new XmlSchemaNotation(schema);

    if (notationEl.hasAttribute('id')) {
      notation.setId(notationEl.getAttribute('id')!);
    }

    if (notationEl.hasAttribute('name')) {
      notation.setName(notationEl.getAttribute('name')!);
    }

    if (notationEl.hasAttribute('public')) {
      notation.setPublicNotation(notationEl.getAttribute('public')!);
    }

    if (notationEl.hasAttribute('system')) {
      notation.setSystem(notationEl.getAttribute('system')!);
    }

    const annotationEl = XDOMUtil.getFirstChildElementNS(notationEl, XmlSchema.SCHEMA_NS, 'annotation');

    if (annotationEl != null) {
      const annotation = this.handleAnnotation(annotationEl);
      notation.setAnnotation(annotation);
    }

    return notation;
  }

  /**
   * Handle redefine
   *
   * @param schema
   * @param redefineEl
   * @param schemaEl
   * @return
   */
  private handleRedefine(schema: XmlSchema, redefineEl: Element, schemaEl: Element) {
    const redefine = new XmlSchemaRedefine(schema);
    redefine.schemaLocation = redefineEl.getAttribute('schemaLocation');
    const validator = this.newIncludeValidator(schema);

    redefine.schema = this.resolveXmlSchema(
      schema.getLogicalTargetNamespace(),
      redefine.schemaLocation,
      schema.getSourceURI(),
      validator,
    );

    /*
     * FIXME - This seems not right. Since the redefine should take into account the attributes of the
     * original element we cannot just build the type defined in the redefine section - what we need to do
     * is to get the original type object and modify it. However one may argue (quite reasonably) that the
     * purpose of this object model is to provide just the representation and not the validation (as it
     * has been always the case)
     */

    for (
      let el = XDOMUtil.getFirstChildElementNS(redefineEl, XmlSchema.SCHEMA_NS);
      el != null;
      el = XDOMUtil.getNextSiblingElementNS(el, XmlSchema.SCHEMA_NS)
    ) {
      if (el.localName === 'simpleType') {
        const type = this.handleSimpleType(schema, el, schemaEl, false);

        redefine.getSchemaTypes().set(type.getQName()!, type);
        redefine.getItems().push(type);
      } else if (el.localName === 'complexType') {
        const type = this.handleComplexType(schema, el, schemaEl, true);

        redefine.getSchemaTypes().set(type.getQName()!, type);
        redefine.getItems().push(type);
      } else if (el.localName === 'group') {
        const group = this.handleGroup(schema, el, schemaEl);
        redefine.getGroups().set(group.getQName()!, group);
        redefine.getItems().push(group);
      } else if (el.localName === 'attributeGroup') {
        const group = this.handleAttributeGroup(schema, el, schemaEl);

        redefine.getAttributeGroups().set(group.getQName()!, group);
        redefine.getItems().push(group);
      } else if (el.localName === 'annotation') {
        const annotation = this.handleAnnotation(el);
        redefine.setAnnotation(annotation);
      }
    }
    return redefine;
  }

  private handleSchemaElementBasics(schemaEl: Element, systemId: string | null = null, schemaKey: SchemaKey): void {
    if (!this.collection.containsSchema(schemaKey)) {
      this.collection.addSchema(schemaKey, this.currentSchema);
      this.currentSchema.setParent(this.collection); // establish parentage now.
    } else {
      throw new Error(
        'Schema name conflict in collection. Namespace: ' + this.currentSchema.getLogicalTargetNamespace(),
      );
    }

    this.currentSchema.setElementFormDefault(this.getFormDefault(schemaEl, 'elementFormDefault'));
    this.currentSchema.setAttributeFormDefault(this.getFormDefault(schemaEl, 'attributeFormDefault'));
    this.currentSchema.setBlockDefault(this.getDerivation(schemaEl, 'blockDefault'));
    this.currentSchema.setFinalDefault(this.getDerivation(schemaEl, 'finalDefault'));

    /* set id and version attributes */
    if (schemaEl.hasAttribute('id')) {
      this.currentSchema.setId(schemaEl.getAttribute('id'));
    }
    if (schemaEl.hasAttribute('version')) {
      this.currentSchema.setVersion(schemaEl.getAttribute('version'));
    }

    this.currentSchema.setSourceURI(systemId);
  }

  private handleSchemaElementChild(schemaEl: Element, el: Element): void {
    if (el.localName === 'simpleType') {
      const type = this.handleSimpleType(this.currentSchema, el, schemaEl, true);
      this.collection.resolveType(type.getQName()!, type);
    } else if (el.localName === 'complexType') {
      const type = this.handleComplexType(this.currentSchema, el, schemaEl, true);
      this.collection.resolveType(type.getQName()!, type);
    } else if (el.localName === 'element') {
      this.handleElement(this.currentSchema, el, schemaEl, true);
    } else if (el.localName === 'include') {
      this.handleInclude(this.currentSchema, el, schemaEl);
    } else if (el.localName === 'import') {
      this.handleImport(this.currentSchema, el, schemaEl);
    } else if (el.localName === 'group') {
      this.handleGroup(this.currentSchema, el, schemaEl);
    } else if (el.localName === 'attributeGroup') {
      this.handleAttributeGroup(this.currentSchema, el, schemaEl);
    } else if (el.localName === 'attribute') {
      this.handleAttribute(this.currentSchema, el, schemaEl, true);
    } else if (el.localName === 'redefine') {
      this.handleRedefine(this.currentSchema, el, schemaEl);
    } else if (el.localName === 'notation') {
      this.handleNotation(this.currentSchema, el);
    } else if (el.localName === 'annotation') {
      const annotation = this.handleAnnotation(el);
      this.currentSchema.setAnnotation(annotation);
    }
  }

  private handleSequence(schema: XmlSchema, sequenceEl: Element, schemaEl: Element) {
    const sequence = new XmlSchemaSequence();

    // handle min and max occurences
    sequence.setMinOccurs(this.getMinOccurs(sequenceEl));
    sequence.setMaxOccurs(this.getMaxOccurs(sequenceEl));

    for (
      let el = XDOMUtil.getFirstChildElementNS(sequenceEl, XmlSchema.SCHEMA_NS);
      el != null;
      el = XDOMUtil.getNextSiblingElementNS(el, XmlSchema.SCHEMA_NS)
    ) {
      if (el.localName === 'sequence') {
        const seq = this.handleSequence(schema, el, schemaEl);
        sequence.getItems().push(seq);
      } else if (el.localName === 'element') {
        const element = this.handleElement(schema, el, schemaEl, false);
        sequence.getItems().push(element);
      } else if (el.localName === 'group') {
        const group = this.handleGroupRef(schema, el, schemaEl);
        sequence.getItems().push(group);
      } else if (el.localName === 'choice') {
        const choice = this.handleChoice(schema, el, schemaEl);
        sequence.getItems().push(choice);
      } else if (el.localName === 'any') {
        const any = this.handleAny(schema, el, schemaEl);
        sequence.getItems().push(any);
      } else if (el.localName === 'annotation') {
        const annotation = this.handleAnnotation(el);
        sequence.setAnnotation(annotation);
      }
    }
    return sequence;
  }

  private handleSimpleContent(schema: XmlSchema, simpleEl: Element, schemaEl: Element) {
    const simpleContent = new XmlSchemaSimpleContent();

    for (
      let el = XDOMUtil.getFirstChildElementNS(simpleEl, XmlSchema.SCHEMA_NS);
      el != null;
      el = XDOMUtil.getNextSiblingElementNS(el, XmlSchema.SCHEMA_NS)
    ) {
      if (el.localName === 'restriction') {
        simpleContent.content = this.handleSimpleContentRestriction(schema, el, schemaEl);
      } else if (el.localName === 'extension') {
        simpleContent.content = this.handleSimpleContentExtension(schema, el, schemaEl);
      } else if (el.localName === 'annotation') {
        simpleContent.setAnnotation(this.handleAnnotation(el));
      }
    }
    return simpleContent;
  }

  private handleSimpleContentExtension(schema: XmlSchema, extEl: Element, schemaEl: Element) {
    const ext = new XmlSchemaSimpleContentExtension();

    if (extEl.hasAttribute('base')) {
      const name = extEl.getAttribute('base')!;
      ext.setBaseTypeName(this.getRefQName(name, extEl));
    }

    for (
      let el = XDOMUtil.getFirstChildElementNS(extEl, XmlSchema.SCHEMA_NS);
      el != null;
      el = XDOMUtil.getNextSiblingElementNS(el, XmlSchema.SCHEMA_NS)
    ) {
      if (el.localName === 'attribute') {
        const attr = this.handleAttribute(schema, el, schemaEl);
        ext.getAttributes().push(attr);
      } else if (el.localName === 'attributeGroup') {
        const attrGroup = this.handleAttributeGroupRef(schema, el);
        ext.getAttributes().push(attrGroup);
      } else if (el.localName === 'anyAttribute') {
        ext.setAnyAttribute(this.handleAnyAttribute(schema, el, schemaEl));
      } else if (el.localName === 'annotation') {
        const ann = this.handleAnnotation(el);
        ext.setAnnotation(ann);
      }
    }
    return ext;
  }

  private handleSimpleContentRestriction(schema: XmlSchema, restrictionEl: Element, schemaEl: Element) {
    const restriction = new XmlSchemaSimpleContentRestriction();

    if (restrictionEl.hasAttribute('base')) {
      const name = restrictionEl.getAttribute('base')!;
      restriction.setBaseTypeName(this.getRefQName(name, restrictionEl));
    }

    if (restrictionEl.hasAttribute('id')) {
      restriction.setId(restrictionEl.getAttribute('id'));
    }

    // check back simpleContent tag children to add attributes and
    // simpleType if any occur
    for (
      let el = XDOMUtil.getFirstChildElementNS(restrictionEl, XmlSchema.SCHEMA_NS);
      el != null;
      el = XDOMUtil.getNextSiblingElementNS(el, XmlSchema.SCHEMA_NS)
    ) {
      if (el.localName === 'attribute') {
        const attr = this.handleAttribute(schema, el, schemaEl);
        restriction.getAttributes().push(attr);
      } else if (el.localName === 'attributeGroup') {
        const attrGroup = this.handleAttributeGroupRef(schema, el);
        restriction.getAttributes().push(attrGroup);
      } else if (el.localName === 'simpleType') {
        restriction.setBaseType(this.handleSimpleType(schema, el, schemaEl, false));
      } else if (el.localName === 'anyAttribute') {
        restriction.anyAttribute = this.handleAnyAttribute(schema, el, schemaEl);
      } else if (el.localName === 'annotation') {
        restriction.setAnnotation(this.handleAnnotation(el));
      } else {
        const facet = XmlSchemaFacetConstructor.construct(el);
        const annotation = XDOMUtil.getFirstChildElementNS(el, XmlSchema.SCHEMA_NS, 'annotation');

        if (annotation != null) {
          const facetAnnotation = this.handleAnnotation(annotation);
          facet.setAnnotation(facetAnnotation);
        }
        restriction.getFacets().push(facet);
        // process extra attributes and elements
        this.processExtensibilityComponents(facet, el, true);
      }
    }
    return restriction;
  }

  private handleSimpleTypeFinal(simpleEl: Element, simpleType: XmlSchemaSimpleType) {
    if (simpleEl.hasAttribute('final')) {
      const finalstr = simpleEl.getAttribute('final')!;
      simpleType.setFinal(XmlSchemaDerivationMethod.schemaValueOf(finalstr));
    }
  }

  private handleSimpleTypeList(schema: XmlSchema, schemaEl: Element, simpleType: XmlSchemaSimpleType, listEl: Element) {
    const list = new XmlSchemaSimpleTypeList();

    /******
     * if( list has an itemType attribute ) set the baseTypeName and look up the base type else if( list
     * has a SimpleTypeElement as child) get that element and do a handleSimpleType set the list has the
     * content of the simpleType
     */
    const inlineListType = XDOMUtil.getFirstChildElementNS(listEl, XmlSchema.SCHEMA_NS, 'simpleType');
    if (listEl.hasAttribute('itemType')) {
      const name = listEl.getAttribute('itemType')!;
      list.itemTypeName = this.getRefQName(name, listEl);
    } else if (inlineListType != null) {
      list.itemType = this.handleSimpleType(schema, inlineListType, schemaEl, false);
    }

    const listAnnotationEl = XDOMUtil.getFirstChildElementNS(listEl, XmlSchema.SCHEMA_NS, 'annotation');
    if (listAnnotationEl != null) {
      const listAnnotation = this.handleAnnotation(listAnnotationEl);
      list.setAnnotation(listAnnotation);
    }
    simpleType.content = list;
  }

  private handleSimpleTypeRestriction(
    schema: XmlSchema,
    schemaEl: Element,
    simpleType: XmlSchemaSimpleType,
    restrictionEl: Element,
  ) {
    const restriction = new XmlSchemaSimpleTypeRestriction();

    const restAnnotationEl = XDOMUtil.getFirstChildElementNS(restrictionEl, XmlSchema.SCHEMA_NS, 'annotation');

    if (restAnnotationEl != null) {
      const restAnnotation = this.handleAnnotation(restAnnotationEl);
      restriction.setAnnotation(restAnnotation);
    }
    /**
     * if (restriction has a base attribute ) set the baseTypeName and look up the base type else if(
     * restriction has a SimpleType Element as child) get that element and do a handleSimpleType; get the
     * children of restriction other than annotation and simpleTypes and construct facets from it; set the
     * restriction has the content of the simpleType
     **/

    const inlineSimpleType = XDOMUtil.getFirstChildElementNS(restrictionEl, XmlSchema.SCHEMA_NS, 'simpleType');

    if (restrictionEl.hasAttribute('base')) {
      const ctx = NodeNamespaceContext.getNamespaceContext(restrictionEl);
      restriction.setBaseTypeName(this.getRefQName(restrictionEl.getAttribute('base')!, undefined, ctx));
    } else if (inlineSimpleType != null) {
      restriction.setBaseType(this.handleSimpleType(schema, inlineSimpleType, schemaEl, false));
    }
    for (
      let el = XDOMUtil.getFirstChildElementNS(restrictionEl, XmlSchema.SCHEMA_NS);
      el != null;
      el = XDOMUtil.getNextSiblingElementNS(el, XmlSchema.SCHEMA_NS)
    ) {
      if (el.localName !== 'annotation' && el.localName !== 'simpleType') {
        const facet = XmlSchemaFacetConstructor.construct(el);
        const annotation = XDOMUtil.getFirstChildElementNS(el, XmlSchema.SCHEMA_NS, 'annotation');

        if (annotation != null) {
          const facetAnnotation = this.handleAnnotation(annotation);
          facet.setAnnotation(facetAnnotation);
        }
        // process extra attributes and elements
        this.processExtensibilityComponents(facet, el, true);
        restriction.getFacets().push(facet);
      }
    }
    simpleType.content = restriction;
  }

  private handleSimpleTypeUnion(
    schema: XmlSchema,
    schemaEl: Element,
    simpleType: XmlSchemaSimpleType,
    unionEl: Element,
  ) {
    const union = new XmlSchemaSimpleTypeUnion();

    /******
     * if( union has a memberTypes attribute ) add the memberTypeSources string for (each memberType in
     * the list ) lookup(memberType) for( all SimpleType child Elements) add the simpleTypeName (if any)
     * to the memberType Sources do a handleSimpleType with the simpleTypeElement
     */
    if (unionEl.hasAttribute('memberTypes')) {
      const memberTypes = unionEl.getAttribute('memberTypes')!;
      union.setMemberTypesSource(memberTypes);
      const v: QName[] = [];
      for (const member of memberTypes.split(' ')) {
        v.push(this.getRefQName(member, unionEl));
      }
      union.setMemberTypesQNames(v);
    }

    let inlineUnionType = XDOMUtil.getFirstChildElementNS(unionEl, XmlSchema.SCHEMA_NS, 'simpleType');
    while (inlineUnionType != null) {
      const unionSimpleType = this.handleSimpleType(schema, inlineUnionType, schemaEl, false);

      union.getBaseTypes().push(unionSimpleType);

      if (!unionSimpleType.isAnonymous()) {
        union.setMemberTypesSource(union.getMemberTypesSource() + ' ' + unionSimpleType.getName());
      }

      inlineUnionType = XDOMUtil.getNextSiblingElementNS(inlineUnionType, XmlSchema.SCHEMA_NS, 'simpleType');
    }

    // NodeList annotations = unionEl.getElementsByTagNameNS(
    // XmlSchema.SCHEMA_NS, "annotation");
    const unionAnnotationEl = XDOMUtil.getFirstChildElementNS(unionEl, XmlSchema.SCHEMA_NS, 'annotation');

    if (unionAnnotationEl != null) {
      const unionAnnotation = this.handleAnnotation(unionAnnotationEl);

      union.setAnnotation(unionAnnotation);
    }
    simpleType.content = union;
  }

  private newIncludeValidator(schema: XmlSchema) {
    return (pSchema: XmlSchema) => {
      const isEmpty = (pValue?: string | null) => {
        return pValue == null || Constants.NULL_NS_URI === pValue;
      };
      if (isEmpty(pSchema.getSyntacticalTargetNamespace())) {
        pSchema.setLogicalTargetNamespace(schema.getLogicalTargetNamespace());
      } else {
        if (pSchema.getSyntacticalTargetNamespace() !== schema.getLogicalTargetNamespace()) {
          let msg = 'An included schema was announced to have the default target namespace';
          if (!isEmpty(schema.getLogicalTargetNamespace())) {
            msg += ' or the target namespace ' + schema.getLogicalTargetNamespace();
          }
          throw new Error(msg + ', but has the target namespace ' + pSchema.getLogicalTargetNamespace());
        }
      }
    };
  }

  private processExtensibilityComponents(
    schemaObject: XmlSchemaObject,
    parentElement: Element,
    namespaces: boolean,
  ): void {
    if (this.extReg != null) {
      // process attributes
      const attributes = parentElement.attributes;
      for (let i = 0; i < attributes.length; i++) {
        const attribute = attributes.item(i) as Attr;

        const namespaceURI = attribute.namespaceURI;
        const name = attribute.localName;

        if (
          namespaceURI != null &&
          '' !== namespaceURI && // ignore unqualified attributes
          // ignore namespaces
          (namespaces || !namespaceURI.startsWith(Constants.XMLNS_ATTRIBUTE_NS_URI)) &&
          // does not belong to the schema namespace by any chance!
          Constants.URI_2001_SCHEMA_XSD !== namespaceURI
        ) {
          const qName = new QName(namespaceURI, name);
          this.extReg.deserializeExtension(schemaObject, qName, attribute);
        }
      }

      // process elements
      let child = parentElement.firstChild;
      while (child != null) {
        if (child.nodeType == Node.ELEMENT_NODE) {
          const extElement = child as Element;
          const namespaceURI = extElement.namespaceURI;
          const name = extElement.localName;

          if (namespaceURI != null && Constants.URI_2001_SCHEMA_XSD !== namespaceURI) {
            // does not belong to the schema namespace
            const qName = new QName(namespaceURI, name);
            this.extReg.deserializeExtension(schemaObject, qName, extElement);
          }
        }
        child = child.nextSibling;
      }
    }
  }

  /**
   * Add an XmlSchema to the cache if the current thread has the cache enabled. The first three parameters
   * are used to construct a key
   *
   * @param targetNamespace
   * @param schemaLocation
   * @param baseUri This parameter is the value put under the key (if the cache is enabled)
   * @param readSchema
   */
  private putCachedSchema(targetNamespace: string, schemaLocation: string, baseUri: string, readSchema: XmlSchema) {
    if (this.resolvedSchemas != null) {
      const schemaKey = targetNamespace + schemaLocation + baseUri;
      this.resolvedSchemas.set(schemaKey, readSchema);
    }
  }
}
