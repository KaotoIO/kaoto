import type { XmlSchema } from '../XmlSchema';
import { XmlSchemaAnnotated } from '../XmlSchemaAnnotated';

export abstract class XmlSchemaExternal extends XmlSchemaAnnotated {
  schema: XmlSchema | null = null;
  schemaLocation: string | null = null;

  /**
   * Creates new XmlSchemaExternal
   */
  protected constructor(parent: XmlSchema) {
    super();
    const fParent = parent;
    fParent.getExternals().push(this);
    fParent.getItems().push(this);
  }

  public getSchema() {
    return this.schema;
  }

  /**
   * Store a reference to an XmlSchema corresponding to this item. This only
   * case in which this will be read is if you ask the XmlSchemaSerializer
   * to serialize external schemas.
   * @param sc schema reference
   */
  public setSchema(sc: XmlSchema) {
    this.schema = sc;
  }

  public getSchemaLocation() {
    return this.schemaLocation;
  }

  public setSchemaLocation(schemaLocation: string) {
    this.schemaLocation = schemaLocation;
  }
}
