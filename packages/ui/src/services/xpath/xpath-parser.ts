import type { CstNode, ILexingError, IRecognitionException, TokenType } from 'chevrotain';

export interface XPathParserResult {
  cst: CstNode;
  lexErrors: ILexingError[];
  parseErrors: IRecognitionException[];
}

export interface XPathParser {
  parseXPath(xpath: string): XPathParserResult;
  getAllTokens(): TokenType[];
}

export enum FunctionGroup {
  String = 'String',
  SubstringMatching = 'Substring Matching',
  PatternMatching = 'Pattern Matching',
  Numeric = 'Numeric',
  DateAndTime = 'Date and Time',
  Boolean = 'Boolean',
  QName = 'QName',
  Node = 'Node',
  Sequence = 'Sequence',
  Context = 'Context',
}
