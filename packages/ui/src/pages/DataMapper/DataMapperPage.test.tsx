import { DataMapperPage } from './DataMapperPage';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentInitializationModel,
} from '../../models/datamapper/document';
import { DocumentType } from '../../models/datamapper/path';
import { shipOrderToShipOrderXslt, shipOrderXsd } from '../../stubs/data-mapper';

describe('DataMapperPage', () => {
  it('should render initial XSLT mappings', async () => {
    console.log(__dirname);

    render(<DataMapperPage initialXsltFile={shipOrderToShipOrderXslt} onUpdateMappings={jest.fn()} />);
    await screen.findByTestId('card-source-parameters-header');
    // TODO assert mappings are restored even without loading schema... But how? Lines are not drawn...
  });

  it('should render initial XSLT mappings with initial documents', async () => {
    const documentInitializationModel = new DocumentInitializationModel();
    documentInitializationModel.sourceBody = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      [shipOrderXsd],
    );
    documentInitializationModel.targetBody = new DocumentDefinition(
      DocumentType.TARGET_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      [shipOrderXsd],
    );
    documentInitializationModel.sourceParameters['testparam1'] = new DocumentDefinition(
      DocumentType.PARAM,
      DocumentDefinitionType.Primitive,
      'testparam1',
    );
    const onUpdateMappings = jest.fn();
    const onUpdateDocument = jest.fn();
    render(
      <DataMapperPage
        documentInitializationModel={documentInitializationModel}
        initialXsltFile={shipOrderToShipOrderXslt}
        onUpdateMappings={onUpdateMappings}
        onUpdateDocument={onUpdateDocument}
      />,
    );
    const parametersHeader = await screen.findByTestId('card-source-parameters-header');
    act(() => {
      fireEvent.click(parametersHeader.getElementsByTagName('button')[0]);
    });
    expect(screen.getByTestId('node-source-doc-param-testparam1')).toBeInTheDocument();
    expect(screen.getByTestId('node-source-doc-sourceBody-Body')).toBeInTheDocument();
    expect(screen.getByTestId('node-target-doc-targetBody-Body')).toBeInTheDocument();
    expect(screen.getByTestId(/node-source-field-OrderId-\n*/)).toBeInTheDocument();
    expect(screen.getByTestId(/node-target-field-OrderId-\n*/)).toBeInTheDocument();
    // TODO assert mappings are restored even without loading schema... But how? Lines are not drawn...
  });

  it('should not render toolbar menu in embedded mode', async () => {
    render(<DataMapperPage isEmbedded={true} />);
    try {
      await screen.findByTestId('main-menu-button');
      fail();
    } catch (e) {
      expect(e).toBeTruthy();
    }
  });
});
