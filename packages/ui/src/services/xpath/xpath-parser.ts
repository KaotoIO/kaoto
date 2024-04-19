import type { CstNode, ILexingError, IRecognitionException } from 'chevrotain';

export interface XPathParserResult {
  cst: CstNode;
  lexErrors: ILexingError[];
  parseErrors: IRecognitionException[];
}

export interface XPathParser {
  parseXPath(xpath: string): XPathParserResult;
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
