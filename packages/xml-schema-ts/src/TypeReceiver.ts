import { XmlSchemaType } from './XmlSchemaType';

export interface TypeReceiver {
  setType(type: XmlSchemaType): void;
}
