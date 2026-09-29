import { JSONSchema4 } from 'json-schema';
import { SchemaPropertyFilter } from './SchemaPropertyFilter';

describe('SchemaPropertyFilter', () => {
  describe('filter - basic filtering', () => {
    it('should return empty object when properties is undefined', () => {
      const result = SchemaPropertyFilter.filter(undefined, 'test');

      expect(result).toEqual({});
    });

    it('should return original properties when filter is empty and no omit fields', () => {
      const properties: JSONSchema4['properties'] = {
        username: { type: 'string', title: 'Username' },
        email: { type: 'string', title: 'Email' },
      };

      const result = SchemaPropertyFilter.filter(properties, '');

      expect(result).toBe(properties);
    });

    it('should filter by property key name', () => {
      const properties: JSONSchema4['properties'] = {
        username: { type: 'string', title: 'Username' },
        email: { type: 'string', title: 'Email' },
        password: { type: 'string', title: 'Password' },
      };

      const result = SchemaPropertyFilter.filter(properties, 'user');

      expect(Object.keys(result!)).toEqual(['username']);
    });

    it('should filter by schema title', () => {
      const properties: JSONSchema4['properties'] = {
        icon: { type: 'string', title: 'Kamelet Icon' },
        name: { type: 'string', title: 'Name' },
      };

      const result = SchemaPropertyFilter.filter(properties, 'kamelet');

      expect(Object.keys(result!)).toEqual(['icon']);
    });

    it('should filter by model value - string', () => {
      const properties: JSONSchema4['properties'] = {
        timerName: { type: 'string', title: 'Timer Name' },
        period: { type: 'string', title: 'Period' },
      };
      const model = { timerName: 'mySpecialTimer', period: '1000' };

      const result = SchemaPropertyFilter.filter(properties, 'myspecialtimer', undefined, model);

      expect(Object.keys(result!)).toEqual(['timerName']);
    });

    it('should filter by model value - number', () => {
      const properties: JSONSchema4['properties'] = {
        port: { type: 'number', title: 'Port' },
        timeout: { type: 'number', title: 'Timeout' },
      };
      const model = { port: 8080, timeout: 3000 };

      const result = SchemaPropertyFilter.filter(properties, '8080', undefined, model);

      expect(Object.keys(result!)).toEqual(['port']);
    });

    it('should filter by model value - boolean', () => {
      const properties: JSONSchema4['properties'] = {
        enabled: { type: 'boolean', title: 'Enabled' },
        debug: { type: 'boolean', title: 'Debug' },
      };
      const model = { enabled: true, debug: false };

      const result = SchemaPropertyFilter.filter(properties, 'true', undefined, model);

      expect(Object.keys(result!)).toEqual(['enabled']);
    });

    it('should return empty object when no properties match', () => {
      const properties: JSONSchema4['properties'] = {
        username: { type: 'string', title: 'Username' },
        email: { type: 'string', title: 'Email' },
      };

      const result = SchemaPropertyFilter.filter(properties, 'zzz');

      expect(Object.keys(result!)).toHaveLength(0);
    });
  });

  describe('filter - omit fields', () => {
    it('should omit specified fields with empty filter', () => {
      const properties: JSONSchema4['properties'] = {
        username: { type: 'string', title: 'Username' },
        email: { type: 'string', title: 'Email' },
        password: { type: 'string', title: 'Password' },
      };

      const result = SchemaPropertyFilter.filter(properties, '', ['password']);

      expect(Object.keys(result!)).toEqual(['username', 'email']);
    });

    it('should omit specified fields with active filter', () => {
      const properties: JSONSchema4['properties'] = {
        username: { type: 'string', title: 'Username' },
        email: { type: 'string', title: 'Email' },
        password: { type: 'string', title: 'Password' },
      };

      const result = SchemaPropertyFilter.filter(properties, 'e', ['email']);

      expect(Object.keys(result!)).toEqual(['username']);
    });
  });

  describe('filter - nested object properties', () => {
    it('should include object when container key matches', () => {
      const properties: JSONSchema4['properties'] = {
        metadata: {
          type: 'object',
          title: 'Metadata',
          properties: {
            displayName: { type: 'string', title: 'Display Name' },
            version: { type: 'string', title: 'Version' },
          },
        },
        unrelated: { type: 'string', title: 'Unrelated' },
      };

      const result = SchemaPropertyFilter.filter(properties, 'metadata');

      expect(Object.keys(result!)).toEqual(['metadata']);
      expect(result!['metadata']).toBe(properties!['metadata']);
    });

    it('should include object when container title matches', () => {
      const properties: JSONSchema4['properties'] = {
        meta: {
          type: 'object',
          title: 'Metadata Information',
          properties: {
            displayName: { type: 'string', title: 'Display Name' },
          },
        },
        unrelated: { type: 'string', title: 'Unrelated' },
      };

      const result = SchemaPropertyFilter.filter(properties, 'metadata');

      expect(Object.keys(result!)).toEqual(['meta']);
    });

    it('should include object when nested property key matches', () => {
      const properties: JSONSchema4['properties'] = {
        metadata: {
          type: 'object',
          title: 'Metadata',
          properties: {
            displayName: { type: 'string', title: 'Display Name' },
            version: { type: 'string', title: 'Version' },
          },
        },
        unrelated: { type: 'string', title: 'Unrelated' },
      };

      const result = SchemaPropertyFilter.filter(properties, 'display');

      expect(Object.keys(result!)).toEqual(['metadata']);
      expect((result!['metadata'] as JSONSchema4).properties).toEqual({
        displayName: { type: 'string', title: 'Display Name' },
      });
    });

    it('should include object when nested property title matches', () => {
      const properties: JSONSchema4['properties'] = {
        metadata: {
          type: 'object',
          title: 'Metadata',
          properties: {
            name: { type: 'string', title: 'Display Name' },
            ver: { type: 'string', title: 'Version' },
          },
        },
        unrelated: { type: 'string', title: 'Unrelated' },
      };

      const result = SchemaPropertyFilter.filter(properties, 'display');

      expect(Object.keys(result!)).toEqual(['metadata']);
      expect((result!['metadata'] as JSONSchema4).properties).toEqual({
        name: { type: 'string', title: 'Display Name' },
      });
    });

    it('should include object when nested property value matches', () => {
      const properties: JSONSchema4['properties'] = {
        metadata: {
          type: 'object',
          title: 'Metadata',
          properties: {
            displayName: { type: 'string', title: 'Display Name' },
            version: { type: 'string', title: 'Version' },
          },
        },
        unrelated: { type: 'string', title: 'Unrelated' },
      };
      const model = { metadata: { displayName: 'MyApp', version: '1.0' } };

      const result = SchemaPropertyFilter.filter(properties, 'myapp', undefined, model);

      expect(Object.keys(result!)).toEqual(['metadata']);
      expect((result!['metadata'] as JSONSchema4).properties).toEqual({
        displayName: { type: 'string', title: 'Display Name' },
      });
    });

    it('should exclude object when no nested properties match', () => {
      const properties: JSONSchema4['properties'] = {
        metadata: {
          type: 'object',
          title: 'Metadata',
          properties: {
            displayName: { type: 'string', title: 'Display Name' },
          },
        },
        unrelated: { type: 'string', title: 'Unrelated' },
      };

      const result = SchemaPropertyFilter.filter(properties, 'zzz');

      expect(Object.keys(result!)).toHaveLength(0);
    });
  });

  describe('filter - array properties', () => {
    it('should include array when container key matches', () => {
      const properties: JSONSchema4['properties'] = {
        kameletProperties: {
          type: 'array',
          title: 'Properties',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', title: 'Name' },
            },
          },
        },
        unrelated: { type: 'string', title: 'Unrelated' },
      };

      const result = SchemaPropertyFilter.filter(properties, 'kameletproperties');

      expect(Object.keys(result!)).toEqual(['kameletProperties']);
      expect(result!['kameletProperties']).toBe(properties!['kameletProperties']);
    });

    it('should include array when container title matches', () => {
      const properties: JSONSchema4['properties'] = {
        props: {
          type: 'array',
          title: 'Kamelet Properties',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', title: 'Name' },
            },
          },
        },
        unrelated: { type: 'string', title: 'Unrelated' },
      };

      const result = SchemaPropertyFilter.filter(properties, 'kamelet');

      expect(Object.keys(result!)).toEqual(['props']);
    });

    it('should include array when item property key matches', () => {
      const properties: JSONSchema4['properties'] = {
        kameletProperties: {
          type: 'array',
          title: 'Properties',
          items: {
            type: 'object',
            properties: {
              propertyName: { type: 'string', title: 'Name' },
              value: { type: 'string', title: 'Value' },
            },
          },
        },
        unrelated: { type: 'string', title: 'Unrelated' },
      };

      const result = SchemaPropertyFilter.filter(properties, 'propertyname');

      expect(Object.keys(result!)).toEqual(['kameletProperties']);
    });

    it('should include array when item property title matches', () => {
      const properties: JSONSchema4['properties'] = {
        kameletProperties: {
          type: 'array',
          title: 'Properties',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', title: 'Property Name' },
            },
          },
        },
        unrelated: { type: 'string', title: 'Unrelated' },
      };

      const result = SchemaPropertyFilter.filter(properties, 'property');

      expect(Object.keys(result!)).toEqual(['kameletProperties']);
    });

    it('should include array when item value matches', () => {
      const properties: JSONSchema4['properties'] = {
        kameletProperties: {
          type: 'array',
          title: 'Properties',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', title: 'Name' },
              value: { type: 'string', title: 'Value' },
            },
          },
        },
        unrelated: { type: 'string', title: 'Unrelated' },
      };
      const model = { kameletProperties: [{ name: 'TestProperty', value: 'test-value' }] };

      const result = SchemaPropertyFilter.filter(properties, 'testproperty', undefined, model);

      expect(Object.keys(result!)).toEqual(['kameletProperties']);
    });

    it('should handle array with null items in model', () => {
      const properties: JSONSchema4['properties'] = {
        items: {
          type: 'array',
          title: 'Items',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string', title: 'Label' },
            },
          },
        },
      };
      const model = { items: [null, { label: 'hello' }] };

      const result = SchemaPropertyFilter.filter(properties, 'hello', undefined, model);

      expect(Object.keys(result!)).toContain('items');
    });

    it('should exclude array when no item properties match', () => {
      const properties: JSONSchema4['properties'] = {
        kameletProperties: {
          type: 'array',
          title: 'Properties',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', title: 'Name' },
            },
          },
        },
        unrelated: { type: 'string', title: 'Unrelated' },
      };

      const result = SchemaPropertyFilter.filter(properties, 'zzz');

      expect(Object.keys(result!)).toHaveLength(0);
    });

    it('should handle plain string array by key match only', () => {
      const properties: JSONSchema4['properties'] = {
        headers: {
          type: 'array',
          title: 'Headers',
          items: { type: 'string' },
        },
        unrelated: { type: 'string', title: 'Unrelated' },
      };

      const result = SchemaPropertyFilter.filter(properties, 'header');

      expect(Object.keys(result!)).toEqual(['headers']);
    });

    it('should exclude plain string array when key does not match', () => {
      const properties: JSONSchema4['properties'] = {
        headers: {
          type: 'array',
          title: 'Headers',
          items: { type: 'string' },
        },
        unrelated: { type: 'string', title: 'Unrelated' },
      };

      const result = SchemaPropertyFilter.filter(properties, 'zzz');

      expect(Object.keys(result!)).toHaveLength(0);
    });
  });

  describe('filter - case insensitivity', () => {
    it('should match regardless of case in property key', () => {
      const properties: JSONSchema4['properties'] = {
        UserName: { type: 'string', title: 'Username' },
        email: { type: 'string', title: 'Email' },
      };

      const result = SchemaPropertyFilter.filter(properties, 'username');

      expect(Object.keys(result!)).toEqual(['UserName']);
    });

    it('should match regardless of case in schema title', () => {
      const properties: JSONSchema4['properties'] = {
        icon: { type: 'string', title: 'KAMELET ICON' },
        name: { type: 'string', title: 'Name' },
      };

      const result = SchemaPropertyFilter.filter(properties, 'kamelet');

      expect(Object.keys(result!)).toEqual(['icon']);
    });

    it('should match regardless of case in model value', () => {
      const properties: JSONSchema4['properties'] = {
        timerName: { type: 'string', title: 'Timer Name' },
      };
      const model = { timerName: 'MySpecialTimer' };

      const result = SchemaPropertyFilter.filter(properties, 'myspecialtimer', undefined, model);

      expect(Object.keys(result!)).toEqual(['timerName']);
    });
  });

  describe('filter - complex scenarios', () => {
    it('should handle deeply nested objects', () => {
      const properties: JSONSchema4['properties'] = {
        config: {
          type: 'object',
          title: 'Configuration',
          properties: {
            database: {
              type: 'object',
              title: 'Database',
              properties: {
                host: { type: 'string', title: 'Host' },
                port: { type: 'number', title: 'Port' },
              },
            },
          },
        },
      };

      const result = SchemaPropertyFilter.filter(properties, 'host');

      expect(Object.keys(result!)).toEqual(['config']);
      const configProps = (result!['config'] as JSONSchema4).properties!;
      expect(Object.keys(configProps)).toEqual(['database']);
      const dbProps = (configProps['database'] as JSONSchema4).properties!;
      expect(Object.keys(dbProps)).toEqual(['host']);
    });

    it('should handle multiple matching properties', () => {
      const properties: JSONSchema4['properties'] = {
        username: { type: 'string', title: 'Username' },
        userEmail: { type: 'string', title: 'User Email' },
        userId: { type: 'number', title: 'User ID' },
        password: { type: 'string', title: 'Password' },
      };

      const result = SchemaPropertyFilter.filter(properties, 'user');

      expect(Object.keys(result!)).toEqual(['username', 'userEmail', 'userId']);
    });

    it('should combine omit and filter correctly', () => {
      const properties: JSONSchema4['properties'] = {
        username: { type: 'string', title: 'Username' },
        userEmail: { type: 'string', title: 'User Email' },
        userId: { type: 'number', title: 'User ID' },
        password: { type: 'string', title: 'Password' },
      };

      const result = SchemaPropertyFilter.filter(properties, 'user', ['userId']);

      expect(Object.keys(result!)).toEqual(['username', 'userEmail']);
    });
  });
});
