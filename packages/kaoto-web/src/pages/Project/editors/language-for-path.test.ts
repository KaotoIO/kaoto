import { languageForPath } from './language-for-path';

describe('languageForPath', () => {
  it.each([
    ['schemas/order.xsd', 'xml'],
    ['mappings/order.xsl', 'xml'],
    ['mappings/order.xslt', 'xml'],
    ['data/order.xml', 'xml'],
    ['data/order.json', 'json'],
    ['config/values.yaml', 'yaml'],
    ['config/values.yml', 'yaml'],
    ['application.properties', 'ini'],
    ['src/Order.java', 'java'],
    ['scripts/order.groovy', 'java'],
    ['scripts/order.js', 'javascript'],
    ['db/schema.sql', 'sql'],
    ['README', 'plaintext'],
    ['notes.txt', 'plaintext'],
    ['data/ORDER.JSON', 'json'],
  ])('edits %s as %s', (path, language) => {
    expect(languageForPath(path)).toBe(language);
  });
});
