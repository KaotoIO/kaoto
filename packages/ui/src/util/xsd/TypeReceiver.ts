import { XmlSchemaType } from '.';

export interface TypeReceiver {
  setType(type: XmlSchemaType): void;
}
