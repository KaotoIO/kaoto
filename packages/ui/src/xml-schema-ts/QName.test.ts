import { QName } from './QName';

describe('QName', () => {
  describe('constructor', () => {
    it('should create QName with namespace, localPart, and prefix', () => {
      const qname = new QName('http://example.com', 'element', 'ex');

      expect(qname.getNamespaceURI()).toBe('http://example.com');
      expect(qname.getLocalPart()).toBe('element');
      expect(qname.getPrefix()).toBe('ex');
    });

    it('should create QName with namespace and localPart without prefix', () => {
      const qname = new QName('http://example.com', 'element');

      expect(qname.getNamespaceURI()).toBe('http://example.com');
      expect(qname.getLocalPart()).toBe('element');
      expect(qname.getPrefix()).toBeNull();
    });

    it('should create QName with null namespace', () => {
      const qname = new QName(null, 'element');

      expect(qname.getNamespaceURI()).toBe('');
      expect(qname.getLocalPart()).toBe('element');
    });

    it('should create QName with empty string namespace', () => {
      const qname = new QName('', 'element');

      expect(qname.getNamespaceURI()).toBe('');
      expect(qname.getLocalPart()).toBe('element');
    });

    it('should create QName with null localPart', () => {
      const qname = new QName('http://example.com', null);

      expect(qname.getNamespaceURI()).toBe('http://example.com');
      expect(qname.getLocalPart()).toBeNull();
    });

    it('should create QName with all null parameters', () => {
      const qname = new QName(null, null, null);

      expect(qname.getNamespaceURI()).toBe('');
      expect(qname.getLocalPart()).toBeNull();
      expect(qname.getPrefix()).toBeNull();
    });
  });

  describe('fromString', () => {
    describe('success cases', () => {
      it.each([
        ['empty string', '', '', '', null],
        ['plain localPart without namespace', 'element', '', 'element', null],
        ['empty namespace format', '{}element', '', 'element', null],
        ['full QName format with namespace', '{http://example.com}element', 'http://example.com', 'element', null],
      ])('should create QName from %s', (_desc, input, expectedNs, expectedLocal, expectedPrefix) => {
        const qname = QName.fromString(input);

        expect(qname.getNamespaceURI()).toBe(expectedNs);
        expect(qname.getLocalPart()).toBe(expectedLocal);
        expect(qname.getPrefix()).toBe(expectedPrefix);
      });

      it('should create QName with complex namespace URI', () => {
        const qname = QName.fromString('{http://www.w3.org/2001/XMLSchema}string');

        expect(qname.getNamespaceURI()).toBe('http://www.w3.org/2001/XMLSchema');
        expect(qname.getLocalPart()).toBe('string');
      });

      it('should create QName with URN namespace', () => {
        const qname = QName.fromString('{urn:example:schema}element');

        expect(qname.getNamespaceURI()).toBe('urn:example:schema');
        expect(qname.getLocalPart()).toBe('element');
      });

      it('should create QName with empty localPart after closing bracket', () => {
        const qname = QName.fromString('{http://example.com}');

        expect(qname.getNamespaceURI()).toBe('http://example.com');
        expect(qname.getLocalPart()).toBe('');
      });

      it('should create QName with localPart containing special characters', () => {
        const qname = QName.fromString('{http://example.com}my-element_123');

        expect(qname.getNamespaceURI()).toBe('http://example.com');
        expect(qname.getLocalPart()).toBe('my-element_123');
      });

      it('should create QName from just opening and closing brackets', () => {
        const qname = QName.fromString('{}');

        expect(qname.getNamespaceURI()).toBe('');
        expect(qname.getLocalPart()).toBe('');
      });
    });

    describe('error cases', () => {
      it('should throw error for null input', () => {
        expect(() => QName.fromString(null as unknown as string)).toThrow('cannot create QName from null');
      });

      it('should throw error for undefined input', () => {
        expect(() => QName.fromString(undefined as unknown as string)).toThrow('cannot create QName from null');
      });

      it('should throw error for missing closing bracket', () => {
        expect(() => QName.fromString('{http://example.com')).toThrow(
          'cannot create QName from {http://example.com, missing closing "}"',
        );
      });

      it('should throw error for missing closing bracket with element name', () => {
        expect(() => QName.fromString('{http://example.com element')).toThrow(
          'cannot create QName from {http://example.com element, missing closing "}"',
        );
      });
    });
  });

  describe('valueOf', () => {
    it.each([
      ['plain localPart', 'element', '', 'element'],
      ['full QName format', '{http://example.com}element', 'http://example.com', 'element'],
      ['empty namespace format', '{}element', '', 'element'],
      ['empty string', '', '', ''],
    ])('should create QName from %s', (_desc, input, expectedNs, expectedLocal) => {
      const qname = new QName('', '');
      const result = qname.valueOf(input);

      expect(result.getNamespaceURI()).toBe(expectedNs);
      expect(result.getLocalPart()).toBe(expectedLocal);
    });

    it('should throw error for null input', () => {
      const qname = new QName('', '');

      expect(() => qname.valueOf(null as unknown as string)).toThrow('cannot create QName from null');
    });

    it('should throw error for missing closing bracket', () => {
      const qname = new QName('', '');

      expect(() => qname.valueOf('{http://example.com')).toThrow(
        'cannot create QName from {http://example.com, missing closing "}"',
      );
    });
  });

  describe('getNamespaceURI', () => {
    it('should return namespace URI when set', () => {
      const qname = new QName('http://example.com', 'element');

      expect(qname.getNamespaceURI()).toBe('http://example.com');
    });

    it('should return empty string when namespace is null', () => {
      const qname = new QName(null, 'element');

      expect(qname.getNamespaceURI()).toBe('');
    });

    it('should return empty string when namespace is empty', () => {
      const qname = new QName('', 'element');

      expect(qname.getNamespaceURI()).toBe('');
    });
  });

  describe('getLocalPart', () => {
    it('should return localPart when set', () => {
      const qname = new QName('http://example.com', 'element');

      expect(qname.getLocalPart()).toBe('element');
    });

    it('should return null when localPart is null', () => {
      const qname = new QName('http://example.com', null);

      expect(qname.getLocalPart()).toBeNull();
    });

    it('should return empty string when localPart is empty', () => {
      const qname = new QName('http://example.com', '');

      expect(qname.getLocalPart()).toBe('');
    });
  });

  describe('getPrefix', () => {
    it('should return prefix when set', () => {
      const qname = new QName('http://example.com', 'element', 'ex');

      expect(qname.getPrefix()).toBe('ex');
    });

    it('should return null when prefix is not set', () => {
      const qname = new QName('http://example.com', 'element');

      expect(qname.getPrefix()).toBeNull();
    });

    it('should return null when prefix is explicitly null', () => {
      const qname = new QName('http://example.com', 'element', null);

      expect(qname.getPrefix()).toBeNull();
    });
  });

  describe('toString', () => {
    it('should format QName with namespace and localPart', () => {
      const qname = new QName('http://example.com', 'element');

      expect(qname.toString()).toBe('{http://example.com}element');
    });

    it('should format QName without namespace', () => {
      const qname = new QName('', 'element');

      expect(qname.toString()).toBe('element');
    });

    it('should format QName with null namespace', () => {
      const qname = new QName(null, 'element');

      expect(qname.toString()).toBe('element');
    });

    it('should format QName with empty localPart', () => {
      const qname = new QName('http://example.com', '');

      expect(qname.toString()).toBe('{http://example.com}');
    });

    it('should format QName with null localPart', () => {
      const qname = new QName('http://example.com', null);

      expect(qname.toString()).toBe('{http://example.com}null');
    });

    it('should format QName with both empty namespace and localPart', () => {
      const qname = new QName('', '');

      expect(qname.toString()).toBe('');
    });

    it('should format QName created from fromString', () => {
      const qname = QName.fromString('{http://www.w3.org/2001/XMLSchema}string');

      expect(qname.toString()).toBe('{http://www.w3.org/2001/XMLSchema}string');
    });

    it('should format QName created from plain localPart', () => {
      const qname = QName.fromString('element');

      expect(qname.toString()).toBe('element');
    });
  });
});
