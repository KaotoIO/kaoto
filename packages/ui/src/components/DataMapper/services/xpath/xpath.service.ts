import { XPath2Parser } from './2.0/xpath-2.0-parser';
import { FunctionGroup, XPathParserResult } from './xpath-parser';
import { IFunctionDefinition } from '../../models/mapping';
import { XPATH_2_0_FUNCTIONS } from './2.0/xpath-2.0-functions';
import { monacoXPathLanguageMetadata } from './monaco-language';
import { CstElement, CstNode } from 'chevrotain';
import { IField, PrimitiveDocument } from '../../models/document';
import { DocumentService } from '../document.service';
import { DocumentType } from '../../models/path';

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
    const stepExpr = XPathService.getNode(relativePathExpr, ['StepExpr']);
    if (!stepExpr) return answer;
    const varName = XPathService.getNode(stepExpr, ['FilterExpr', 'VarRef', 'QName', 'NCName']);
    const contextItem = XPathService.getNode(stepExpr, ['FilterExpr', 'ContextItemExpr']);
    const name = XPathService.extractNameFromStepExpr(stepExpr);
    if (varName && 'image' in varName) {
      answer += '$' + varName.image;
    } else if (contextItem && 'image' in contextItem) {
      answer += contextItem.image;
    } else if (name) {
      answer += name;
    } else {
      throw Error('Unknown RelativePathExpr: ' + relativePathExpr);
    }
    const following =
      relativePathExpr && 'children' in relativePathExpr && relativePathExpr.children.ChildPathSegmentExpr;
    return following
      ? following.reduce((acc, value) => {
          acc += '/';
          const stepExpr = XPathService.getNode(value, ['StepExpr']);
          const name = stepExpr && XPathService.extractNameFromStepExpr(stepExpr);
          if (name) acc += name;
          return acc;
        }, answer)
      : answer;
  }

  private static extractNameFromStepExpr(stepExpr: CstElement) {
    const isAttribute = !!('children' in stepExpr && stepExpr.children['At']);
    const nameTest = XPathService.getNode(stepExpr, ['NodeTest', 'NameTest']);
    if (!nameTest || !('children' in nameTest)) return;
    const ncNames = nameTest.children['NCName'];
    const colon = nameTest.children['Colon'];
    let answer = isAttribute ? '@' : '';
    if (ncNames.length === 1 && (!colon || colon.length === 0) && 'image' in ncNames[0]) answer += ncNames[0].image;
    else if (ncNames.length === 2 && colon?.length === 1 && 'image' in ncNames[0] && 'image' in ncNames[1])
      answer += `${ncNames[0].image}:${ncNames[1].image}`;
    return answer;
  }

  static extractFieldPaths(expression: string) {
    const parsed = XPathService.parse(expression);
    if (!parsed.cst) return [];
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

  static addSource(expression: string, source: string): string {
    return expression ? `${expression}, ${source}` : source;
  }

  static toXPath(source: PrimitiveDocument | IField, namespaceMap: { [prefix: string]: string }): string {
    const doc = source.ownerDocument;
    const prefix = doc.documentType === DocumentType.PARAM ? `$${doc.documentId}` : '';
    const xpath = DocumentService.getFieldStack(source, true).reduceRight(
      (acc, field) => acc + `/${DocumentService.getFieldExpressionNS(field, namespaceMap)}`,
      prefix,
    );
    return xpath ? xpath : '.';
  }
}
