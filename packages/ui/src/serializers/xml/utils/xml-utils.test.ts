import { ICamelProcessorProperty } from '../../../models';
import { collectNamespaces, escapeXml, extractAttributesFromXmlElement, setNamespaces, unescapeXml } from './xml-utils';

const parseElement = (xml: string, tagName: string) =>
  new DOMParser().parseFromString(xml, 'application/xml').getElementsByTagName(tagName)[0];

describe('xml-utils', () => {
  describe('extractAttributesFromXmlElement', () => {
    const element = parseElement('<to id="to-1" uri="log:out" unknown="x"/>', 'to');

    it('takes every attribute without known properties', () => {
      expect(extractAttributesFromXmlElement(element)).toEqual({ id: 'to-1', uri: 'log:out', unknown: 'x' });
    });

    it('takes only the attributes of known properties', () => {
      const properties = { id: {}, uri: {} } as unknown as Record<string, ICamelProcessorProperty>;

      expect(extractAttributesFromXmlElement(element, properties)).toEqual({ id: 'to-1', uri: 'log:out' });
    });
  });

  describe('collectNamespaces', () => {
    it('collects the namespaces of the element and its parents, without the Camel defaults', () => {
      const element = parseElement(
        `<camel xmlns="http://camel.apache.org/schema/spring" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:foo="urn:foo">
  <route><setBody xmlns:bar="urn:bar" id="set-body"><xpath>/foo:a/bar:b</xpath></setBody></route>
</camel>`,
        'setBody',
      );

      expect(collectNamespaces(element)).toEqual([
        { key: 'foo', value: 'urn:foo' },
        { key: 'bar', value: 'urn:bar' },
      ]);
    });
  });

  describe('setNamespaces', () => {
    it('declares every namespace on the element', () => {
      const element = parseElement('<xpath/>', 'xpath');

      setNamespaces(element, [
        { key: 'foo', value: 'urn:foo' },
        { key: 'bar', value: 'urn:bar' },
      ]);

      expect(element.getAttribute('xmlns:foo')).toBe('urn:foo');
      expect(element.getAttribute('xmlns:bar')).toBe('urn:bar');
    });
  });

  describe('escapeXml and unescapeXml', () => {
    const text = `<a href="x">Tom & Jerry's</a>`;
    const escaped = '&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&apos;s&lt;/a&gt;';

    it('escapes the five XML characters', () => {
      expect(escapeXml(text)).toBe(escaped);
    });

    it('turns escaped text back into the original', () => {
      expect(unescapeXml(escaped)).toBe(text);
    });

    it('unescapes an escaped ampersand entity only once', () => {
      expect(unescapeXml('&amp;lt;')).toBe('&lt;');
    });
  });
});
