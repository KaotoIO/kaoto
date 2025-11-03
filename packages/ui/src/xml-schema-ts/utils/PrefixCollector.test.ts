import { JSDOM } from 'jsdom';
import { DEFAULT_NS_PREFIX } from '../constants';
import { PrefixCollector } from './PrefixCollector';

describe('PrefixCollector', () => {
  describe('searchLocalPrefixDeclarations', () => {
    it('should find namespace declarations on element node', () => {
      const xml = `
        <root xmlns:camel="http://camel.apache.org/schema/spring"
              xmlns:beans="http://www.springframework.org/schema/beans">
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const node = parser.window.document.documentElement;

      const declarations: Record<string, string> = {};
      PrefixCollector.searchLocalPrefixDeclarations(node, (prefix, uri) => {
        declarations[prefix] = uri;
      });

      expect(declarations['camel']).toBe('http://camel.apache.org/schema/spring');
      expect(declarations['beans']).toBe('http://www.springframework.org/schema/beans');
    });

    it('should find default namespace declaration', () => {
      const xml = `<root xmlns="http://default.example.com"></root>`;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const node = parser.window.document.documentElement;

      const declarations: Record<string, string> = {};
      PrefixCollector.searchLocalPrefixDeclarations(node, (prefix, uri) => {
        declarations[prefix] = uri;
      });

      expect(declarations[DEFAULT_NS_PREFIX]).toBe('http://default.example.com');
    });

    it('should handle mixed namespace declarations including default', () => {
      const xml = `
        <root xmlns="http://default.example.com"
              xmlns:custom="http://custom.example.com">
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const node = parser.window.document.documentElement;

      const declarations: Record<string, string> = {};
      PrefixCollector.searchLocalPrefixDeclarations(node, (prefix, uri) => {
        declarations[prefix] = uri;
      });

      expect(declarations[DEFAULT_NS_PREFIX]).toBe('http://default.example.com');
      expect(declarations['custom']).toBe('http://custom.example.com');
    });

    it('should not find declarations from parent nodes', () => {
      const xml = `
        <root xmlns:parent="http://parent.example.com">
          <child xmlns:child="http://child.example.com">
          </child>
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const child = parser.window.document.querySelector('child');

      const declarations: Record<string, string> = {};
      PrefixCollector.searchLocalPrefixDeclarations(child!, (prefix, uri) => {
        declarations[prefix] = uri;
      });

      expect(declarations['child']).toBe('http://child.example.com');
      expect(declarations['parent']).toBeUndefined();
    });

    it('should not find declarations from child nodes', () => {
      const xml = `
        <root xmlns:root="http://root.example.com">
          <child xmlns:child="http://child.example.com">
          </child>
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const root = parser.window.document.documentElement;

      const declarations: Record<string, string> = {};
      PrefixCollector.searchLocalPrefixDeclarations(root, (prefix, uri) => {
        declarations[prefix] = uri;
      });

      expect(declarations['root']).toBe('http://root.example.com');
      expect(declarations['child']).toBeUndefined();
    });

    it('should handle element with no namespace declarations', () => {
      const xml = `<root></root>`;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const node = parser.window.document.documentElement;

      const declarations: Record<string, string> = {};
      PrefixCollector.searchLocalPrefixDeclarations(node, (prefix, uri) => {
        declarations[prefix] = uri;
      });

      expect(Object.keys(declarations)).toHaveLength(0);
    });

    it('should handle document node', () => {
      const xml = `
        <root xmlns:test="http://test.example.com">
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const doc = parser.window.document;

      const declarations: Record<string, string> = {};
      PrefixCollector.searchLocalPrefixDeclarations(doc, (prefix, uri) => {
        declarations[prefix] = uri;
      });

      // Document nodes don't have attributes in the same way
      expect(Object.keys(declarations)).toHaveLength(0);
    });

    it('should handle text node (should not process)', () => {
      const xml = `<root xmlns:test="http://test.example.com">text content</root>`;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const textNode = parser.window.document.documentElement.firstChild!;

      const declarations: Record<string, string> = {};
      PrefixCollector.searchLocalPrefixDeclarations(textNode, (prefix, uri) => {
        declarations[prefix] = uri;
      });

      expect(Object.keys(declarations)).toHaveLength(0);
    });

    it('should only collect xmlns namespace attributes', () => {
      const xml = `
        <root xmlns:ns="http://ns.example.com"
              id="test-id"
              class="test-class">
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const node = parser.window.document.documentElement;

      const declarations: Record<string, string> = {};
      PrefixCollector.searchLocalPrefixDeclarations(node, (prefix, uri) => {
        declarations[prefix] = uri;
      });

      expect(declarations['ns']).toBe('http://ns.example.com');
      expect(Object.keys(declarations)).toHaveLength(1);
    });
  });

  describe('searchAllPrefixDeclarations', () => {
    it('should find declarations from node and all ancestors', () => {
      const xml = `
        <root xmlns:level1="http://level1.example.com">
          <child xmlns:level2="http://level2.example.com">
            <grandchild xmlns:level3="http://level3.example.com">
            </grandchild>
          </child>
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const grandchild = parser.window.document.querySelector('grandchild');

      const declarations: Record<string, string> = {};
      PrefixCollector.searchAllPrefixDeclarations(grandchild!, (prefix, uri) => {
        declarations[prefix] = uri;
      });

      expect(declarations['level1']).toBe('http://level1.example.com');
      expect(declarations['level2']).toBe('http://level2.example.com');
      expect(declarations['level3']).toBe('http://level3.example.com');
    });

    it('should handle overridden namespace declarations (child overrides parent)', () => {
      const xml = `
        <root xmlns:ns="http://outer.example.com">
          <child xmlns:ns="http://inner.example.com">
            <grandchild />
          </child>
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const grandchild = parser.window.document.querySelector('grandchild');

      const declarations: Record<string, string> = {};
      PrefixCollector.searchAllPrefixDeclarations(grandchild!, (prefix, uri) => {
        declarations[prefix] = uri;
      });

      // Inner declaration comes after outer, so it should override
      expect(declarations['ns']).toBe('http://inner.example.com');
    });

    it('should collect declarations in parent-to-child order', () => {
      const xml = `
        <root xmlns:a="http://a1.example.com">
          <child xmlns:a="http://a2.example.com">
            <grandchild />
          </child>
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const grandchild = parser.window.document.querySelector('grandchild');

      const declarationOrder: string[] = [];
      PrefixCollector.searchAllPrefixDeclarations(grandchild!, (_prefix, uri) => {
        declarationOrder.push(uri);
      });

      expect(declarationOrder[0]).toBe('http://a1.example.com');
      expect(declarationOrder[1]).toBe('http://a2.example.com');
    });

    it('should handle root element', () => {
      const xml = `<root xmlns:test="http://test.example.com"></root>`;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const root = parser.window.document.documentElement;

      const declarations: Record<string, string> = {};
      PrefixCollector.searchAllPrefixDeclarations(root, (prefix, uri) => {
        declarations[prefix] = uri;
      });

      expect(declarations['test']).toBe('http://test.example.com');
    });

    it('should handle deeply nested elements', () => {
      const xml = `
        <a xmlns:a="http://a.example.com">
          <b xmlns:b="http://b.example.com">
            <c xmlns:c="http://c.example.com">
              <d xmlns:d="http://d.example.com">
                <e xmlns:e="http://e.example.com">
                </e>
              </d>
            </c>
          </b>
        </a>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const deepElement = parser.window.document.querySelector('e');

      const declarations: Record<string, string> = {};
      PrefixCollector.searchAllPrefixDeclarations(deepElement!, (prefix, uri) => {
        declarations[prefix] = uri;
      });

      expect(declarations['a']).toBe('http://a.example.com');
      expect(declarations['b']).toBe('http://b.example.com');
      expect(declarations['c']).toBe('http://c.example.com');
      expect(declarations['d']).toBe('http://d.example.com');
      expect(declarations['e']).toBe('http://e.example.com');
    });

    it('should handle mixed default and prefixed namespaces', () => {
      const xml = `
        <root xmlns="http://default.example.com" xmlns:custom="http://custom.example.com">
          <child xmlns:child="http://child.example.com">
          </child>
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const child = parser.window.document.querySelector('child');

      const declarations: Record<string, string> = {};
      PrefixCollector.searchAllPrefixDeclarations(child!, (prefix, uri) => {
        declarations[prefix] = uri;
      });

      expect(declarations[DEFAULT_NS_PREFIX]).toBe('http://default.example.com');
      expect(declarations['custom']).toBe('http://custom.example.com');
      expect(declarations['child']).toBe('http://child.example.com');
    });

    it('should handle Camel integration with multiple namespace levels', () => {
      const xml = `
        <routes xmlns="http://camel.apache.org/schema/spring"
                xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
          <route id="myRoute">
            <from uri="direct:start"/>
            <to uri="log:info"/>
          </route>
        </routes>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const toElement = parser.window.document.querySelector('to');

      const declarations: Record<string, string> = {};
      PrefixCollector.searchAllPrefixDeclarations(toElement!, (prefix, uri) => {
        declarations[prefix] = uri;
      });

      expect(declarations[DEFAULT_NS_PREFIX]).toBe('http://camel.apache.org/schema/spring');
      expect(declarations['xsi']).toBe('http://www.w3.org/2001/XMLSchema-instance');
    });

    it('should handle element with no ancestors having namespace declarations', () => {
      const xml = `<root><child><grandchild /></child></root>`;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const grandchild = parser.window.document.querySelector('grandchild');

      const declarations: Record<string, string> = {};
      PrefixCollector.searchAllPrefixDeclarations(grandchild!, (prefix, uri) => {
        declarations[prefix] = uri;
      });

      expect(Object.keys(declarations)).toHaveLength(0);
    });
  });
});
