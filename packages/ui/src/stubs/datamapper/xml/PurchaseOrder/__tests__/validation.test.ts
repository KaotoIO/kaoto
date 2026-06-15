/**
 * XSLT Integrity Validation Tests
 *
 * Comprehensive validation of purchaseorder-to-shiporder.xsl including:
 * - XSLT syntax and structure
 * - Namespace declarations
 * - Parameter declarations
 * - XPath expression syntax
 * - XPath source field resolution against parsed XSD schemas
 * - Target document structure validation against parsed schema
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { IDocument } from '../../../../../models/datamapper/document';
import { PathExpression, PathSegment } from '../../../../../models/datamapper/xpath';
import { DocumentService } from '../../../../../services/document/document.service';
import { XPathService } from '../../../../../services/xpath/xpath.service';
import {
  loadDocumentsFromDotKaoto,
  SampleXmlValidator,
  SchemaReferenceValidator,
  XPathExtractor,
  XSLTOutputExtractor,
  XSLTValidator,
} from './validation-utils';

interface DeadLink {
  expression: string;
  line: number;
  fieldPath: string;
  documentRef: string;
}

function extractFieldPathsSafe(expression: string): PathExpression[] | undefined {
  try {
    return XPathService.extractFieldPaths(expression);
  } catch {
    return undefined;
  }
}

function resolveDocument(
  fieldPath: PathExpression,
  sourceBodyDoc: IDocument,
  parameterDocs: Map<string, IDocument>,
): { targetDoc: IDocument; documentRef: string } | undefined {
  if (!fieldPath.documentReferenceName) {
    const rootField = sourceBodyDoc.fields[0];
    if (rootField && fieldPath.pathSegments.length > 0 && fieldPath.pathSegments[0].name !== rootField.name) {
      return undefined;
    }
    return { targetDoc: sourceBodyDoc, documentRef: 'source body' };
  }
  const paramDoc = parameterDocs.get(fieldPath.documentReferenceName);
  if (paramDoc) {
    return { targetDoc: paramDoc, documentRef: `$${fieldPath.documentReferenceName}` };
  }
  return undefined;
}

function formatPathSegments(segments: PathSegment[]): string {
  return segments.map((s) => (s.prefix ? `${s.prefix}:` : '') + (s.isAttribute ? '@' : '') + s.name).join('/');
}

function validateFieldPath(
  fieldPath: PathExpression,
  xpathExpression: string,
  xpathLine: number,
  sourceBodyDoc: IDocument,
  parameterDocs: Map<string, IDocument>,
  namespaceMap: Record<string, string>,
): DeadLink | undefined {
  if (fieldPath.pathSegments.length === 0) return undefined;
  if (fieldPath.pathSegments.some((s) => !s.name || s.name === '*')) return undefined;

  const resolved = resolveDocument(fieldPath, sourceBodyDoc, parameterDocs);
  if (!resolved) return undefined;

  const absPath = XPathService.toAbsolutePath(fieldPath);
  const field = DocumentService.getFieldFromPathSegments(namespaceMap, resolved.targetDoc, absPath.pathSegments);

  if (!field) {
    return {
      expression: xpathExpression,
      line: xpathLine,
      fieldPath: formatPathSegments(absPath.pathSegments),
      documentRef: resolved.documentRef,
    };
  }
  return undefined;
}

const XSLT_PATH = path.join(__dirname, '../purchaseorder-to-shiporder.xsl');

describe('PurchaseOrder DataMapper XSLT Integrity', () => {
  let xpathExtractor: XPathExtractor;
  let xsltValidator: XSLTValidator;
  let xsltContent: string;
  let sourceBodyDoc: IDocument;
  let targetBodyDoc: IDocument;
  let parameterDocs: Map<string, IDocument>;
  let namespaceMap: Record<string, string>;

  beforeAll(() => {
    xpathExtractor = new XPathExtractor();
    xsltContent = fs.readFileSync(XSLT_PATH, 'utf-8');
    xsltValidator = new XSLTValidator(xsltContent);

    const docSet = loadDocumentsFromDotKaoto(path.join(__dirname, '../.kaoto'), path.join(__dirname, '..'));
    sourceBodyDoc = docSet.sourceBodyDoc;
    targetBodyDoc = docSet.targetBodyDoc;
    parameterDocs = docSet.parameterDocs;
    namespaceMap = docSet.namespaceMap;
  });

  describe('XSLT Structure', () => {
    test('should be well-formed XML', () => {
      const result = xsltValidator.isWellFormed();
      if (!result.valid) {
        fail(`XSLT is not well-formed: ${result.error}`);
      }
      expect(result.valid).toBe(true);
    });

    test('should have valid XSLT root element', () => {
      expect(xsltContent).toMatch(/<xsl:stylesheet|<xsl:transform/);
    });

    test('should declare XSLT version', () => {
      expect(xsltContent).toMatch(/version="[0-9.]+"/);
    });

    test('should have XSLT namespace declared', () => {
      expect(xsltContent).toMatch(/xmlns:xsl="http:\/\/www\.w3\.org\/1999\/XSL\/Transform"/);
    });
  });

  describe('Namespace Validation', () => {
    test('should have all namespace prefixes declared', () => {
      const undeclared = xsltValidator.findUndeclaredNamespaces();

      if (undeclared.length > 0) {
        const errorMsg = undeclared.map((ns) => `  ${ns.prefix}: used ${ns.count} times but not declared`).join('\n');
        throw new Error(`Found ${undeclared.length} undeclared namespace prefixes:\n${errorMsg}`);
      }
    });

    test('should not have unused namespace declarations', () => {
      const unused = xsltValidator.findUnusedNamespaces();

      if (unused.length > 0) {
        const errorMsg = unused.map((ns) => `  Line ${ns.line}: xmlns:${ns.prefix}="${ns.uri}"`).join('\n');
        console.warn(
          `Found ${unused.length} unused namespace declarations:\n${errorMsg}\n\nConsider removing unused declarations to keep XSLT clean.`,
        );
      }
    });

    test('should verify namespace URIs match schema targetNamespace', () => {
      const namespaces = xsltValidator.extractNamespaces();

      const expectedNamespaces: Record<string, string> = {
        po: 'http://www.kaoto.io/purchaseorder',
        ai: 'http://www.kaoto.io/account',
        li: 'http://www.kaoto.io/logistics',
        si: 'http://www.kaoto.io/stock',
        bi: 'http://www.kaoto.io/billing',
        party: 'http://www.kaoto.io/common/party',
        addr: 'http://www.kaoto.io/common/address',
        fin: 'http://www.kaoto.io/common/financial',
        dt: 'http://www.kaoto.io/common/datetime',
      };

      const mismatches: string[] = [];

      for (const [prefix, expectedUri] of Object.entries(expectedNamespaces)) {
        const declared = namespaces.find((ns) => ns.prefix === prefix);
        if (declared && declared.uri !== expectedUri) {
          mismatches.push(`  ${prefix}: expected "${expectedUri}", got "${declared.uri}"`);
        } else if (!declared) {
          mismatches.push(`  ${prefix}: not declared (expected "${expectedUri}")`);
        }
      }

      if (mismatches.length > 0) {
        throw new Error(`Found ${mismatches.length} namespace URI mismatches:\n${mismatches.join('\n')}`);
      }
    });
  });

  describe('Parameter Validation', () => {
    test('should have all parameters declared', () => {
      const undeclared = xsltValidator.findUndeclaredParameters();
      const variables = xsltValidator.extractVariables();
      const variableNames = new Set(variables.map((v) => v.name));

      // Filter out variables from undeclared parameters
      const actuallyUndeclared = undeclared.filter((p) => !variableNames.has(p.name));

      if (actuallyUndeclared.length > 0) {
        const errorMsg = actuallyUndeclared
          .map((p) => `  ${p.name}: used ${p.count} times but not declared`)
          .join('\n');
        throw new Error(`Found ${actuallyUndeclared.length} undeclared parameters:\n${errorMsg}`);
      }
    });

    test('should not have unused parameter declarations', () => {
      const unused = xsltValidator.findUnusedParameters();

      if (unused.length > 0) {
        const errorMsg = unused
          .map((p) => {
            const typeInfo = p.type ? ` (type: ${p.type})` : '';
            return `  Line ${p.line}: $${p.name}${typeInfo}`;
          })
          .join('\n');
        console.warn(
          `Found ${unused.length} unused parameter declarations:\n${errorMsg}\n\nConsider removing unused parameters.`,
        );
      }
    });

    test('should have expected parameter documents declared', () => {
      const parameters = xsltValidator.extractParameters();
      const paramNames = new Set(parameters.map((p) => p.name));

      const expectedParams = ['accountInfoDoc', 'logisticsInfoDoc', 'billingInfoDoc', 'stockInfoDoc'];

      const missing = expectedParams.filter((name) => !paramNames.has(name));

      if (missing.length > 0) {
        throw new Error(`Missing expected parameter declarations: ${missing.join(', ')}`);
      }
    });

    test('should have parameter types declared', () => {
      const parameters = xsltValidator.extractParameters();
      const paramsWithoutType = parameters.filter((p) => !p.type);

      if (paramsWithoutType.length > 0) {
        const errorMsg = paramsWithoutType.map((p) => `  Line ${p.line}: $${p.name}`).join('\n');
        console.warn(
          `Found ${paramsWithoutType.length} parameters without type declarations:\n${errorMsg}\n\nConsider adding 'as' attribute for type safety.`,
        );
      }
    });
  });

  describe('XPath Syntax Validation', () => {
    let xpaths: ReturnType<XPathExtractor['extractXPaths']>;

    beforeAll(() => {
      xpaths = xpathExtractor.extractXPaths(xsltContent);
    });

    test('should have valid XPath syntax', () => {
      const invalidXPaths: Array<{ xpath: string; line: number; reason: string }> = [];

      for (const xpath of xpaths) {
        const openBrackets = (xpath.expression.match(/\[/g) || []).length;
        const closeBrackets = (xpath.expression.match(/\]/g) || []).length;
        if (openBrackets !== closeBrackets) {
          invalidXPaths.push({
            xpath: xpath.expression,
            line: xpath.location.line,
            reason: 'Unmatched brackets',
          });
        }

        const openParens = (xpath.expression.match(/\(/g) || []).length;
        const closeParens = (xpath.expression.match(/\)/g) || []).length;
        if (openParens !== closeParens) {
          invalidXPaths.push({
            xpath: xpath.expression,
            line: xpath.location.line,
            reason: 'Unmatched parentheses',
          });
        }
      }

      if (invalidXPaths.length > 0) {
        const errorMsg = invalidXPaths.map((x) => `  Line ${x.line}: ${x.xpath}\n    Reason: ${x.reason}`).join('\n');
        throw new Error(`Found ${invalidXPaths.length} XPaths with syntax errors:\n${errorMsg}`);
      }
    });

    test('should not have dead links in XPath expressions', () => {
      const deadLinks: Array<{ xpath: string; line: number; reason: string }> = [];

      for (const xpath of xpaths) {
        if (xpath.expression.includes('///')) {
          deadLinks.push({
            xpath: xpath.expression,
            line: xpath.location.line,
            reason: 'Triple slash /// detected - likely a typo',
          });
        }

        if (xpath.expression.trim().endsWith('/') && xpath.expression.trim() !== '/') {
          deadLinks.push({
            xpath: xpath.expression,
            line: xpath.location.line,
            reason: 'Trailing slash - incomplete path',
          });
        }
      }

      if (deadLinks.length > 0) {
        const errorMsg = deadLinks.map((x) => `  Line ${x.line}: ${x.xpath}\n    Reason: ${x.reason}`).join('\n');
        throw new Error(`Found ${deadLinks.length} potential dead links:\n${errorMsg}`);
      }
    });
  });

  describe('XPath Source Field Resolution', () => {
    test('should parse source body document successfully', () => {
      expect(sourceBodyDoc).toBeDefined();
      expect(sourceBodyDoc.fields.length).toBeGreaterThan(0);
    });

    test('should parse all parameter documents successfully', () => {
      expect(parameterDocs.size).toBe(4);
      for (const [, doc] of parameterDocs) {
        expect(doc.fields.length).toBeGreaterThan(0);
      }
    });

    test('all XPath field paths should resolve to valid source fields', () => {
      const xpaths = xpathExtractor.extractXPaths(xsltContent);
      const deadLinks: DeadLink[] = [];

      for (const xpath of xpaths) {
        const fieldPaths = extractFieldPathsSafe(xpath.expression);
        if (!fieldPaths) continue;

        for (const fieldPath of fieldPaths) {
          const deadLink = validateFieldPath(
            fieldPath,
            xpath.expression,
            xpath.location.line,
            sourceBodyDoc,
            parameterDocs,
            namespaceMap,
          );
          if (deadLink) deadLinks.push(deadLink);
        }
      }

      if (deadLinks.length > 0) {
        const errorMsg = deadLinks
          .map(
            (dl) =>
              `  Line ${dl.line}: ${dl.fieldPath}\n` +
              `    Document: ${dl.documentRef}\n` +
              `    Expression: ${dl.expression}`,
          )
          .join('\n');
        throw new Error(
          `Found ${deadLinks.length} XPath field paths that don't resolve to valid source fields:\n${errorMsg}`,
        );
      }
    });
  });

  describe('Target Document Structure', () => {
    let outputExtractor: XSLTOutputExtractor;

    beforeAll(() => {
      outputExtractor = new XSLTOutputExtractor();
    });

    test('should parse target document successfully', () => {
      expect(targetBodyDoc).toBeDefined();
      expect(targetBodyDoc.fields.length).toBeGreaterThan(0);
    });

    test('should have correct root output element', () => {
      const outputTree = outputExtractor.extractOutputTree(xsltContent);
      expect(outputTree).toBeDefined();

      const rootField = targetBodyDoc.fields[0];
      expect(outputTree!.localName).toBe(rootField.name);
      expect(outputTree!.namespaceURI).toBe(rootField.namespaceURI);
    });

    test('all output elements should resolve to target schema fields', () => {
      const outputTree = outputExtractor.extractOutputTree(xsltContent);
      expect(outputTree).toBeDefined();

      const rootField = targetBodyDoc.fields[0];
      const unresolved = outputExtractor.validateOutputTree(outputTree!, rootField);

      if (unresolved.length > 0) {
        const errorMsg = unresolved.map((u) => `  ${u.path}`).join('\n');
        throw new Error(`Found ${unresolved.length} output elements not in target schema:\n${errorMsg}`);
      }
    });

    test('should include all required ShipOrder sections', () => {
      const outputTree = outputExtractor.extractOutputTree(xsltContent);
      expect(outputTree).toBeDefined();

      const sectionNames = new Set(outputExtractor.getDirectChildNames(outputTree!));
      const rootField = targetBodyDoc.fields[0];

      const requiredSections = rootField.fields
        .filter((f) => !f.wrapperKind && !f.isAttribute && f.minOccurs > 0)
        .map((f) => f.name);

      const missing = requiredSections.filter((name) => !sectionNames.has(name));
      if (missing.length > 0) {
        throw new Error(`Missing required ShipOrder sections: ${missing.join(', ')}`);
      }
    });

    test('should produce output elements in schema-defined order', () => {
      const outputTree = outputExtractor.extractOutputTree(xsltContent);
      expect(outputTree).toBeDefined();

      const sectionNames = outputExtractor.getDirectChildNames(outputTree!);
      const rootField = targetBodyDoc.fields[0];

      const schemaOrder = rootField.fields.filter((f) => !f.wrapperKind && !f.isAttribute).map((f) => f.name);

      const schemaNameSet = new Set(schemaOrder);
      const actualOrder = sectionNames.filter((name) => schemaNameSet.has(name));
      const expectedOrder = schemaOrder.filter((name) => sectionNames.includes(name));

      expect(actualOrder).toEqual(expectedOrder);
    });
  });

  describe('Schema Cross-Reference Validation', () => {
    test('all type and element references should resolve to valid definitions', () => {
      const schemasDir = path.join(__dirname, '..', 'schemas');
      const schemaFiles = new Map<string, string>();
      const entries = fs.readdirSync(schemasDir, { recursive: true }) as string[];
      for (const entry of entries) {
        if (entry.endsWith('.xsd')) {
          schemaFiles.set(entry, fs.readFileSync(path.join(schemasDir, entry), 'utf-8'));
        }
      }

      const validator = new SchemaReferenceValidator();
      const dangling = validator.validate(schemaFiles);

      if (dangling.length > 0) {
        const errorMsg = dangling
          .map((d) => `  ${d.file}:${d.line}: ${d.kind}="${d.qualifiedName}" (namespace: ${d.resolvedNamespace})`)
          .join('\n');
        throw new Error(`Found ${dangling.length} dangling schema reference(s):\n${errorMsg}`);
      }
    });
  });

  describe('Sample XML Validation', () => {
    const sampleXmlMappings: Array<{ fileName: string; docKey: string }> = [
      { fileName: 'PurchaseOrder.xml', docKey: 'sourceBody' },
      { fileName: 'AccountInfo.xml', docKey: 'accountInfoDoc' },
      { fileName: 'BillingInfo.xml', docKey: 'billingInfoDoc' },
      { fileName: 'LogisticsInfo.xml', docKey: 'logisticsInfoDoc' },
      { fileName: 'StockInfo.xml', docKey: 'stockInfoDoc' },
    ];

    for (const { fileName, docKey } of sampleXmlMappings) {
      test(`${fileName} should match its XSD schema`, () => {
        const samplePath = path.join(__dirname, '..', 'samples', fileName);
        const xmlContent = fs.readFileSync(samplePath, 'utf-8');
        const schemaDoc = docKey === 'sourceBody' ? sourceBodyDoc : parameterDocs.get(docKey);
        if (!schemaDoc) {
          throw new Error(`Schema document not found for '${docKey}'`);
        }

        const validator = new SampleXmlValidator();
        const errors = validator.validateSampleXml(xmlContent, schemaDoc);

        if (errors.length > 0) {
          const errorMsg = errors.map((e) => `  ${e.path}: ${e.reason}`).join('\n');
          throw new Error(`${fileName}: ${errors.length} element(s) not in schema:\n${errorMsg}`);
        }
      });
    }
  });
});
