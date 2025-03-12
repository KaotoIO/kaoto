import { XmlFormatter } from './xml-formatter';

describe('XmlFormatter', () => {
  it('formats XML with default EOL', () => {
    const xml = '<root><child></child></root>';
    const formattedXml = XmlFormatter.formatXml(xml);
    expect(formattedXml).toBe('<root>\n  <child>\n  </child>\n</root>');
  });

  it('formats XML with custom EOL', () => {
    XmlFormatter.setEOL('\r\n');
    const xml = '<root><child></child></root>';
    const formattedXml = XmlFormatter.formatXml(xml);
    expect(formattedXml).toBe('<root>\r\n  <child>\r\n  </child>\r\n</root>');
  });

  it('resets EOL to default', () => {
    XmlFormatter.setEOL();
    const xml = '<root><child></child></root>';
    const formattedXml = XmlFormatter.formatXml(xml);
    expect(formattedXml).toBe('<root>\n  <child>\n  </child>\n</root>');
  });

  it('formats XML with nested elements', () => {
    const xml = '<root><parent><child></child></parent></root>';
    const formattedXml = XmlFormatter.formatXml(xml);
    expect(formattedXml).toBe('<root>\n  <parent>\n    <child>\n    </child>\n  </parent>\n</root>');
  });

  it('formats XML with self-closing tags', () => {
    const xml = '<root><child/></root>';
    const formattedXml = XmlFormatter.formatXml(xml);
    expect(formattedXml).toBe('<root>\n  <child/>\n</root>');
  });
});
