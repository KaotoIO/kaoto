/**
 * Class for the union of simpleType elements. Defines a simpleType element as a list of values of a specified
 * data type. Represents the World Wide Web Consortium (W3C) union element.
 */
import type { QName } from '../QName';
import type { XmlSchemaSimpleType } from './XmlSchemaSimpleType';
import { XmlSchemaSimpleTypeContent } from './XmlSchemaSimpleTypeContent';

export class XmlSchemaSimpleTypeUnion extends XmlSchemaSimpleTypeContent {
  private baseTypes: XmlSchemaSimpleType[] = [];
  private memberTypesSource: string | null = null;
  private memberTypesQNames: QName[] = [];

  getBaseTypes() {
    return this.baseTypes;
  }

  setMemberTypesSource(memberTypesSources: string) {
    this.memberTypesSource = memberTypesSources;
  }

  getMemberTypesSource() {
    return this.memberTypesSource;
  }

  getMemberTypesQNames() {
    return this.memberTypesQNames;
  }

  setMemberTypesQNames(memberTypesQNames: QName[]) {
    this.memberTypesQNames = memberTypesQNames;
  }
}
