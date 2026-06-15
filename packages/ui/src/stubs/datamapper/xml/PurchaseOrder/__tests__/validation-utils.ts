import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IDocument,
  IField,
} from '../../../../../models/datamapper/document';
import { IDataMapperMetadata, IDocumentMetadata } from '../../../../../models/datamapper/metadata';
import { DocumentUtilService } from '../../../../../services/document/document-util.service';
import { XmlSchemaDocumentService } from '../../../../../services/document/xml-schema/xml-schema-document.service';

// --- XPath Extractor ---

export interface XPathExpression {
  expression: string;
  location: {
    line: number;
    column: number;
  };
  context: 'select' | 'test' | 'match' | 'avt';
  namespace: string;
}

export class XPathExtractor {
  extractXPaths(xsltContent: string): XPathExpression[] {
    return [
      ...this.extractFromAttribute(xsltContent, 'select'),
      ...this.extractFromAttribute(xsltContent, 'test'),
      ...this.extractFromAttribute(xsltContent, 'match'),
      ...this.extractFromAVT(xsltContent),
    ];
  }

  private extractFromAttribute(content: string, attrName: string): XPathExpression[] {
    const regex = new RegExp(`${attrName}="([^"]*)"`, 'g');
    const xpaths: XPathExpression[] = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      const expression = match[1];
      if (!expression.trim()) continue;

      const line = content.substring(0, match.index).split('\n').length;
      const lastNewline = content.lastIndexOf('\n', match.index);
      const column = match.index - lastNewline;
      const namespace = this.extractNamespace(expression);

      xpaths.push({
        expression,
        location: { line, column },
        context: attrName as 'select' | 'test' | 'match',
        namespace,
      });
    }

    return xpaths;
  }

  private extractFromAVT(content: string): XPathExpression[] {
    const regex = /\{([^}]*)\}/g;
    const xpaths: XPathExpression[] = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      const expression = match[1];
      if (!expression.trim()) continue;

      const line = content.substring(0, match.index).split('\n').length;
      const lastNewline = content.lastIndexOf('\n', match.index);
      const column = match.index - lastNewline;
      const namespace = this.extractNamespace(expression);

      xpaths.push({
        expression,
        location: { line, column },
        context: 'avt',
        namespace,
      });
    }

    return xpaths;
  }

  private extractNamespace(xpath: string): string {
    // Handle both direct paths (po:Element) and variable references ($paramDoc/po:Element)
    const match = /(?:^|\/)(\w+):/.exec(xpath);
    return match ? match[1] : '';
  }
}

// --- XSLT Validator ---

export interface NamespaceDeclaration {
  prefix: string;
  uri: string;
  line: number;
}

export interface ParameterDeclaration {
  name: string;
  type?: string;
  select?: string;
  required: boolean;
  line: number;
}

export class XSLTValidator {
  private readonly xsltContent: string;
  private readonly xsltDoc: Document;

  constructor(xsltContent: string) {
    this.xsltContent = xsltContent;
    const parser = new DOMParser();
    this.xsltDoc = parser.parseFromString(xsltContent, 'application/xml');
  }

  /**
   * Extract all namespace declarations from XSLT
   */
  extractNamespaces(): NamespaceDeclaration[] {
    const namespaces: NamespaceDeclaration[] = [];
    const nsRegex = /xmlns:(\w+)="([^"]+)"/g;
    let match;

    while ((match = nsRegex.exec(this.xsltContent)) !== null) {
      const line = this.xsltContent.substring(0, match.index).split('\n').length;
      namespaces.push({
        prefix: match[1],
        uri: match[2],
        line,
      });
    }

    return namespaces;
  }

  /**
   * Extract all parameter declarations from XSLT
   */
  extractParameters(): ParameterDeclaration[] {
    const parameters: ParameterDeclaration[] = [];
    const paramTagRegex = /<xsl:param\s+([^>]*?)\/?>/g;
    let match;

    while ((match = paramTagRegex.exec(this.xsltContent)) !== null) {
      const attrs = match[1];
      const nameMatch = /name="([^"]+)"/.exec(attrs);
      if (!nameMatch) continue;

      const line = this.xsltContent.substring(0, match.index).split('\n').length;
      const asMatch = /as="([^"]+)"/.exec(attrs);
      const selectMatch = /select="([^"]+)"/.exec(attrs);
      const requiredMatch = /required="([^"]+)"/.exec(attrs);

      parameters.push({
        name: nameMatch[1],
        type: asMatch?.[1],
        select: selectMatch?.[1],
        required: requiredMatch?.[1] === 'yes' || requiredMatch?.[1] === 'true',
        line,
      });
    }

    return parameters;
  }

  private static readonly XPATH_AXES = new Set([
    'self',
    'child',
    'parent',
    'ancestor',
    'descendant',
    'following',
    'preceding',
    'attribute',
    'namespace',
    'ancestor-or-self',
    'descendant-or-self',
    'following-sibling',
    'preceding-sibling',
  ]);

  findNamespaceUsages(): Map<string, number> {
    const usages = new Map<string, number>();

    const xpathRegex = /(?:select|test|match)="[^"]*"|{[^}]*}/g;
    let match;

    while ((match = xpathRegex.exec(this.xsltContent)) !== null) {
      const cleaned = match[0].replace(/'[^']*'/g, '');
      const prefixRegex = /(\w+):/g;
      let prefixMatch;

      while ((prefixMatch = prefixRegex.exec(cleaned)) !== null) {
        const prefix = prefixMatch[1];
        if (
          prefix !== 'xsl' &&
          prefix !== 'xs' &&
          !cleaned.includes(`$${prefix}`) &&
          !/^\d+$/.test(prefix) &&
          !XSLTValidator.XPATH_AXES.has(prefix)
        ) {
          usages.set(prefix, (usages.get(prefix) || 0) + 1);
        }
      }
    }

    return usages;
  }

  extractVariables(): ParameterDeclaration[] {
    const variables: ParameterDeclaration[] = [];
    // Match both: <xsl:variable name="X" select="..."/> and <xsl:variable name="X" select="">...</xsl:variable>
    const varRegex = /<xsl:variable\s+name="([^"]+)"(?:\s+as="([^"]+)")?(?:\s+select="([^"]*)")?\s*\/?>/g;
    let match;

    while ((match = varRegex.exec(this.xsltContent)) !== null) {
      const line = this.xsltContent.substring(0, match.index).split('\n').length;
      variables.push({
        name: match[1],
        type: match[2],
        select: match[3],
        required: false,
        line,
      });
    }

    // Extract XPath 3.0 FLWOR expression local variables (for $var in ..., let $var := ..., and comma-separated)
    // Match both: "for $x in" / "let $x :=" and comma-separated ", $x :="
    const florRegex = /(?:for|let|,)\s+\$(\w+)\s+(?:in|:=)/g;
    while ((match = florRegex.exec(this.xsltContent)) !== null) {
      const line = this.xsltContent.substring(0, match.index).split('\n').length;
      variables.push({
        name: match[1],
        type: undefined,
        select: undefined,
        required: false,
        line,
      });
    }

    return variables;
  }

  findParameterUsages(): Map<string, number> {
    const usages = new Map<string, number>();
    const paramRegex = /\$(\w+)/g;
    let match;

    while ((match = paramRegex.exec(this.xsltContent)) !== null) {
      const paramName = match[1];
      usages.set(paramName, (usages.get(paramName) || 0) + 1);
    }

    return usages;
  }

  isWellFormed(): { valid: boolean; error?: string } {
    const parseError = this.xsltDoc.querySelector('parsererror');
    if (parseError) {
      return {
        valid: false,
        error: parseError.textContent || 'Unknown parse error',
      };
    }
    return { valid: true };
  }

  findUnusedNamespaces(): NamespaceDeclaration[] {
    const declared = this.extractNamespaces();
    const used = this.findNamespaceUsages();

    return declared.filter((ns) => {
      if (['xsl', 'xs', 'xsi'].includes(ns.prefix)) {
        return false;
      }
      return !used.has(ns.prefix);
    });
  }

  findUndeclaredNamespaces(): Array<{ prefix: string; count: number }> {
    const declared = new Set(this.extractNamespaces().map((ns) => ns.prefix));
    const used = this.findNamespaceUsages();

    const undeclared: Array<{ prefix: string; count: number }> = [];

    used.forEach((count, prefix) => {
      if (!declared.has(prefix)) {
        undeclared.push({ prefix, count });
      }
    });

    return undeclared;
  }

  findUnusedParameters(): ParameterDeclaration[] {
    const declared = this.extractParameters();
    const used = this.findParameterUsages();

    return declared.filter((param) => !used.has(param.name));
  }

  findUndeclaredParameters(): Array<{ name: string; count: number }> {
    const declared = new Set(this.extractParameters().map((p) => p.name));
    const used = this.findParameterUsages();

    const undeclared: Array<{ name: string; count: number }> = [];

    used.forEach((count, name) => {
      if (!declared.has(name)) {
        undeclared.push({ name, count });
      }
    });

    return undeclared;
  }
}

// --- Document Loader ---

export interface DataMapperDocumentSet {
  sourceBodyDoc: IDocument;
  targetBodyDoc: IDocument;
  parameterDocs: Map<string, IDocument>;
  namespaceMap: Record<string, string>;
}

function createDocument(
  docType: DocumentType,
  docId: string,
  meta: IDocumentMetadata,
  baseDir: string,
  namespaceMap: Record<string, string>,
): IDocument {
  const definitionFiles: Record<string, string> = {};
  for (const filePath of meta.filePath) {
    definitionFiles[filePath] = fs.readFileSync(path.join(baseDir, filePath), 'utf-8');
  }
  const definition = new DocumentDefinition(
    docType,
    DocumentDefinitionType.XML_SCHEMA,
    docId,
    definitionFiles,
    meta.rootElementChoice,
  );
  const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition, namespaceMap);
  if (result.validationStatus === 'error' || !result.document) {
    throw new Error(`Failed to create document '${docId}': ${(result.errors ?? []).map((e) => e.message).join('; ')}`);
  }
  return result.document;
}

export function loadDocumentsFromDotKaoto(
  kaotoFilePath: string,
  baseDir: string,
  namespaceOverrides?: Record<string, string>,
): DataMapperDocumentSet {
  const kaotoJson: Record<string, IDataMapperMetadata> = JSON.parse(fs.readFileSync(kaotoFilePath, 'utf-8'));
  const meta = Object.values(kaotoJson)[0];

  const namespaceMap: Record<string, string> = { ...meta.namespaceMap, ...namespaceOverrides };

  const sourceBodyDoc = createDocument(
    DocumentType.SOURCE_BODY,
    BODY_DOCUMENT_ID,
    meta.sourceBody,
    baseDir,
    namespaceMap,
  );

  const parameterDocs = new Map<string, IDocument>();
  for (const [paramName, paramMeta] of Object.entries(meta.sourceParameters)) {
    parameterDocs.set(paramName, createDocument(DocumentType.PARAM, paramName, paramMeta, baseDir, namespaceMap));
  }

  const targetBodyDoc = createDocument(DocumentType.TARGET_BODY, 'targetBody', meta.targetBody, baseDir, namespaceMap);
  DocumentUtilService.resolveTypeFragment(targetBodyDoc.fields[0]);

  return { sourceBodyDoc, targetBodyDoc, parameterDocs, namespaceMap };
}

// --- Schema Field Lookup ---

function findSchemaField(fields: IField[], name: string): IField | undefined {
  for (const field of fields) {
    if (!field.wrapperKind && field.name === name) return field;
    if (field.wrapperKind) {
      const found = findSchemaField(field.fields, name);
      if (found) return found;
    }
  }
  return undefined;
}

// --- XSLT Output Extractor ---

export interface OutputElement {
  localName: string;
  namespaceURI: string;
  fields: OutputElement[];
}

export interface UnresolvedOutputElement {
  path: string;
  localName: string;
}

export class XSLTOutputExtractor {
  private static readonly XSL_NS = 'http://www.w3.org/1999/XSL/Transform';
  private static readonly PASS_THROUGH = new Set(['choose', 'when', 'otherwise', 'if', 'for-each']);

  extractOutputTree(xsltContent: string): OutputElement | undefined {
    const doc = new DOMParser().parseFromString(xsltContent, 'application/xml');
    const templates = doc.getElementsByTagNameNS(XSLTOutputExtractor.XSL_NS, 'template');
    for (const template of Array.from(templates)) {
      if (template.getAttribute('match') === '/') {
        return this.findRootLiteralElement(template);
      }
    }
    return undefined;
  }

  getDirectChildNames(root: OutputElement): string[] {
    const seen = new Set<string>();
    return root.fields
      .filter((c) => {
        if (seen.has(c.localName)) return false;
        seen.add(c.localName);
        return true;
      })
      .map((c) => c.localName);
  }

  private findRootLiteralElement(parent: Element): OutputElement | undefined {
    for (const child of Array.from(parent.children)) {
      if (child.namespaceURI !== XSLTOutputExtractor.XSL_NS) {
        return this.buildTree(child);
      }
      if (XSLTOutputExtractor.PASS_THROUGH.has(child.localName)) {
        const found = this.findRootLiteralElement(child);
        if (found) return found;
      }
    }
    return undefined;
  }

  private buildTree(element: Element): OutputElement {
    const fields: OutputElement[] = [];
    this.collectLiteralChildren(element, fields);
    return {
      localName: element.localName,
      namespaceURI: element.namespaceURI || '',
      fields,
    };
  }

  private collectLiteralChildren(parent: Element, result: OutputElement[]): void {
    for (const child of Array.from(parent.children)) {
      if (child.namespaceURI === XSLTOutputExtractor.XSL_NS) {
        if (XSLTOutputExtractor.PASS_THROUGH.has(child.localName)) {
          this.collectLiteralChildren(child, result);
        }
      } else {
        result.push(this.buildTree(child));
      }
    }
  }

  validateOutputTree(output: OutputElement, schemaField: IField): UnresolvedOutputElement[] {
    const unresolved: UnresolvedOutputElement[] = [];
    this.validateRecursive(output, schemaField, output.localName, unresolved);
    return unresolved;
  }

  private validateRecursive(
    output: OutputElement,
    schemaField: IField,
    parentPath: string,
    unresolved: UnresolvedOutputElement[],
  ): void {
    const seen = new Set<string>();
    for (const child of output.fields) {
      if (seen.has(child.localName)) continue;
      seen.add(child.localName);

      const matched = findSchemaField(schemaField.fields, child.localName);
      const childPath = `${parentPath}/${child.localName}`;

      if (!matched) {
        if (child.namespaceURI !== schemaField.namespaceURI) continue;
        unresolved.push({ path: childPath, localName: child.localName });
        continue;
      }

      DocumentUtilService.resolveTypeFragment(matched);
      this.validateRecursive(child, matched, childPath, unresolved);
    }
  }
}

// --- Sample XML Validator ---

export interface SampleXmlError {
  path: string;
  localName: string;
  reason: string;
}

export class SampleXmlValidator {
  validateSampleXml(xmlContent: string, schemaDoc: IDocument): SampleXmlError[] {
    const doc = new DOMParser().parseFromString(xmlContent, 'application/xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      return [{ path: '/', localName: '', reason: `Malformed XML: ${parseError.textContent}` }];
    }

    const rootElement = doc.documentElement;
    const rootField = schemaDoc.fields[0];

    if (rootElement.localName !== rootField.name || rootElement.namespaceURI !== rootField.namespaceURI) {
      return [
        {
          path: '/',
          localName: rootElement.localName,
          reason:
            `Root element '${rootElement.localName}' (ns: ${rootElement.namespaceURI ?? ''})` +
            ` doesn't match schema root '${rootField.name}' (ns: ${rootField.namespaceURI ?? ''})`,
        },
      ];
    }

    const errors: SampleXmlError[] = [];
    DocumentUtilService.resolveTypeFragment(rootField);
    this.validateChildren(rootElement, rootField, rootField.name, errors);
    return errors;
  }

  private validateChildren(
    xmlElement: Element,
    schemaField: IField,
    parentPath: string,
    errors: SampleXmlError[],
  ): void {
    const seen = new Set<string>();
    for (const child of Array.from(xmlElement.children)) {
      if (seen.has(child.localName)) continue;
      seen.add(child.localName);

      const matched = findSchemaField(schemaField.fields, child.localName);
      const childPath = `${parentPath}/${child.localName}`;

      if (!matched) {
        if (child.namespaceURI !== schemaField.namespaceURI) continue;
        errors.push({ path: childPath, localName: child.localName, reason: 'Not found in schema' });
        continue;
      }

      DocumentUtilService.resolveTypeFragment(matched);
      this.validateChildren(child, matched, childPath, errors);
    }
  }
}

// --- Schema Cross-Reference Validator ---

export interface DanglingSchemaReference {
  kind: 'type' | 'base' | 'ref' | 'substitutionGroup';
  qualifiedName: string;
  resolvedNamespace: string;
  file: string;
  line: number;
}

export class SchemaReferenceValidator {
  private static readonly XS_NS = 'http://www.w3.org/2001/XMLSchema';

  private static readonly DEFINITION_TAGS = new Set([
    'complexType',
    'simpleType',
    'element',
    'attributeGroup',
    'group',
  ]);

  private static readonly REFERENCE_ATTRS: ReadonlyArray<{
    attr: string;
    kind: DanglingSchemaReference['kind'];
  }> = [
    { attr: 'type', kind: 'type' },
    { attr: 'base', kind: 'base' },
    { attr: 'ref', kind: 'ref' },
    { attr: 'substitutionGroup', kind: 'substitutionGroup' },
  ];

  validate(schemaFiles: Map<string, string>): DanglingSchemaReference[] {
    const definitions = new Map<string, Set<string>>();

    for (const [, content] of schemaFiles) {
      this.collectDefinitions(content, definitions);
    }

    const dangling: DanglingSchemaReference[] = [];
    for (const [file, content] of schemaFiles) {
      const nsMap = this.extractNamespaceMap(content);
      const references = this.extractReferences(content);

      for (const ref of references) {
        const resolvedNs = nsMap.get(ref.prefix);
        if (!resolvedNs) continue;
        if (resolvedNs === SchemaReferenceValidator.XS_NS) continue;

        if (!definitions.get(resolvedNs)?.has(ref.localName)) {
          dangling.push({
            kind: ref.kind,
            qualifiedName: `${ref.prefix}:${ref.localName}`,
            resolvedNamespace: resolvedNs,
            file,
            line: ref.line,
          });
        }
      }
    }
    return dangling;
  }

  private collectDefinitions(content: string, definitions: Map<string, Set<string>>): void {
    const doc = new DOMParser().parseFromString(content, 'application/xml');
    const root = doc.documentElement;
    const targetNs = root.getAttribute('targetNamespace') ?? '';

    if (!definitions.has(targetNs)) {
      definitions.set(targetNs, new Set());
    }
    const defs = definitions.get(targetNs)!;

    for (const child of Array.from(root.children)) {
      if (child.namespaceURI !== SchemaReferenceValidator.XS_NS) continue;
      if (!SchemaReferenceValidator.DEFINITION_TAGS.has(child.localName)) continue;
      const name = child.getAttribute('name');
      if (name) defs.add(name);
    }
  }

  private extractNamespaceMap(content: string): Map<string, string> {
    const nsMap = new Map<string, string>();
    const nsRegex = /xmlns:(\w+)="([^"]+)"/g;
    let match;
    while ((match = nsRegex.exec(content)) !== null) {
      nsMap.set(match[1], match[2]);
    }
    return nsMap;
  }

  private extractReferences(
    content: string,
  ): Array<{ kind: DanglingSchemaReference['kind']; prefix: string; localName: string; line: number }> {
    const refs: Array<{ kind: DanglingSchemaReference['kind']; prefix: string; localName: string; line: number }> = [];

    for (const { attr, kind } of SchemaReferenceValidator.REFERENCE_ATTRS) {
      const regex = new RegExp(String.raw`${attr}="([A-Za-z_][\w.-]*):([A-Za-z_][\w.-]*)"`, 'g');
      let match;
      while ((match = regex.exec(content)) !== null) {
        refs.push({
          kind,
          prefix: match[1],
          localName: match[2],
          line: content.substring(0, match.index).split('\n').length,
        });
      }
    }

    return refs;
  }
}
