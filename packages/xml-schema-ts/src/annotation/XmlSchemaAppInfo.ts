import { XmlSchemaAnnotationItem } from './XmlSchemaAnnotationItem';

export class XmlSchemaAppInfo extends XmlSchemaAnnotationItem {
  /**
   * Provides the source of the application information.
   */
  source: string | null = null;

  /**
   * Returns an array of XmlNode that represents the document text markup.
   */
  markup: NodeList | null = null;

  public getSource() {
    return this.source;
  }

  public setSource(source: string | null) {
    this.source = source;
  }

  public getMarkup() {
    return this.markup;
  }

  public setMarkup(markup: NodeList | null) {
    this.markup = markup;
  }
}
