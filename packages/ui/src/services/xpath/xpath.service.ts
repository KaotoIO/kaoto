import { XPath2Parser } from './2.0/xpath-2.0-parser';
import { FunctionGroup, XPathParserResult } from './xpath-parser';
import { IFunctionDefinition } from '../../models/mapping';
import { DocumentType } from '../../models/document';
import { XPATH_2_0_FUNCTIONS } from './2.0/xpath-2.0-functions';
import { monacoXPathLanguageMetadata } from './monaco-language';
import { CstElement, CstNode } from 'chevrotain';
import { IField, PrimitiveDocument } from '../../models/document';
import { DocumentService } from '../document.service';

export class XPathService {
  static parser = new XPath2Parser();
  static functions = XPATH_2_0_FUNCTIONS;

  static parse(xpath: string): XPathParserResult {
    return XPathService.parser.parseXPath(xpath);
  }

  static getXPathFunctionDefinitions(): Record<FunctionGroup, IFunctionDefinition[]> {
    return XPathService.functions;
  }

  static getXPathFunctionNames(): string[] {
    return Object.values(XPathService.getXPathFunctionDefinitions()).reduce((acc, functions) => {
      acc.push(...functions.map((f) => f.name));
      return acc;
    }, [] as string[]);
  }

  static getMonacoXPathLanguageMetadata() {
    monacoXPathLanguageMetadata.tokensProvider.actions = XPathService.getXPathFunctionNames();
    return monacoXPathLanguageMetadata;
  }

  static getNode(node: CstElement, paths: string[]) {
    let answer: CstElement = node;
    for (const path of paths) {
      if (!('children' in answer) || !answer.children[path]) return undefined;
      answer = answer.children[path][0];
    }
    return answer;
  }

  private static pathExprToString(node: CstNode) {
    let answer = 'Slash' in node.children ? '/' : 'DoubleSlash' in node.children ? '//' : '';
    if (!('children' in node.children.RelativePathExpr[0])) return answer;
    const relativePathExpr = XPathService.getNode(node, ['RelativePathExpr']);
    if (!relativePathExpr) return answer;
    const varName = XPathService.getNode(relativePathExpr, ['StepExpr', 'FilterExpr', 'VarRef', 'QName', 'NCName']);
    if (varName && 'image' in varName) {
      answer += '$' + varName.image;
    } else {
      const ncName =
        relativePathExpr && XPathService.getNode(relativePathExpr, ['StepExpr', 'NodeTest', 'NameTest', 'NCName']);
      if (ncName && 'image' in ncName) answer += ncName.image;
    }
    const following =
      relativePathExpr && 'children' in relativePathExpr && relativePathExpr.children.ChildPathSegmentExpr;
    return following
      ? following.reduce((acc, value) => {
          acc += '/';
          const ncName = XPathService.getNode(value, ['StepExpr', 'NodeTest', 'NameTest', 'NCName']);
          if (ncName && 'image' in ncName) acc += ncName.image;
          return acc;
        }, answer)
      : answer;
  }

  static extractFieldPaths(expression: string) {
    const parsed = XPathService.parse(expression);
    const paths = XPathService.collectPathExpressions(parsed.cst);
    return paths.map((node) => XPathService.pathExprToString(node));
  }

  private static collectPathExpressions(node: CstNode) {
    const answer: CstNode[] = [];
    if (node.name === 'PathExpr') {
      answer.push(...XPathService.extractPathExprNode(node));
      return answer;
    }
    return Object.entries(node.children).reduce((acc, [key, value]) => {
      if (key === 'PathExpr') {
        acc.push(...XPathService.extractPathExprNode(value[0] as CstNode));
      } else {
        value.map((child) => {
          if ('children' in child) {
            acc.push(...XPathService.collectPathExpressions(child));
          }
        });
      }
      return acc;
    }, [] as CstNode[]);
  }

  private static extractPathExprNode(pathExprNode: CstNode) {
    // Extract arguments in FunctionCall
    const functionCall = XPathService.getNode(pathExprNode, [
      'RelativePathExpr',
      'StepExpr',
      'FilterExpr',
      'FunctionCall',
    ]);
    if (functionCall && 'children' in functionCall) {
      return functionCall.children.ExprSingle.flatMap((arg) =>
        'children' in arg ? XPathService.collectPathExpressions(arg) : [],
      );
    }
    return [pathExprNode];
  }

  static parsePath(path: string) {
    if (!path.startsWith('$')) return { segments: path.split('/') };
    const pos = path.indexOf('/');
    return {
      paramName: path.substring(0, pos),
      segments: pos !== -1 ? path.substring(pos + 1).split('/') : [],
    };
  }

  static addSource(expression: string, source: PrimitiveDocument | IField): string {
    const sourceXPath = XPathService.toXPath(source);
    return expression ? `${expression}, ${sourceXPath}` : sourceXPath;
  }

  static toXPath(source: PrimitiveDocument | IField): string {
    const doc = source.ownerDocument;
    const prefix = doc.documentType === DocumentType.PARAM ? `$${doc.documentId}` : '';
    return DocumentService.getFieldStack(source).reduce((acc, field) => acc + `/${field.name}`, prefix);
  }
}
