import { render, screen } from '@testing-library/react';
import { IVisualizationNode } from '../../models';
import { DocumentDefinitionType } from '../../models/datamapper/document';
import { IDataMapperMetadata } from '../../models/datamapper/metadata';
import { IMetadataApi, MetadataProvider } from '../../providers';
import { shipOrderToShipOrderXslt, shipOrderXsd } from '../../stubs/data-mapper';
import { DataMapperPage } from './DataMapperPage';

describe('DataMapperPage', () => {
  const vizNode = {
    getId: () => 'route-1234',
    getComponentSchema: () => {
      return {
        definition: { id: 'kaoto-datamapper-1234' },
      };
    },
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
        <DataMapperPage vizNode={vizNode} />
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
        <DataMapperPage vizNode={vizNode} />
      </MetadataProvider>,
    );
    await screen.findByTestId('card-source-parameters-header');
    expect(screen.getByTestId('node-source-doc-param-testparam1')).toBeInTheDocument();
    expect(screen.getByTestId('node-source-doc-sourceBody-Body')).toBeInTheDocument();
    expect(screen.getByTestId('node-target-doc-targetBody-Body')).toBeInTheDocument();
    expect(screen.getByTestId(/node-source-field-OrderId-\n*/)).toBeInTheDocument();
    expect(screen.getByTestId(/node-target-field-OrderId-\n*/)).toBeInTheDocument();
    // TODO assert mappings are restored even without loading schema... But how? Lines are not drawn...
  });

  it('should not render toolbar menu in embedded mode', async () => {
    render(
      <MetadataProvider api={api}>
        <DataMapperPage vizNode={vizNode} />
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
    render(<DataMapperPage />);
    const error = await screen.findByText('No associated DataMapper step was provided.');
    expect(error).toBeInTheDocument();
  });
});
