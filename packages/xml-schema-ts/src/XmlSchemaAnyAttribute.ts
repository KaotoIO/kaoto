import { XmlSchemaAnnotated } from './XmlSchemaAnnotated';
import { XmlSchemaContentProcessing } from './XmlSchemaContentProcessing';

/**
 * Enables any attribute from the specified namespace or namespaces to appear in the containing complexType
 * element. Represents the World Wide Web Consortium (W3C) anyAttribute element.
 */
export class XmlSchemaAnyAttribute extends XmlSchemaAnnotated {
  namespace: string | null = null;
  processContent: XmlSchemaContentProcessing = XmlSchemaContentProcessing.NONE;

  getNamespace() {
    return this.namespace;
  }

  setNamespace(namespace: string) {
    this.namespace = namespace;
  }

  getProcessContent() {
    return this.processContent;
  }

  setProcessContent(processContent: XmlSchemaContentProcessing) {
    this.processContent = processContent;
  }
}
