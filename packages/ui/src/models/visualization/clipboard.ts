import { SourceSchemaType } from '../camel/source-schema-type';

export interface IClipboardCopyObject {
  type: SourceSchemaType;
  name: string;
  definition: object;
}
