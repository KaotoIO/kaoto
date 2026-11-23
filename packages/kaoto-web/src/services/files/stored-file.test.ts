import { getFileType } from './stored-file';

describe('getFileType', () => {
  it.each(['routes/a.camel.yaml', 'a.camel.yml', 'a.camel.xml', 'a.kamelet.yaml', 'a.kamelet.yml'])(
    'treats %s as an integration',
    (path) => {
      expect(getFileType(path)).toBe('integration');
    },
  );

  it.each(['a.citrus.yaml', 'a.citrus.yml', 'a.citrus.xml'])('treats %s as an integration test', (path) => {
    expect(getFileType(path)).toBe('integration-test');
  });

  it.each([
    'application.yaml',
    'application.yml',
    'docker-compose.yml',
    'values.yaml',
    'pom.xml',
    'legacy-route.xml',
    'a.pipe.yaml',
    'a.pipe.yml',
    'a.kamelet.xml',
    'a.citrus.test.yaml',
    'a.citrus.it.yaml',
    'a.citrus.it.xml',
    'schema.xsd',
    'mapping.xsl',
    'template.json',
    'application.properties',
    'README',
    'a.camel.yaml.bak',
  ])('treats %s as a document', (path) => {
    expect(getFileType(path)).toBe('document');
  });
});
