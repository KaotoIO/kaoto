import { XPath2Parser } from './xpath-2.0-parser';
import { XPathParserResult } from './xpath-parser';

export class XPathParserService {
  static parser = new XPath2Parser();

  static parse(xpath: string): XPathParserResult {
    return XPathParserService.parser.parseXPath(xpath);
  }
}
