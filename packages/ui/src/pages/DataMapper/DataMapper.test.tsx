import { DataMapper } from './DataMapper';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { TestUtil } from '../../components/DataMapper/test/test-util';
import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentInitializationModel,
} from '../../components/DataMapper/models/document';
import { DocumentType } from '../../components/DataMapper/models/path';

describe('DataMapper', () => {
  it('should render initial XSLT mappings', () => {
    console.log(__dirname);

    render(<DataMapper initialXsltFile={TestUtil.shipOrderToShipOrderXslt} onUpdateMappings={jest.fn()} />);
    // TODO assert mappings are restored even without loading schema... But how? Lines are not drawn...
  });

  it('should render initial XSLT mappings with initial documents', async () => {
    const documentInitializationModel = new DocumentInitializationModel();
    documentInitializationModel.sourceBody = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      [TestUtil.orderXsd],
    );
    documentInitializationModel.targetBody = new DocumentDefinition(
      DocumentType.TARGET_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      [TestUtil.orderXsd],
    );
    documentInitializationModel.sourceParameters['testparam1'] = new DocumentDefinition(
      DocumentType.PARAM,
      DocumentDefinitionType.Primitive,
      'testparam1',
    );
    const onUpdateMappings = jest.fn();
    const onUpdateDocument = jest.fn();
    render(
      <DataMapper
        documentInitializationModel={documentInitializationModel}
        initialXsltFile={TestUtil.shipOrderToShipOrderXslt}
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

  it('should render toolbar menu in standalone mode', async () => {
    render(<DataMapper />);
    expect(await screen.findByTestId('main-menu-button')).toBeInTheDocument();
  });

  it('should not render toolbar menu in embedded mode', async () => {
    render(<DataMapper isEmbedded={true} />);
    try {
      await screen.findByTestId('main-menu-button');
      fail();
    } catch (e) {
      expect(e).toBeTruthy();
    }
  });
});
