import { MaxOccursType } from '../constants';
import { XmlSchemaAnnotated } from '../XmlSchemaAnnotated';

const NON_NEGATIVE_INTEGER = /^(?:\+?\d+|-0+)$/;

const XML_WHITESPACE = new Set([' ', '\t', '\n', '\r']);

function trimXmlWhitespace(value: string): string {
  let start = 0;
  let end = value.length;
  while (start < end && XML_WHITESPACE.has(value[start])) start++;
  while (end > start && XML_WHITESPACE.has(value[end - 1])) end--;
  return value.slice(start, end);
}

export abstract class XmlSchemaParticle extends XmlSchemaAnnotated {
  static readonly DEFAULT_MAX_OCCURS = 1;
  static readonly DEFAULT_MIN_OCCURS = 1;

  /**
   * Parses a `maxOccurs` attribute value. Only the XML Schema lexical forms are accepted: `unbounded` or an
   * `xs:nonNegativeInteger` (surrounding XML whitespace, a leading `+`, leading zeros and `-0` allowed). Other
   * characters such as a no-break space are not whitespace in XML Schema and make the value malformed.
   * The schema parser and the schema analysis share this parser, so a value it rejects is both left at the
   * default and reported as a warning.
   * @param value - The raw attribute value
   * @returns The parsed value, or `null` when the value is not a valid `maxOccurs`
   */
  static parseMaxOccurs(value: string): MaxOccursType | null {
    if (trimXmlWhitespace(value) === 'unbounded') {
      return 'unbounded';
    }
    return XmlSchemaParticle.parseMinOccurs(value);
  }

  /**
   * Parses a `minOccurs` attribute value. Only the `xs:nonNegativeInteger` lexical form is accepted
   * (surrounding XML whitespace, a leading `+`, leading zeros and `-0` allowed).
   * @param value - The raw attribute value
   * @returns The parsed value, or `null` when the value is not a valid `minOccurs`
   */
  static parseMinOccurs(value: string): number | null {
    const trimmed = trimXmlWhitespace(value);
    if (!NON_NEGATIVE_INTEGER.test(trimmed)) {
      return null;
    }
    return trimmed.startsWith('-') ? 0 : Number.parseInt(trimmed, 10);
  }

  private maxOccurs: MaxOccursType = XmlSchemaParticle.DEFAULT_MAX_OCCURS;
  private maxOccursExplicit = false;
  private minOccurs: number = XmlSchemaParticle.DEFAULT_MIN_OCCURS;
  private minOccursExplicit = false;

  setMaxOccurs(maxOccurs: MaxOccursType) {
    this.maxOccurs = maxOccurs;
    this.maxOccursExplicit = true;
  }

  getMaxOccurs(): MaxOccursType {
    return this.maxOccurs;
  }

  isMaxOccursExplicit(): boolean {
    return this.maxOccursExplicit;
  }

  setMinOccurs(minOccurs: number) {
    this.minOccurs = minOccurs;
    this.minOccursExplicit = true;
  }

  getMinOccurs(): number {
    return this.minOccurs;
  }

  isMinOccursExplicit(): boolean {
    return this.minOccursExplicit;
  }
}
