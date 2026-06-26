import type { CstNode, ILexingError, IRecognitionException, TokenType } from 'chevrotain';

import type { ExprNode } from './syntaxtree/xpath-syntaxtree-model';

/**
 * Result of parsing an XPath expression
 */
export interface XPathParserResult {
  cst: CstNode;
  lexErrors: ILexingError[];
  parseErrors: IRecognitionException[];
  exprNode?: ExprNode;
}

/**
 * Interface for XPath parsers
 */
export interface XPathParser {
  parseXPath(xpath: string): XPathParserResult;
  getAllTokens(): TokenType[];
}

/**
 * Categories of XPath functions.
 * Keys are used as identifiers, values as display names in the UI.
 */
export const FUNCTION_GROUPS = {
  String: 'String',
  SubstringMatching: 'Substring Matching',
  PatternMatching: 'Pattern Matching',
  Numeric: 'Numeric',
  DateAndTime: 'Date and Time',
  Boolean: 'Boolean',
  QName: 'QName',
  Node: 'Node',
  Sequence: 'Sequence',
  Context: 'Context',
  Math: 'Math',
  MapFunctions: 'Map',
  ArrayFunctions: 'Array',
  HigherOrder: 'Higher-Order',
  XSLT: 'XSLT',
} as const;

export type FunctionGroup = keyof typeof FUNCTION_GROUPS;

/**
 * Contains validation results for an XPath expression including parser results, errors, and warnings
 */
export class ValidatedXPathParseResult {
  dataMapperErrors: string[] = [];
  warnings: string[] = [];

  constructor(public parserResult?: XPathParserResult) {}

  /**
   * Checks if there are any errors (lexer, parser, or data mapper errors)
   * @returns true if any errors exist
   */
  hasErrors(): boolean {
    return (
      (this.parserResult && this.parserResult.lexErrors.length > 0) ||
      (this.parserResult && this.parserResult.parseErrors.length > 0) ||
      this.dataMapperErrors.length > 0
    );
  }

  /**
   * Gets all error messages from all sources (lexer, parser, and data mapper)
   * @returns array of error messages
   */
  getErrors(): string[] {
    const answer = [];
    if (this.parserResult) {
      answer.push(
        ...this.parserResult.lexErrors.map((e) => e.message),
        ...this.parserResult.parseErrors.map((e) => e.message),
      );
    }
    answer.push(...this.dataMapperErrors);
    return answer;
  }

  /**
   * Checks if there are any warnings
   * @returns true if any warnings exist
   */
  hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  /**
   * Gets all warning messages
   * @returns array of warning messages
   */
  getWarnings(): string[] {
    return this.warnings;
  }

  /**
   * Gets the expression node from the parser result
   * @returns the expression node if available
   */
  getExprNode(): ExprNode | undefined {
    return this.parserResult?.exprNode;
  }
}
