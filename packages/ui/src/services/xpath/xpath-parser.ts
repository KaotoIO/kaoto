import type { CstNode, ILexingError, IRecognitionException } from 'chevrotain';

export interface XPathParserResult {
  cst: CstNode;
  lexErrors: ILexingError[];
  parseErrors: IRecognitionException[];
}

export interface XPathParser {
  parseXPath(xpath: string): XPathParserResult;
}
