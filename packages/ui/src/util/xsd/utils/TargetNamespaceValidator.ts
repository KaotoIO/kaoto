import { XmlSchema } from '..';

export interface TargetNamespaceValidator {
  validate(schema: XmlSchema): void;
}
