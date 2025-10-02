import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DocumentType, RootElementOption } from '../models/datamapper/document';
import { DocumentNodeData } from '../models/datamapper/visualization';
import { VisualizationService } from './visualization.service';
import { XmlSchemaDocumentService } from './xml-schema-document.service';

describe('Recursive Document parsing', () => {
  it('should parse a document with recursive fields', async () => {
    const documentType = DocumentType.SOURCE_BODY;
    const documentId = 'test-id';

    /* Resolved from the project's root directory packages/ui */
    const fileLocation = resolve('./src/stubs/datamapper/xml/fhir-single.xsd');
    const content = await readFile(fileLocation, { encoding: 'utf-8' });

    const rootElementChoice: RootElementOption = {
      name: 'Account',
      namespaceUri: 'http://hl7.org/fhir',
    };

    const document = XmlSchemaDocumentService.createXmlSchemaDocument(
      documentType,
      documentId,
      content,
      rootElementChoice,
    );

    const nodeData = new DocumentNodeData(document);
    const children = VisualizationService.generateNodeDataChildren(nodeData);

    console.log({ nodeData, children });
  });
});
