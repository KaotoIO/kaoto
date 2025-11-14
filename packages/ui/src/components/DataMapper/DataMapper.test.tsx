import { render, screen, waitFor } from '@testing-library/react';
import { IVisualizationNode } from '../../models';
import { DocumentDefinitionType } from '../../models/datamapper/document';
import { IDataMapperMetadata } from '../../models/datamapper/metadata';
import { IMetadataApi, MetadataProvider } from '../../providers';
import { shipOrderToShipOrderXslt, shipOrderXsd } from '../../stubs/datamapper/data-mapper';
import { DataMapper } from './DataMapper';

describe('DataMapperPage', () => {
  const vizNode = {
    getId: () => 'route-1234',
    getNodeDefinition: () => ({ id: 'kaoto-datamapper-1234' }),
  } as unknown as IVisualizationNode;
  const defaultMetadata: IDataMapperMetadata = {
    sourceBody: {
      type: DocumentDefinitionType.Primitive,
      filePath: [],
    },
    sourceParameters: {},
    targetBody: {
      type: DocumentDefinitionType.Primitive,
      filePath: [],
    },
    xsltPath: `kaoto-datamapper-1234.xsl`,
  };

  let metadata: IDataMapperMetadata;
  let fileContents: Record<string, string>;
  const api = {
    getMetadata: (_key: string) => {
      return Promise.resolve(metadata);
    },
    setMetadata: (_key: string, meta: IDataMapperMetadata) => {
      Object.assign(metadata, meta);
      return Promise.resolve();
    },
    getResourceContent: (path: string) => {
      return Promise.resolve(fileContents[path]);
    },
    saveResourceContent: (path: string, content: string) => {
      fileContents[path] = content;
      return Promise.resolve();
    },
  } as IMetadataApi;

  beforeEach(() => {
    metadata = defaultMetadata;
    fileContents = {};
  });

  it('should render initial XSLT mappings', async () => {
    fileContents[metadata.xsltPath] = shipOrderToShipOrderXslt;
    render(
      <MetadataProvider api={api}>
        <DataMapper vizNode={vizNode} />
      </MetadataProvider>,
    );
    await screen.findByTestId('card-source-parameters-header');
    // TODO assert mappings are restored even without loading schema... But how? Lines are not drawn...
  });

  it('should render initial XSLT mappings with initial documents', async () => {
    fileContents['ShipOrder.xsd'] = shipOrderXsd;
    metadata.sourceBody = {
      filePath: ['ShipOrder.xsd'],
      type: DocumentDefinitionType.XML_SCHEMA,
    };
    metadata.targetBody = {
      filePath: ['ShipOrder.xsd'],
      type: DocumentDefinitionType.XML_SCHEMA,
    };
    metadata.sourceParameters['testparam1'] = {
      filePath: [],
      type: DocumentDefinitionType.Primitive,
    };
    render(
      <MetadataProvider api={api}>
        <DataMapper vizNode={vizNode} />
      </MetadataProvider>,
    );

    let executed = false;
    await waitFor(() => {
      expect(screen.getByTestId('card-source-parameters-header')).toBeInTheDocument();
      expect(screen.getByTestId('document-doc-param-testparam1')).toBeInTheDocument();
      expect(screen.getByTestId('document-doc-sourceBody-Body')).toBeInTheDocument();
      expect(screen.getByTestId('document-doc-targetBody-Body')).toBeInTheDocument();
      expect(screen.getByTestId(/node-source-fx-OrderId-\n*/)).toBeInTheDocument();
      expect(screen.getByTestId(/node-target-fx-OrderId-\n*/)).toBeInTheDocument();
      executed = true;
    });
    /** We cannot rely on expect.assertions(6) since when there's a failure, an extra expectation is run */
    expect(executed).toBeTruthy();
    // TODO assert mappings are restored even without loading schema... But how? Lines are not drawn...
  });

  it('should not render toolbar menu in embedded mode', async () => {
    render(
      <MetadataProvider api={api}>
        <DataMapper vizNode={vizNode} />
      </MetadataProvider>,
    );
    try {
      await screen.findByTestId('main-menu-button');
      fail();
    } catch (e) {
      expect(e).toBeTruthy();
    }
  });

  it('should show an error message if vizNode is not provided', async () => {
    render(<DataMapper />);
    const error = await screen.findByText('No associated DataMapper step was provided.');
    expect(error).toBeInTheDocument();
  });
});
