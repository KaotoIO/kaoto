import { XmlSchemaAnnotationItem } from './XmlSchemaAnnotationItem';

export class XmlSchemaDocumentation extends XmlSchemaAnnotationItem {
  /**
   * Provides the source of the application information.
   */
  source: string | null = null;
  language: string | null = null;

  /**
   * Returns an array of XmlNode that represents the document text markup.
   */
  markup: NodeList | null = null;

  getSource() {
    return this.source;
  }

  setSource(source: string | null) {
    this.source = source;
  }

  getMarkup() {
    return this.markup;
  }

  setMarkup(markup: NodeList) {
    this.markup = markup;
  }

  getLanguage() {
    return this.language;
  }

  setLanguage(language: string | null) {
    this.language = language;
  }
}
