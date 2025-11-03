import { XDOMUtil } from './XDOMUtil';
import { JSDOM } from 'jsdom';

describe('XDOMUtil', () => {
  describe('getNextSiblingElement', () => {
    it('should find next sibling element', () => {
      const xml = `
        <root>
          <first />
          <second />
          <third />
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const first = parser.window.document.querySelector('first')!;

      const next = XDOMUtil.getNextSiblingElement(first);

      expect(next?.tagName).toBe('second');
    });

    it('should skip text nodes and find next element', () => {
      const xml = `
        <root>
          <first />
          Some text content
          <second />
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const first = parser.window.document.querySelector('first')!;

      const next = XDOMUtil.getNextSiblingElement(first);

      expect(next?.tagName).toBe('second');
    });

    it('should skip comment nodes and find next element', () => {
      const xml = `
        <root>
          <first />
          <!-- This is a comment -->
          <second />
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const first = parser.window.document.querySelector('first')!;

      const next = XDOMUtil.getNextSiblingElement(first);

      expect(next?.tagName).toBe('second');
    });

    it('should return null when no next sibling element exists', () => {
      const xml = `
        <root>
          <first />
          <last />
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const last = parser.window.document.querySelector('last')!;

      const next = XDOMUtil.getNextSiblingElement(last);

      expect(next).toBeNull();
    });

    it('should return null when only text nodes follow', () => {
      const xml = `
        <root>
          <first />
          Some text
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const first = parser.window.document.querySelector('first')!;

      const next = XDOMUtil.getNextSiblingElement(first);

      expect(next).toBeNull();
    });

    it('should handle single element', () => {
      const xml = `<root><only /></root>`;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const only = parser.window.document.querySelector('only')!;

      const next = XDOMUtil.getNextSiblingElement(only);

      expect(next).toBeNull();
    });
  });

  describe('getFirstChildElementNS', () => {
    it('should find first child element with matching namespace and local name', () => {
      const xml = `
        <root xmlns:ns="http://example.com">
          <ns:first />
          <ns:second />
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const root = parser.window.document.documentElement;

      const child = XDOMUtil.getFirstChildElementNS(root, 'http://example.com', 'first');

      expect(child?.localName).toBe('first');
    });

    it('should find first child element with matching namespace when localpart is undefined', () => {
      const xml = `
        <root xmlns:ns="http://example.com">
          <other />
          <ns:target />
          <ns:another />
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const root = parser.window.document.documentElement;

      const child = XDOMUtil.getFirstChildElementNS(root, 'http://example.com');

      expect(child?.localName).toBe('target');
    });

    it('should return null when namespace does not match', () => {
      const xml = `
        <root xmlns:ns="http://example.com">
          <ns:child />
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const root = parser.window.document.documentElement;

      const child = XDOMUtil.getFirstChildElementNS(root, 'http://other.com', 'child');

      expect(child).toBeNull();
    });

    it('should return null when local name does not match', () => {
      const xml = `
        <root xmlns:ns="http://example.com">
          <ns:child />
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const root = parser.window.document.documentElement;

      const child = XDOMUtil.getFirstChildElementNS(root, 'http://example.com', 'other');

      expect(child).toBeNull();
    });

    it('should skip text nodes and find matching element', () => {
      const xml = `
        <root xmlns:ns="http://example.com">
          Text content
          <ns:target />
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const root = parser.window.document.documentElement;

      const child = XDOMUtil.getFirstChildElementNS(root, 'http://example.com', 'target');

      expect(child?.localName).toBe('target');
    });

    it('should return null when parent has no children', () => {
      const xml = `<root />`;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const root = parser.window.document.documentElement;

      const child = XDOMUtil.getFirstChildElementNS(root, 'http://example.com', 'child');

      expect(child).toBeNull();
    });

    it('should handle elements without namespace', () => {
      const xml = `
        <root>
          <child />
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const root = parser.window.document.documentElement;

      const child = XDOMUtil.getFirstChildElementNS(root, 'http://example.com', 'child');

      expect(child).toBeNull();
    });
  });

  describe('getNextSiblingElementByNamesNS', () => {
    it('should find next sibling matching one of the provided names', () => {
      const xml = `
        <root xmlns:a="http://a.com" xmlns:b="http://b.com">
          <start />
          <a:target />
          <b:other />
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const start = parser.window.document.querySelector('start')!;

      const next = XDOMUtil.getNextSiblingElementByNamesNS(start, [
        ['http://a.com', 'target'],
        ['http://b.com', 'other'],
      ]);

      expect(next?.localName).toBe('target');
    });

    it('should find second matching name when first does not match', () => {
      const xml = `
        <root xmlns:a="http://a.com" xmlns:b="http://b.com">
          <start />
          <b:target />
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const start = parser.window.document.querySelector('start')!;

      const next = XDOMUtil.getNextSiblingElementByNamesNS(start, [
        ['http://a.com', 'other'],
        ['http://b.com', 'target'],
      ]);

      expect(next?.localName).toBe('target');
    });

    it('should skip non-matching siblings', () => {
      const xml = `
        <root xmlns:a="http://a.com" xmlns:b="http://b.com">
          <start />
          <other />
          <another />
          <a:target />
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const start = parser.window.document.querySelector('start')!;

      const next = XDOMUtil.getNextSiblingElementByNamesNS(start, [['http://a.com', 'target']]);

      expect(next?.localName).toBe('target');
    });

    it('should return null when no matching sibling found', () => {
      const xml = `
        <root xmlns:a="http://a.com">
          <start />
          <other />
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const start = parser.window.document.querySelector('start')!;

      const next = XDOMUtil.getNextSiblingElementByNamesNS(start, [['http://a.com', 'target']]);

      expect(next).toBeNull();
    });

    it('should handle empty names array', () => {
      const xml = `
        <root>
          <start />
          <other />
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const start = parser.window.document.querySelector('start')!;

      const next = XDOMUtil.getNextSiblingElementByNamesNS(start, []);

      expect(next).toBeNull();
    });

    it('should skip text and comment nodes', () => {
      const xml = `
        <root xmlns:a="http://a.com">
          <start />
          Text content
          <!-- Comment -->
          <a:target />
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const start = parser.window.document.querySelector('start')!;

      const next = XDOMUtil.getNextSiblingElementByNamesNS(start, [['http://a.com', 'target']]);

      expect(next?.localName).toBe('target');
    });
  });

  describe('getNextSiblingElementNS', () => {
    it('should find next sibling with matching namespace and local name', () => {
      const xml = `
        <root xmlns:ns="http://example.com">
          <start />
          <ns:target />
          <ns:other />
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const start = parser.window.document.querySelector('start')!;

      const next = XDOMUtil.getNextSiblingElementNS(start, 'http://example.com', 'target');

      expect(next?.localName).toBe('target');
    });

    it('should find next sibling with matching namespace when localpart is undefined', () => {
      const xml = `
        <root xmlns:ns="http://example.com">
          <start />
          <other />
          <ns:target />
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const start = parser.window.document.querySelector('start')!;

      const next = XDOMUtil.getNextSiblingElementNS(start, 'http://example.com');

      expect(next?.localName).toBe('target');
    });

    it('should skip non-matching siblings', () => {
      const xml = `
        <root xmlns:ns="http://example.com">
          <start />
          <other />
          <another />
          <ns:target />
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const start = parser.window.document.querySelector('start')!;

      const next = XDOMUtil.getNextSiblingElementNS(start, 'http://example.com', 'target');

      expect(next?.localName).toBe('target');
    });

    it('should return null when namespace does not match', () => {
      const xml = `
        <root xmlns:ns="http://example.com">
          <start />
          <ns:target />
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const start = parser.window.document.querySelector('start')!;

      const next = XDOMUtil.getNextSiblingElementNS(start, 'http://other.com', 'target');

      expect(next).toBeNull();
    });

    it('should return null when local name does not match', () => {
      const xml = `
        <root xmlns:ns="http://example.com">
          <start />
          <ns:other />
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const start = parser.window.document.querySelector('start')!;

      const next = XDOMUtil.getNextSiblingElementNS(start, 'http://example.com', 'target');

      expect(next).toBeNull();
    });

    it('should skip text and comment nodes', () => {
      const xml = `
        <root xmlns:ns="http://example.com">
          <start />
          Text content
          <!-- Comment -->
          <ns:target />
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const start = parser.window.document.querySelector('start')!;

      const next = XDOMUtil.getNextSiblingElementNS(start, 'http://example.com', 'target');

      expect(next?.localName).toBe('target');
    });

    it('should return null when no next sibling exists', () => {
      const xml = `
        <root xmlns:ns="http://example.com">
          <ns:last />
        </root>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const last = parser.window.document.querySelector('last')!;

      const next = XDOMUtil.getNextSiblingElementNS(last, 'http://example.com', 'target');

      expect(next).toBeNull();
    });

    it('should handle Camel route elements', () => {
      const xml = `
        <routes xmlns="http://camel.apache.org/schema/spring">
          <route id="route1">
            <from uri="direct:start"/>
            <to uri="log:info"/>
            <to uri="mock:result"/>
          </route>
        </routes>
      `;
      const parser = new JSDOM(xml, { contentType: 'text/xml' });
      const from = parser.window.document.querySelector('from')!;

      const next = XDOMUtil.getNextSiblingElementNS(from, 'http://camel.apache.org/schema/spring', 'to');

      expect(next?.localName).toBe('to');
      expect(next?.getAttribute('uri')).toBe('log:info');
    });
  });
});
