import { DocumentService } from './document.service';
import * as fs from 'fs';

describe('DocumentService', () => {
  const orderXsd = fs.readFileSync(__dirname + '/../../test-resources/ShipOrder.xsd').toString();

  describe('parseXmlSchema', () => {
    it('should parse the xml schema', () => {
      const document = DocumentService.parseXmlSchema(orderXsd);
      expect(document).toBeDefined();
    });
  });
});
