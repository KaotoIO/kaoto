import { Test } from '../../models/citrus/entities/Test';
import { parseCitrusXml, parseRootAttributes, parseXmlDeclaration, serializeCitrusXml } from './citrus-xml-parser';

describe('citrus-xml-parser', () => {
  describe('parseXmlDeclaration', () => {
    it('should extract XML declaration', () => {
      const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<test/>';
      expect(parseXmlDeclaration(xml)).toBe('<?xml version="1.0" encoding="UTF-8"?>');
    });

    it('should return empty string when no declaration', () => {
      expect(parseXmlDeclaration('<test/>')).toBe('');
    });
  });

  describe('parseRootAttributes', () => {
    it('should extract xmlns:xsi and xsi:schemaLocation', () => {
      const xml = `<test xmlns="http://citrusframework.org/schema/xml/testcase"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://citrusframework.org/schema/xml/testcase http://citrusframework.org/schema/xml/testcase.xsd"
        name="my-test">
  <actions/>
</test>`;
      const attrs = parseRootAttributes(xml);
      expect(attrs).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
      expect(attrs).toContain(
        'xsi:schemaLocation="http://citrusframework.org/schema/xml/testcase http://citrusframework.org/schema/xml/testcase.xsd"',
      );
    });

    it('should exclude name, author, status, and xmlns', () => {
      const xml = `<test xmlns="http://citrusframework.org/schema/xml/testcase"
        name="my-test" author="John" status="FINAL">
  <actions/>
</test>`;
      const attrs = parseRootAttributes(xml);
      expect(attrs).toEqual([]);
    });

    it('should return empty array for invalid XML', () => {
      expect(parseRootAttributes('<not-valid')).toEqual([]);
    });

    it('should preserve custom namespace declarations', () => {
      const xml = `<test xmlns="http://citrusframework.org/schema/xml/testcase"
        xmlns:custom="http://example.com/custom"
        name="my-test">
  <actions/>
</test>`;
      const attrs = parseRootAttributes(xml);
      expect(attrs).toContain('xmlns:custom="http://example.com/custom"');
    });
  });

  describe('parseCitrusXml', () => {
    it('should parse a minimal test', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<test xmlns="http://citrusframework.org/schema/xml/testcase" name="my-test">
  <actions>
    <print>
      <message>Hello!</message>
    </print>
  </actions>
</test>`;

      const test = parseCitrusXml(xml);
      expect(test.name).toBe('my-test');
      expect(test.actions).toHaveLength(1);
      expect(test.actions[0].print).toBeDefined();
      expect(test.actions[0].print?.message).toBe('Hello!');
    });

    it('should parse test attributes', () => {
      const xml = `<test xmlns="http://citrusframework.org/schema/xml/testcase" name="t" author="John" status="DRAFT">
  <actions/>
</test>`;
      const test = parseCitrusXml(xml);
      expect(test.name).toBe('t');
      expect(test.author).toBe('John');
      expect(test.status).toBe('DRAFT');
    });

    it('should parse description', () => {
      const xml = `<test xmlns="http://citrusframework.org/schema/xml/testcase" name="t">
  <description>A test description</description>
  <actions/>
</test>`;
      const test = parseCitrusXml(xml);
      expect(test.description).toBe('A test description');
    });

    it('should parse variables', () => {
      const xml = `<test xmlns="http://citrusframework.org/schema/xml/testcase" name="t">
  <variables>
    <variable name="user" value="Citrus"/>
    <variable name="count"/>
  </variables>
  <actions/>
</test>`;
      const test = parseCitrusXml(xml);
      expect(test.variables).toHaveLength(2);
      expect(test.variables![0]).toEqual({ name: 'user', value: 'Citrus' });
      expect(test.variables![1]).toEqual({ name: 'count' });
    });

    it('should parse create-variables action with kebab-to-camel conversion', () => {
      const xml = `<test xmlns="http://citrusframework.org/schema/xml/testcase" name="t">
  <actions>
    <create-variables>
      <variable name="user" value="Citrus"/>
    </create-variables>
  </actions>
</test>`;
      const test = parseCitrusXml(xml);
      expect(test.actions).toHaveLength(1);
      expect(test.actions[0].createVariables).toBeDefined();
      expect(test.actions[0].createVariables?.variables).toEqual([{ name: 'user', value: 'Citrus' }]);
    });

    it('should parse send and receive actions with message body', () => {
      const xml = `<test xmlns="http://citrusframework.org/schema/xml/testcase" name="t">
  <actions>
    <send endpoint="myEndpoint">
      <message>
        <body>
          <data>Hello</data>
        </body>
      </message>
    </send>
    <receive endpoint="myEndpoint"/>
  </actions>
</test>`;
      const test = parseCitrusXml(xml);
      expect(test.actions).toHaveLength(2);
      expect(test.actions[0].send).toBeDefined();
      expect(test.actions[0].send?.endpoint).toBe('myEndpoint');
      expect((test.actions[0].send as unknown as Record<string, unknown>).message).toEqual({ body: { data: 'Hello' } });
      expect(test.actions[1].receive).toBeDefined();
      expect(test.actions[1].receive?.endpoint).toBe('myEndpoint');
    });

    it('should parse container actions with nested actions', () => {
      const xml = `<test xmlns="http://citrusframework.org/schema/xml/testcase" name="t">
  <actions>
    <sequential>
      <actions>
        <echo>
          <message>Step 1</message>
        </echo>
        <echo>
          <message>Step 2</message>
        </echo>
      </actions>
    </sequential>
  </actions>
</test>`;
      const test = parseCitrusXml(xml);
      expect(test.actions).toHaveLength(1);
      expect(test.actions[0].sequential).toBeDefined();
      const seq = test.actions[0].sequential!;
      expect(seq.actions).toHaveLength(2);
    });

    it('should parse finally block', () => {
      const xml = `<test xmlns="http://citrusframework.org/schema/xml/testcase" name="t">
  <actions>
    <echo>
      <message>Main</message>
    </echo>
  </actions>
  <finally>
    <echo>
      <message>Cleanup</message>
    </echo>
  </finally>
</test>`;
      const test = parseCitrusXml(xml);
      expect(test.actions).toHaveLength(1);
      expect(test.finally).toHaveLength(1);
    });

    it('should parse configuration with beans', () => {
      const xml = `<test xmlns="http://citrusframework.org/schema/xml/testcase" name="t">
  <configuration>
    <beans>
      <bean name="myBean" type="com.example.MyBean">
        <property name="host" value="localhost"/>
      </bean>
    </beans>
  </configuration>
  <actions/>
</test>`;
      const test = parseCitrusXml(xml);
      expect(test.configuration).toBeDefined();
      expect(test.configuration!.beans).toHaveLength(1);
      expect(test.configuration!.beans![0].name).toBe('myBean');
      expect(test.configuration!.beans![0].type).toBe('com.example.MyBean');
      expect(test.configuration!.beans![0].properties).toEqual({ host: 'localhost' });
    });

    it('should throw on parse error', () => {
      expect(() => parseCitrusXml('not xml at all')).toThrow('Invalid Citrus XML');
    });

    it('should preserve text content on elements with attributes', () => {
      const xml = `<test xmlns="http://citrusframework.org/schema/xml/testcase" name="t">
  <actions>
    <validate>
      <script type="groovy">println 'hello'</script>
    </validate>
  </actions>
</test>`;
      const test = parseCitrusXml(xml);
      const validate = (test.actions[0] as unknown as Record<string, unknown>).validate as Record<string, unknown>;
      const script = validate.script as Record<string, unknown>;
      expect(script.type).toBe('groovy');
      expect(script['#text']).toBe("println 'hello'");
    });

    it('should handle delay action with numeric attribute', () => {
      const xml = `<test xmlns="http://citrusframework.org/schema/xml/testcase" name="t">
  <actions>
    <delay milliseconds="1000"/>
  </actions>
</test>`;
      const test = parseCitrusXml(xml);
      expect(test.actions[0].delay?.milliseconds).toBe(1000);
    });

    it('should convert kebab-case attributes to camelCase', () => {
      const xml = `<test xmlns="http://citrusframework.org/schema/xml/testcase" name="t">
  <actions>
    <send endpoint="orders" auto-create-queue="true"/>
  </actions>
</test>`;
      const test = parseCitrusXml(xml);
      expect((test.actions[0].send as unknown as Record<string, unknown>).autoCreateQueue).toBe(true);
    });

    it('should parse endpoints with type-specific element tags', () => {
      const xml = `<test xmlns="http://citrusframework.org/schema/xml/testcase" name="t">
  <endpoints>
    <direct name="orders"/>
    <jms name="jmsEndpoint" destination-name="test.queue"/>
  </endpoints>
  <actions/>
</test>`;
      const test = parseCitrusXml(xml);
      expect(test.endpoints).toHaveLength(2);
      expect((test.endpoints![0] as Record<string, unknown>).direct).toEqual({ name: 'orders' });
      expect((test.endpoints![1] as Record<string, unknown>).jms).toEqual({
        name: 'jmsEndpoint',
        destinationName: 'test.queue',
      });
    });
  });

  describe('serializeCitrusXml', () => {
    it('should serialize a minimal test', () => {
      const test: Test = {
        name: 'my-test',
        actions: [{ print: { message: 'Hello!' } }],
      };
      const xml = serializeCitrusXml(test);
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('xmlns="http://citrusframework.org/schema/xml/testcase"');
      expect(xml).toContain('name="my-test"');
      expect(xml).toContain('<print>');
      expect(xml).toContain('<message>Hello!</message>');
      expect(xml).toContain('</print>');
    });

    it('should serialize with rootAttributes', () => {
      const test: Test = {
        name: 'my-test',
        actions: [],
      };
      const rootAttrs = [
        'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
        'xsi:schemaLocation="http://citrusframework.org/schema/xml/testcase http://citrusframework.org/schema/xml/testcase.xsd"',
      ];
      const xml = serializeCitrusXml(test, undefined, rootAttrs);
      expect(xml).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
      expect(xml).toContain('xsi:schemaLocation=');
      expect(xml).toContain('name="my-test"');
    });

    it('should serialize test attributes', () => {
      const test: Test = {
        name: 't',
        author: 'John',
        status: 'DRAFT',
        actions: [],
      };
      const xml = serializeCitrusXml(test);
      expect(xml).toContain('author="John"');
      expect(xml).toContain('status="DRAFT"');
    });

    it('should serialize variables', () => {
      const test: Test = {
        name: 't',
        variables: [{ name: 'user', value: 'Citrus' }, { name: 'count' }],
        actions: [],
      };
      const xml = serializeCitrusXml(test);
      expect(xml).toContain('<variable name="user" value="Citrus"/>');
      expect(xml).toContain('<variable name="count"/>');
    });

    it('should serialize createVariables with kebab-case element name', () => {
      const test: Test = {
        name: 't',
        actions: [
          {
            createVariables: {
              variables: [{ name: 'user', value: 'Citrus' }],
            },
          },
        ],
      };
      const xml = serializeCitrusXml(test);
      expect(xml).toContain('<create-variables>');
      expect(xml).toContain('</create-variables>');
    });

    it('should serialize finally block', () => {
      const test: Test = {
        name: 't',
        actions: [{ echo: { message: 'Main' } }],
        finally: [{ echo: { message: 'Cleanup' } }],
      };
      const xml = serializeCitrusXml(test);
      expect(xml).toContain('<finally>');
      expect(xml).toContain('</finally>');
    });

    it('should escape XML special characters', () => {
      const test: Test = {
        name: 'test & <special>',
        actions: [],
      };
      const xml = serializeCitrusXml(test);
      expect(xml).toContain('name="test &amp; &lt;special&gt;"');
    });

    it('should use custom XML declaration when provided', () => {
      const test: Test = { name: 't', actions: [] };
      const xml = serializeCitrusXml(test, '<?xml version="1.1"?>');
      expect(xml).toContain('<?xml version="1.1"?>');
      expect(xml).not.toContain('<?xml version="1.0"');
    });

    it('should serialize camelCase attributes as kebab-case', () => {
      const test: Test = {
        name: 't',
        actions: [{ send: { endpoint: 'orders', autoCreateQueue: true } } as unknown as Test['actions'][0]],
      };
      const xml = serializeCitrusXml(test);
      expect(xml).toContain('auto-create-queue="true"');
      expect(xml).not.toContain('autoCreateQueue');
    });

    it('should serialize endpoints with type-specific element tags', () => {
      const test: Test = {
        name: 't',
        endpoints: [{ direct: { name: 'orders' } } as unknown as NonNullable<Test['endpoints']>[number]],
        actions: [],
      };
      const xml = serializeCitrusXml(test);
      expect(xml).toContain('<direct name="orders"/>');
      expect(xml).not.toContain('<endpoint ');
    });

    it('should serialize message with nested body structure', () => {
      const test: Test = {
        name: 't',
        actions: [
          { send: { endpoint: 'orders', message: { body: { data: 'Hello' } } } } as unknown as Test['actions'][0],
        ],
      };
      const xml = serializeCitrusXml(test);
      expect(xml).toContain('<message>');
      expect(xml).toContain('<body>');
      expect(xml).toContain('<data>Hello</data>');
      expect(xml).not.toContain('[object Object]');
    });

    it('should serialize configuration with beans', () => {
      const test: Test = {
        name: 't',
        configuration: {
          beans: [{ name: 'myBean', type: 'com.example.MyBean', properties: { host: 'localhost' } }],
        },
        actions: [],
      };
      const xml = serializeCitrusXml(test);
      expect(xml).toContain('<configuration>');
      expect(xml).toContain('<bean name="myBean" type="com.example.MyBean">');
      expect(xml).toContain('<property name="host" value="localhost"/>');
    });

    it('should serialize element with attributes and text content', () => {
      const test: Test = {
        name: 't',
        actions: [
          {
            validate: { script: { type: 'groovy', '#text': "println 'hello'" } },
          } as unknown as Test['actions'][0],
        ],
      };
      const xml = serializeCitrusXml(test);
      expect(xml).toContain('type="groovy"');
      expect(xml).toContain('println &apos;hello&apos;');
      expect(xml).toContain('</script>');
    });

    it('should serialize message headers as attributes', () => {
      const test: Test = {
        name: 't',
        actions: [
          {
            send: {
              endpoint: 'orders',
              message: {
                headers: { header: { name: 'op', value: 'sayHello' } },
                body: { data: 'Hello' },
              },
            },
          } as unknown as Test['actions'][0],
        ],
      };
      const xml = serializeCitrusXml(test);
      expect(xml).toContain('<header name="op" value="sayHello"/>');
      expect(xml).toContain('<data>Hello</data>');
    });

    it('should serialize message headers array wrapped in headers element', () => {
      const test: Test = {
        name: 't',
        actions: [
          {
            send: {
              endpoint: 'orders',
              message: {
                headers: [{ name: 'op', value: 'sayHello' }],
                body: { data: 'Hello' },
              },
            },
          } as unknown as Test['actions'][0],
        ],
      };
      const xml = serializeCitrusXml(test);
      expect(xml).toContain('<headers>');
      expect(xml).toContain('<header name="op" value="sayHello"/>');
      expect(xml).toContain('</headers>');
    });
  });

  describe('round-trip', () => {
    it('should preserve test structure through parse → serialize → parse', () => {
      const original: Test = {
        name: 'round-trip-test',
        description: 'A round-trip test',
        variables: [{ name: 'user', value: 'Citrus' }],
        actions: [
          { createVariables: { variables: [{ name: 'host', value: 'localhost' }] } },
          { print: { message: 'Hello ${user}!' } },
          { echo: { message: 'Done' } },
        ],
      };

      const xml = serializeCitrusXml(original);
      const parsed = parseCitrusXml(xml);

      expect(parsed.name).toBe(original.name);
      expect(parsed.description).toBe(original.description);
      expect(parsed.variables).toEqual(original.variables);
      expect(parsed.actions).toHaveLength(3);
      expect(parsed.actions[0].createVariables?.variables).toEqual([{ name: 'host', value: 'localhost' }]);
      expect(parsed.actions[1].print?.message).toBe('Hello ${user}!');
      expect(parsed.actions[2].echo?.message).toBe('Done');
    });

    it('should preserve root namespace attributes through parse → serialize', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<test xmlns="http://citrusframework.org/schema/xml/testcase"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://citrusframework.org/schema/xml/testcase http://citrusframework.org/schema/xml/testcase.xsd"
  name="ns-test">
  <actions>
    <echo><message>hi</message></echo>
  </actions>
</test>`;

      const rootAttrs = parseRootAttributes(xml);
      const parsed = parseCitrusXml(xml);
      const serialized = serializeCitrusXml(parsed, parseXmlDeclaration(xml), rootAttrs);

      expect(serialized).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
      expect(serialized).toContain('xsi:schemaLocation=');
      expect(serialized).toContain('name="ns-test"');

      const reparsed = parseCitrusXml(serialized);
      expect(reparsed.name).toBe('ns-test');
      expect(reparsed.actions[0].echo?.message).toBe('hi');
    });
  });
});
