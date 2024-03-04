import type { XmlSchema } from '../XmlSchema';
import type { XmlSchemaNamed } from './XmlSchemaNamed';
import { QName } from '../QName';

export abstract class XmlSchemaRefBase {
  protected parent: XmlSchema | null = null;
  protected targetQName: QName | null = null;
  private namedTwin?: XmlSchemaNamed;

  protected abstract forgetTargetObject(): void;

  setNamedObject(named: XmlSchemaNamed) {
    this.namedTwin = named;
  }

  getTargetQName() {
    return this.targetQName;
  }

  setTargetQName(targetQName: QName) {
    if (this.targetQName != null && this.namedTwin != null && !this.namedTwin.isAnonymous()) {
      throw new Error('It is invalid to set the ref= name for an item that has a name.');
    }
    /**
     * We could possibly complain about no ref and also no name.
     */
    this.targetQName = targetQName;
    this.forgetTargetObject();
  }
}
