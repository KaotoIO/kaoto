import { XPath2Parser } from './2.0/xpath-2.0-parser';
import { FunctionGroup, XPathParserResult } from './xpath-parser';
import { IFunctionDefinition } from '../../models/mapping';
import { XPATH_2_0_FUNCTIONS } from './2.0/xpath-2.0-functions';
import { monacoXPathLanguageMetadata } from './monaco-language';
import { CstElement, CstNode } from 'chevrotain';

export class XPathParserService {
  static parser = new XPath2Parser();
  static functions = XPATH_2_0_FUNCTIONS;

  static parse(xpath: string): XPathParserResult {
    return XPathParserService.parser.parseXPath(xpath);
  }

  static getXPathFunctionDefinitions(): Record<FunctionGroup, IFunctionDefinition[]> {
    return XPathParserService.functions;
  }

  static getXPathFunctionNames(): string[] {
    return Object.values(XPathParserService.getXPathFunctionDefinitions()).reduce((acc, functions) => {
      acc.push(...functions.map((f) => f.name));
      return acc;
    }, [] as string[]);
  }

  static getMonacoXPathLanguageMetadata() {
    monacoXPathLanguageMetadata.tokensProvider.actions = XPathParserService.getXPathFunctionNames();
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
    const relativePathExpr = XPathParserService.getNode(node, ['RelativePathExpr']);
    if (!relativePathExpr) return answer;
    const varName = XPathParserService.getNode(relativePathExpr, [
      'StepExpr',
      'FilterExpr',
      'VarRef',
      'QName',
      'NCName',
    ]);
    if (varName && 'image' in varName) {
      answer += '$' + varName.image;
    } else {
      const ncName =
        relativePathExpr &&
        XPathParserService.getNode(relativePathExpr, ['StepExpr', 'NodeTest', 'NameTest', 'NCName']);
      if (ncName && 'image' in ncName) answer += ncName.image;
    }
    const following =
      relativePathExpr && 'children' in relativePathExpr && relativePathExpr.children.ChildPathSegmentExpr;
    return following
      ? following.reduce((acc, value) => {
          acc += '/';
          const ncName = XPathParserService.getNode(value, ['StepExpr', 'NodeTest', 'NameTest', 'NCName']);
          if (ncName && 'image' in ncName) acc += ncName.image;
          return acc;
        }, answer)
      : answer;
  }

  static extractFieldPaths(expression: string) {
    const parsed = XPathParserService.parse(expression);
    const paths = XPathParserService.collectPathExpressions(parsed.cst);
    return paths.map((node) => XPathParserService.pathExprToString(node));
  }

  private static collectPathExpressions(node: CstNode) {
    const answer: CstNode[] = [];
    if (node.name === 'PathExpr') {
      answer.push(...XPathParserService.extractPathExprNode(node));
      return answer;
    }
    return Object.entries(node.children).reduce((acc, [key, value]) => {
      if (key === 'PathExpr') {
        acc.push(...XPathParserService.extractPathExprNode(value[0] as CstNode));
      } else {
        value.map((child) => {
          if ('children' in child) {
            acc.push(...XPathParserService.collectPathExpressions(child));
          }
        });
      }
      return acc;
    }, [] as CstNode[]);
  }

  private static extractPathExprNode(pathExprNode: CstNode) {
    // Extract arguments in FunctionCall
    const functionCall = XPathParserService.getNode(pathExprNode, [
      'RelativePathExpr',
      'StepExpr',
      'FilterExpr',
      'FunctionCall',
    ]);
    if (functionCall && 'children' in functionCall) {
      return functionCall.children.ExprSingle.flatMap((arg) =>
        'children' in arg ? XPathParserService.collectPathExpressions(arg) : [],
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
}
