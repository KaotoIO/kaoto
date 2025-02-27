import { XmlCamelResourceSerializer } from './xml-camel-resource-serializer';
import { CamelRouteResource } from '../models/camel';

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
    expect(serializer['xmlDeclaration']).toBe('<?xml version="1.0" encoding="UTF-8"?>');
  });

  it('should insert comments into XML', () => {
    const resource = new CamelRouteResource([]);
    serializer.setComments(['Comment 1', 'Comment 2']);

    const xml = serializer.serialize(resource);
    expect(xml).toContain('<!-- Comment 1 -->');
    expect(xml).toContain('<!-- Comment 2 -->');
  });

  it('should include XML declaration in serialized XML', () => {
    const resource = new CamelRouteResource([]);
    serializer.setMetadata('<?xml version="1.0" encoding="UTF-8"?>');
    const xml = serializer.serialize(resource);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
  });
});
