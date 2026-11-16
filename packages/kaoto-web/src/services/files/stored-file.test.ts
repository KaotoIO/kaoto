import { getFileType } from './stored-file';

describe('getFileType', () => {
  it.each(['routes/a.camel.yaml', 'a.kamelet.yaml', 'a.pipe.yml', 'legacy-route.xml', 'application.yaml'])(
    'treats %s as an integration',
    (path) => {
      expect(getFileType(path)).toBe('integration');
    },
  );

  it.each([
    'a.citrus.yaml',
    'a.citrus.yml',
    'a.citrus.test.yaml',
    'a.citrus.it.yaml',
    'a.citrus.xml',
    'a.citrus.it.xml',
  ])('treats %s as an integration test', (path) => {
    expect(getFileType(path)).toBe('integration-test');
  });

  it.each(['schema.xsd', 'mapping.xsl', 'template.json', 'application.properties', 'README', 'a.yaml.bak'])(
    'treats %s as a document',
    (path) => {
      expect(getFileType(path)).toBe('document');
    },
  );
});
