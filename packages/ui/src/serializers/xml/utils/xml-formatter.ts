export class XmlFormatter {
  private static EOL = '\n';
  private static readonly PADDING = ' '.repeat(2);
  private static readonly OPEN_TAG_PATTERN = /^<\w[^>]*[^/]>.*$/;
  private static readonly END_TAG_PATTERN = /^<\/\w/;
  private static readonly XML_TAG_PATTERN = /(>)(<)(\/*)/g;

  static setEOL(eol = '\n'): void {
    this.EOL = eol;
  }

  static formatXml(xml: string): string {
    let pad = 0;

    // Use the configured EOL value
    xml = xml.replace(this.XML_TAG_PATTERN, '$1' + this.EOL + '$2$3');

    return xml
      .split(this.EOL)
      .map((node) => {
        let indent = 0;

        if (this.END_TAG_PATTERN.exec(node) && pad > 0) {
          pad -= 1;
        } else if (this.OPEN_TAG_PATTERN.exec(node)) {
          indent = 1;
        }
        pad += indent;

        return this.PADDING.repeat(pad - indent) + node;
      })
      .join(this.EOL);
  }
}
