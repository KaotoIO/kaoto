import { XmlFormatter } from './xml-formatter';

describe('XmlFormatter', () => {
  it.each([
    [undefined, '<root>\n  <child>\n  </child>\n</root>'],
    ['\r\n', '<root>\r\n  <child>\r\n  </child>\r\n</root>'],
    ['\n', '<root>\n  <child>\n  </child>\n</root>'],
  ])('formats XML with EOL %j', (eol, expected) => {
    if (eol !== undefined) {
      XmlFormatter.setEOL(eol);
    } else {
      XmlFormatter.setEOL();
    }
    const xml = '<root><child></child></root>';
    expect(XmlFormatter.formatXml(xml)).toBe(expected);
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
