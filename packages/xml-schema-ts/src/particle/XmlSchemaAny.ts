/**
 * Enables any element from the specified namespace or namespaces to appear in the containing complexType
 * element. Represents the World Wide Web Consortium (W3C) any element.
 */
import type { XmlSchemaAllMember } from './XmlSchemaAllMember';
import type { XmlSchemaChoiceMember } from './XmlSchemaChoiceMember';
import type { XmlSchemaSequenceMember } from './XmlSchemaSequenceMember';
import { XmlSchemaContentProcessing } from '../XmlSchemaContentProcessing';
import { XmlSchemaParticle } from './XmlSchemaParticle';

export class XmlSchemaAny
  extends XmlSchemaParticle
  implements XmlSchemaChoiceMember, XmlSchemaSequenceMember, XmlSchemaAllMember
{
  /**
   * Namespaces containing the elements that can be used.
   */
  private namespace: string | null = null;
  private processContent: XmlSchemaContentProcessing = XmlSchemaContentProcessing.NONE;
  private targetNamespace: string | null = null;

  getNamespace() {
    return this.namespace;
  }

  setNamespace(namespace: string | null) {
    this.namespace = namespace;
  }

  getProcessContent() {
    return this.processContent;
  }

  setProcessContent(processContent: XmlSchemaContentProcessing) {
    this.processContent = processContent;
  }

  /**
   * {@link #getNamespace()} returns the namespace or set of namespaces
   * that this wildcard element is valid for.  The target namespaces may
   * include <code>##other</code>, <code>##targetNamespace</code>.  The
   * <code>##other</code> directive means any namespace other than the
   * schema's target namespace, while the <code>##targetNamespace</code>
   * directive means the element <i>must be</i> in the schema's target
   * namespace.  Resolving either of these requires knowledge of what
   * the schema's target namespace is, which is returned by this method.
   *
   * @return The wildcard element's target namespace.
   */
  getTargetNamespace() {
    return this.targetNamespace;
  }

  /**
   * Sets the schema's target namespace.
   *
   * @param namespace The schema's target namespace.
   *
   * @see #getTargetNamespace()
   */
  setTargetNamespace(namespace: string | null) {
    this.targetNamespace = namespace;
  }
}
