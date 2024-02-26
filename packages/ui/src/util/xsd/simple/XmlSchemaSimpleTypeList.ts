import type { QName } from '../QName';
import type { XmlSchemaSimpleType } from './XmlSchemaSimpleType';

import { XmlSchemaSimpleTypeContent } from './XmlSchemaSimpleTypeContent';

export class XmlSchemaSimpleTypeList extends XmlSchemaSimpleTypeContent {
  itemType?: XmlSchemaSimpleType;
  itemTypeName?: QName;

  getItemType() {
    return this.itemType;
  }

  setItemType(itemType: XmlSchemaSimpleType) {
    this.itemType = itemType;
  }

  getItemTypeName() {
    return this.itemTypeName;
  }

  setItemTypeName(itemTypeName: QName) {
    this.itemTypeName = itemTypeName;
  }
}
