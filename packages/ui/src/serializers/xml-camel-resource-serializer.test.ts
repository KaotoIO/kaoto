import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { CamelCatalogService, CatalogKind } from '../models';
import { CamelRouteResource } from '../models/camel';
import { doTryCamelRouteJson, doTryCamelRouteXml } from '../stubs';
import { beansJson } from '../stubs/beans';
import { getFirstCatalogMap } from '../stubs/test-load-catalog';
import { XmlCamelResourceSerializer } from './xml-camel-resource-serializer';

describe('XmlCamelResourceSerializer', () => {
  let serializer: XmlCamelResourceSerializer;

  beforeEach(() => {
    serializer = new XmlCamelResourceSerializer();
  });

  it('should extract comments from XML', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <!-- Comment 1 -->
     <!-- Comment 2 -->
<camel/>`;
    serializer.parse(xml);
    expect(serializer.getComments()).toEqual(['Comment 1', 'Comment 2']);
  });

  it('should parse XML declaration', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<camel></camel>`;
    serializer.parse(xml);
    expect(serializer.getMetadata()['xmlDeclaration']).toBe('<?xml version="1.0" encoding="UTF-8"?>');
  });

  it('should stop collecting comments once non-whitespace precedes a comment', () => {
    // Only leading comments (preceded solely by whitespace) are extracted; an inline comment
    // after real content stops the scan and is left in the body.
    const xml = `<camel><!-- inline comment --></camel>`;
    serializer.parse(xml);
    expect(serializer.getComments()).toEqual([]);
  });

  it('should insert comments into XML', () => {
    const resource = new CamelRouteResource([]);
    resource.initialize();
    serializer.setComments(['Comment 1', 'Comment 2']);

    const xml = serializer.serialize(resource);
    expect(xml).toContain('<!-- Comment 1 -->');
    expect(xml).toContain('<!-- Comment 2 -->');
  });

  it('should include XML declaration in serialized XML', () => {
    const resource = new CamelRouteResource([]);
    resource.initialize();
    serializer.setMetadata({ xmlDeclaration: '<?xml version="1.0" encoding="UTF-8"?>' });
    const xml = serializer.serialize(resource);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
  });

  it('should include default camel namespace in root', () => {
    const resource = new CamelRouteResource([]);
    resource.initialize();
    const xml = serializer.serialize(resource);
    expect(xml).toContain('xmlns="http://camel.apache.org/schema/spring"');
  });

  it('should include all root element definitions', () => {
    const resource = new CamelRouteResource([]);
    resource.initialize();
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

    const xml = serializer.serialize(resource);
    expect(xml).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
    expect(xml).toContain('xmlns="http://camel.apache.org/schema/spring"');
    expect(xml).toContain(
      'xsi:schemaLocation="http://camel.apache.org/schema/spring https://camel.apache.org/schema/spring/camel-spring.xsd"',
    );
  });

  it('should parse root element definitions', () => {
    const xml = `<camel xmlns="http://camel.apache.org/schema/spring" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://camel.apache.org/schema/spring https://camel.apache.org/schema/spring/camel-spring.xsd"></camel>`;
    serializer.parse(xml);
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

  describe('catalog-deferred entity parsing', () => {
    beforeAll(async () => {
      const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
      CamelCatalogService.setCatalogKey(CatalogKind.Processor, catalogsMap.modelCatalogMap);
    });

    it('should NOT build entities in parse() (catalog is not loaded yet at that point)', () => {
      // parse() runs in KaotoResourceProvider, above the catalog loader. Building entities here
      // would read an empty catalog and silently drop every processor, so it must defer instead.
      const entities = serializer.parse(doTryCamelRouteXml);

      expect(entities).toEqual([]);
    });

    it('should build the entities from the retained XML when parseEntities() is called', () => {
      serializer.parse(doTryCamelRouteXml);

      const entities = serializer.parseEntities();

      // The deferred parse reproduces exactly what KaotoXmlParser would have produced eagerly,
      // including the nested doTry/doCatch/doFinally steps that the timing bug used to drop.
      expect(entities).toEqual([doTryCamelRouteJson]);
    });

    it('should parse the declaration-stripped XML in parseEntities()', () => {
      serializer.parse(`<?xml version="1.0" encoding="UTF-8"?>\n${doTryCamelRouteXml}`);

      const entities = serializer.parseEntities();

      // parse() stashes the declaration-stripped code; parseEntities() must read that, not the raw input.
      expect(entities).toEqual([doTryCamelRouteJson]);
    });

    it('should serialize Beans entities alongside visual entities', () => {
      const resource = new CamelRouteResource([beansJson]);
      resource.initialize();

      // Beans are non-visual entities pulled from getEntities(); serialize() must include them
      // (BeansXmlSerializer reads the beanFactory catalog entry, hence the catalog requirement).
      const xml = serializer.serialize(resource);
      expect(xml).toContain('<bean ');
      expect(xml).toContain('myBean');
    });
  });
});
