import { XPath2Parser } from './2.0/xpath-2.0-parser';
import { FunctionGroup, XPathParserResult } from './xpath-parser';
import { IFunctionDefinition } from '../../models';
import { XPATH_2_0_FUNCTIONS } from './2.0/xpath-2.0-functions';

export class XPathParserService {
  static parser = new XPath2Parser();
  static functions = XPATH_2_0_FUNCTIONS;

  static parse(xpath: string): XPathParserResult {
    return XPathParserService.parser.parseXPath(xpath);
  }

  static getXPathFunctionDefinitions(): Record<FunctionGroup, IFunctionDefinition[]> {
    return XPathParserService.functions;
  }
}
