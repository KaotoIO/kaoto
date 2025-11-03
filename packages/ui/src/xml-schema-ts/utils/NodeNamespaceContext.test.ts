import { JSDOM } from 'jsdom';
import { NULL_NS_URI, XML_NS_PREFIX, XML_NS_URI, XMLNS_ATTRIBUTE, XMLNS_ATTRIBUTE_NS_URI } from '../constants';
import { NodeNamespaceContext } from './NodeNamespaceContext';

describe('NodeNamespaceContext', () => {
  describe('getNamespaceContext', () => {
    it('should create namespace context from node with namespace declarations', () => {
      const xml = `
        <root xmlns:camel="http://camel.apache.org/schema/spring"
              xmlns:beans="http://www.springframework.org/schema/beans">
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const node = parser.window.document.documentElement;

      const context = NodeNamespaceContext.getNamespaceContext(node);

      expect(context).toBeInstanceOf(NodeNamespaceContext);
      expect(context.getNamespaceURI('camel')).toBe('http://camel.apache.org/schema/spring');
      expect(context.getNamespaceURI('beans')).toBe('http://www.springframework.org/schema/beans');
    });

    it('should collect namespace declarations from parent nodes', () => {
      const xml = `
        <root xmlns:parent="http://parent.example.com">
          <child xmlns:child="http://child.example.com">
            <grandchild />
          </child>
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const grandchild = parser.window.document.querySelector('grandchild');

      const context = NodeNamespaceContext.getNamespaceContext(grandchild!);

      expect(context.getNamespaceURI('parent')).toBe('http://parent.example.com');
      expect(context.getNamespaceURI('child')).toBe('http://child.example.com');
    });

    it('should handle default namespace declaration', () => {
      const xml = `<root xmlns="http://default.example.com"></root>`;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const node = parser.window.document.documentElement;

      const context = NodeNamespaceContext.getNamespaceContext(node);

      expect(context.getNamespaceURI('')).toBe('http://default.example.com');
    });

    it('should create context for node without namespace declarations', () => {
      const xml = `<root></root>`;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const node = parser.window.document.documentElement;

      const context = NodeNamespaceContext.getNamespaceContext(node);

      expect(context).toBeInstanceOf(NodeNamespaceContext);
      expect(context.getDeclaredPrefixes()).toEqual([]);
    });
  });

  describe('getDeclaredPrefixes', () => {
    it('should return all declared prefixes', () => {
      const xml = `
        <root xmlns:a="http://a.example.com"
              xmlns:b="http://b.example.com"
              xmlns:c="http://c.example.com">
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const node = parser.window.document.documentElement;

      const context = NodeNamespaceContext.getNamespaceContext(node);
      const prefixes = context.getDeclaredPrefixes();

      expect(prefixes).toContain('a');
      expect(prefixes).toContain('b');
      expect(prefixes).toContain('c');
      expect(prefixes.length).toBe(3);
    });

    it('should cache prefixes array on subsequent calls', () => {
      const xml = `<root xmlns:test="http://test.example.com"></root>`;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const node = parser.window.document.documentElement;

      const context = NodeNamespaceContext.getNamespaceContext(node);
      const prefixes1 = context.getDeclaredPrefixes();
      const prefixes2 = context.getDeclaredPrefixes();

      expect(prefixes1).toBe(prefixes2); // Same reference due to caching
    });

    it('should return empty array when no prefixes declared', () => {
      const xml = `<root></root>`;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const node = parser.window.document.documentElement;

      const context = NodeNamespaceContext.getNamespaceContext(node);

      expect(context.getDeclaredPrefixes()).toEqual([]);
    });

    it('should include default namespace prefix (empty string)', () => {
      const xml = `<root xmlns="http://default.example.com"></root>`;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const node = parser.window.document.documentElement;

      const context = NodeNamespaceContext.getNamespaceContext(node);
      const prefixes = context.getDeclaredPrefixes();

      expect(prefixes).toContain('');
    });
  });

  describe('getNamespaceURI', () => {
    it('should throw error when prefix is null', () => {
      const xml = `<root></root>`;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const node = parser.window.document.documentElement;
      const context = NodeNamespaceContext.getNamespaceContext(node);

      expect(() => context.getNamespaceURI(null as unknown as string)).toThrow('Prefix cannot be null');
    });

    it('should return XML_NS_URI for xml prefix', () => {
      const xml = `<root></root>`;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const node = parser.window.document.documentElement;
      const context = NodeNamespaceContext.getNamespaceContext(node);

      expect(context.getNamespaceURI(XML_NS_PREFIX)).toBe(XML_NS_URI);
    });

    it('should return XMLNS_ATTRIBUTE_NS_URI for xmlns prefix', () => {
      const xml = `<root></root>`;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const node = parser.window.document.documentElement;
      const context = NodeNamespaceContext.getNamespaceContext(node);

      expect(context.getNamespaceURI(XMLNS_ATTRIBUTE)).toBe(XMLNS_ATTRIBUTE_NS_URI);
    });

    it('should return declared namespace URI for custom prefix', () => {
      const xml = `<root xmlns:custom="http://custom.example.com"></root>`;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const node = parser.window.document.documentElement;
      const context = NodeNamespaceContext.getNamespaceContext(node);

      expect(context.getNamespaceURI('custom')).toBe('http://custom.example.com');
    });

    it('should return NULL_NS_URI for undeclared prefix', () => {
      const xml = `<root></root>`;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const node = parser.window.document.documentElement;
      const context = NodeNamespaceContext.getNamespaceContext(node);

      expect(context.getNamespaceURI('undeclared')).toBe(NULL_NS_URI);
    });

    it('should handle default namespace (empty string prefix)', () => {
      const xml = `<root xmlns="http://default.example.com"></root>`;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const node = parser.window.document.documentElement;
      const context = NodeNamespaceContext.getNamespaceContext(node);

      expect(context.getNamespaceURI('')).toBe('http://default.example.com');
    });
  });

  describe('getPrefix', () => {
    it('should throw error when namespace URI is null', () => {
      const xml = `<root></root>`;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const node = parser.window.document.documentElement;
      const context = NodeNamespaceContext.getNamespaceContext(node);

      expect(() => context.getPrefix(null as unknown as string)).toThrow('Namespace URI cannot be null');
    });

    it('should return XML_NS_PREFIX for XML_NS_URI', () => {
      const xml = `<root></root>`;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const node = parser.window.document.documentElement;
      const context = NodeNamespaceContext.getNamespaceContext(node);

      expect(context.getPrefix(XML_NS_URI)).toBe(XML_NS_PREFIX);
    });

    it('should return XMLNS_ATTRIBUTE for XMLNS_ATTRIBUTE_NS_URI', () => {
      const xml = `<root></root>`;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const node = parser.window.document.documentElement;
      const context = NodeNamespaceContext.getNamespaceContext(node);

      expect(context.getPrefix(XMLNS_ATTRIBUTE_NS_URI)).toBe(XMLNS_ATTRIBUTE);
    });

    it('should return prefix for declared namespace URI', () => {
      const xml = `<root xmlns:test="http://test.example.com"></root>`;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const node = parser.window.document.documentElement;
      const context = NodeNamespaceContext.getNamespaceContext(node);

      expect(context.getPrefix('http://test.example.com')).toBe('test');
    });

    it('should return empty string for undeclared namespace URI', () => {
      const xml = `<root></root>`;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const node = parser.window.document.documentElement;
      const context = NodeNamespaceContext.getNamespaceContext(node);

      expect(context.getPrefix('http://undeclared.example.com')).toBe('');
    });

    it('should return first matching prefix when multiple exist', () => {
      const xml = `
        <root xmlns:a="http://same.example.com"
              xmlns:b="http://same.example.com">
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const node = parser.window.document.documentElement;
      const context = NodeNamespaceContext.getNamespaceContext(node);

      const prefix = context.getPrefix('http://same.example.com');
      expect(['a', 'b']).toContain(prefix);
    });

    it('should return default namespace prefix (empty string)', () => {
      const xml = `<root xmlns="http://default.example.com"></root>`;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const node = parser.window.document.documentElement;
      const context = NodeNamespaceContext.getNamespaceContext(node);

      expect(context.getPrefix('http://default.example.com')).toBe('');
    });
  });

  describe('getPrefixes', () => {
    it('should throw error when namespace URI is null', () => {
      const xml = `<root></root>`;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const node = parser.window.document.documentElement;
      const context = NodeNamespaceContext.getNamespaceContext(node);

      expect(() => context.getPrefixes(null as unknown as string)).toThrow('Namespace URI cannot be null');
    });

    it('should return array with XML_NS_PREFIX for XML_NS_URI', () => {
      const xml = `<root></root>`;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const node = parser.window.document.documentElement;
      const context = NodeNamespaceContext.getNamespaceContext(node);

      expect(context.getPrefixes(XML_NS_URI)).toEqual([XML_NS_PREFIX]);
    });

    it('should return array with XMLNS_ATTRIBUTE for XMLNS_ATTRIBUTE_NS_URI', () => {
      const xml = `<root></root>`;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const node = parser.window.document.documentElement;
      const context = NodeNamespaceContext.getNamespaceContext(node);

      expect(context.getPrefixes(XMLNS_ATTRIBUTE_NS_URI)).toEqual([XMLNS_ATTRIBUTE]);
    });

    it('should return all prefixes for a given namespace URI', () => {
      const xml = `
        <root xmlns:a="http://same.example.com"
              xmlns:b="http://same.example.com"
              xmlns:c="http://same.example.com">
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const node = parser.window.document.documentElement;
      const context = NodeNamespaceContext.getNamespaceContext(node);

      const prefixes = context.getPrefixes('http://same.example.com');
      expect(prefixes).toContain('a');
      expect(prefixes).toContain('b');
      expect(prefixes).toContain('c');
      expect(prefixes.length).toBe(3);
    });

    it('should return empty array for undeclared namespace URI', () => {
      const xml = `<root></root>`;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const node = parser.window.document.documentElement;
      const context = NodeNamespaceContext.getNamespaceContext(node);

      expect(context.getPrefixes('http://undeclared.example.com')).toEqual([]);
    });

    it('should return single prefix for unique namespace URI', () => {
      const xml = `<root xmlns:unique="http://unique.example.com"></root>`;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const node = parser.window.document.documentElement;
      const context = NodeNamespaceContext.getNamespaceContext(node);

      expect(context.getPrefixes('http://unique.example.com')).toEqual(['unique']);
    });

    it('should include default namespace in results', () => {
      const xml = `
        <root xmlns="http://default.example.com"
              xmlns:ns="http://default.example.com">
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const node = parser.window.document.documentElement;
      const context = NodeNamespaceContext.getNamespaceContext(node);

      const prefixes = context.getPrefixes('http://default.example.com');
      expect(prefixes).toContain('');
      expect(prefixes).toContain('ns');
      expect(prefixes.length).toBe(2);
    });
  });

  describe('complex scenarios', () => {
    it('should handle nested elements with overridden namespace declarations', () => {
      const xml = `
        <root xmlns:ns="http://outer.example.com">
          <child xmlns:ns="http://inner.example.com">
            <grandchild />
          </child>
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const grandchild = parser.window.document.querySelector('grandchild');

      const context = NodeNamespaceContext.getNamespaceContext(grandchild!);

      // Inner declaration should override outer
      expect(context.getNamespaceURI('ns')).toBe('http://inner.example.com');
    });

    it('should handle Camel route with multiple namespace declarations', () => {
      const xml = `
        <routes xmlns="http://camel.apache.org/schema/spring"
                xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                xmlns:cxf="http://camel.apache.org/schema/cxf">
          <route id="myRoute">
            <from uri="direct:start"/>
            <to uri="cxf:bean:myEndpoint"/>
          </route>
        </routes>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const routeElement = parser.window.document.querySelector('route');

      const context = NodeNamespaceContext.getNamespaceContext(routeElement!);

      expect(context.getNamespaceURI('')).toBe('http://camel.apache.org/schema/spring');
      expect(context.getNamespaceURI('xsi')).toBe('http://www.w3.org/2001/XMLSchema-instance');
      expect(context.getNamespaceURI('cxf')).toBe('http://camel.apache.org/schema/cxf');
      expect(context.getDeclaredPrefixes().length).toBe(3);
    });

    it('should maintain correct context for deeply nested elements', () => {
      const xml = `
        <a xmlns:level1="http://level1.example.com">
          <b xmlns:level2="http://level2.example.com">
            <c xmlns:level3="http://level3.example.com">
              <d xmlns:level4="http://level4.example.com">
                <e />
              </d>
            </c>
          </b>
        </a>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const deepElement = parser.window.document.querySelector('e');

      const context = NodeNamespaceContext.getNamespaceContext(deepElement!);

      expect(context.getNamespaceURI('level1')).toBe('http://level1.example.com');
      expect(context.getNamespaceURI('level2')).toBe('http://level2.example.com');
      expect(context.getNamespaceURI('level3')).toBe('http://level3.example.com');
      expect(context.getNamespaceURI('level4')).toBe('http://level4.example.com');
      expect(context.getDeclaredPrefixes().length).toBe(4);
    });
  });
});
