import { CamelRouteResource } from '../models/camel';
import { XmlCamelResourceSerializer } from './xml-camel-resource-serializer';

describe('XmlCamelResourceSerializer', () => {
  let serializer: XmlCamelResourceSerializer;

  beforeEach(() => {
    serializer = new XmlCamelResourceSerializer();
  });

  it('should extract comments from XML', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <!-- Comment 1 -->
     <!-- Comment 2 -->
<camel/>`;
    await serializer.parse(xml);
    expect(serializer.getComments()).toEqual(['Comment 1', 'Comment 2']);
  });

  it('should parse XML declaration', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<camel></camel>`;
    await serializer.parse(xml);
    expect(serializer.getMetadata()['xmlDeclaration']).toBe('<?xml version="1.0" encoding="UTF-8"?>');
  });

  it('should insert comments into XML', async () => {
    const resource = new CamelRouteResource([]);
    serializer.setComments(['Comment 1', 'Comment 2']);

    const xml = await serializer.serialize(resource);
    expect(xml).toContain('<!-- Comment 1 -->');
    expect(xml).toContain('<!-- Comment 2 -->');
  });

  it('should include XML declaration in serialized XML', async () => {
    const resource = new CamelRouteResource([]);
    serializer.setMetadata({ xmlDeclaration: '<?xml version="1.0" encoding="UTF-8"?>' });
    const xml = await serializer.serialize(resource);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
  });

  it('should include default camel namespace in root', async () => {
    const resource = new CamelRouteResource([]);
    const xml = await serializer.serialize(resource);
    expect(xml).toContain('xmlns="http://camel.apache.org/schema/spring"');
  });

  it('should include all root element definitions', async () => {
    const resource = new CamelRouteResource([]);
    serializer.setMetadata({
      rootElementDefinitions: [
        { name: 'xmlns:xsi', value: 'http://www.w3.org/2001/XMLSchema-instance' },
        { name: 'xmlns', value: 'http://camel.apache.org/schema/spring' },
        {
          name: 'xsi:schemaLocation',
          value: 'http://camel.apache.org/schema/spring https://camel.apache.org/schema/spring/camel-spring.xsd',
        },
      ],
    });

    const xml = await serializer.serialize(resource);
    expect(xml).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
    expect(xml).toContain('xmlns="http://camel.apache.org/schema/spring"');
    expect(xml).toContain(
      'xsi:schemaLocation="http://camel.apache.org/schema/spring https://camel.apache.org/schema/spring/camel-spring.xsd"',
    );
  });

  it('should parse root element definitions', async () => {
    const xml = `<camel xmlns="http://camel.apache.org/schema/spring" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://camel.apache.org/schema/spring https://camel.apache.org/schema/spring/camel-spring.xsd"></camel>`;
    await serializer.parse(xml);
    const rootElementDefinitions = serializer.getMetadata().rootElementDefinitions as { name: string; value: string }[];
    expect(rootElementDefinitions).toContainEqual({
      name: 'xmlns:xsi',
      value: 'http://www.w3.org/2001/XMLSchema-instance',
    });
    expect(rootElementDefinitions).toContainEqual({ name: 'xmlns', value: 'http://camel.apache.org/schema/spring' });
    expect(rootElementDefinitions).toContainEqual({
      name: 'xsi:schemaLocation',
      value: 'http://camel.apache.org/schema/spring https://camel.apache.org/schema/spring/camel-spring.xsd',
    });
  });
});
