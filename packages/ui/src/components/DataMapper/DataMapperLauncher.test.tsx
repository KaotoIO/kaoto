import { fireEvent, render, screen } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { IVisualizationNode } from '../../models';
import { IMetadataApi, MetadataContext } from '../../providers/metadata.provider';
import { Links } from '../../router/links.models';
import { DataMapperMetadataService } from '../../services/datamapper-metadata.service';
import { DataMapperLauncher } from './DataMapperLauncher';

// Mock the navigate function
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock the DataMapperMetadataService
jest.mock('../../services/datamapper-metadata.service');

describe('DataMapperLauncher', () => {
  const mockMetadataContext: IMetadataApi = {
    onStepUpdated: jest.fn(),
    getMetadata: jest.fn(),
    setMetadata: jest.fn(),
    getResourceContent: jest.fn(),
    saveResourceContent: jest.fn(),
    deleteResource: jest.fn(),
    askUserForFileSelection: jest.fn(),
    getSuggestions: jest.fn(),
    shouldSaveSchema: false,
  };

  const createMockVizNode = (xsltDocument?: string): IVisualizationNode => {
    const mockSteps = xsltDocument
      ? [
          {
            xslt: {
              transformation: xsltDocument,
            },
          },
        ]
      : [];

    return {
      getNodeDefinition: jest.fn().mockReturnValue({
        id: 'test-node-id',
        steps: mockSteps,
      }),
    } as unknown as IVisualizationNode;
  };

  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <MemoryRouter>
      <MetadataContext.Provider value={mockMetadataContext}>{children}</MetadataContext.Provider>
    </MemoryRouter>
  );

  const noMetadataWrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <MemoryRouter>
      <MetadataContext.Provider value={undefined}>{children}</MetadataContext.Provider>
    </MemoryRouter>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when metadata context is not available', () => {
    it('should render an info alert with message about VS Code extension', () => {
      render(<DataMapperLauncher />, { wrapper: noMetadataWrapper });

      expect(screen.getByText('The Kaoto DataMapper cannot be configured')).toBeInTheDocument();
      expect(
        screen.getByText(/At the moment, the Kaoto DataMapper cannot be configured using the browser directly/),
      ).toBeInTheDocument();
    });

    it('should render links to VS Code marketplace and Open VSX Registry', () => {
      const { container } = render(<DataMapperLauncher />, { wrapper: noMetadataWrapper });

      const marketplaceLink = container.querySelector(
        'a[href="https://marketplace.visualstudio.com/items?itemName=redhat.vscode-kaoto"]',
      );
      const openVsxLink = container.querySelector('a[href="https://open-vsx.org/extension/redhat/vscode-kaoto"]');

      expect(marketplaceLink).toBeInTheDocument();
      expect(openVsxLink).toBeInTheDocument();
    });
  });

  describe('when metadata context is available', () => {
    it('should render the data mapper launcher form', () => {
      const vizNode = createMockVizNode('test-document.xsl');
      (DataMapperMetadataService.getXSLTDocumentName as jest.Mock).mockReturnValue('test-document.xsl');

      render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

      expect(screen.getByText('Document')).toBeInTheDocument();
      expect(
        screen.getByTitle('The name of the XSLT document that is used by the Kaoto DataMapper'),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Launch the Kaoto DataMapper editor/i })).toBeInTheDocument();
    });

    it('should display the XSLT document name when defined', () => {
      const vizNode = createMockVizNode('my-transformation.xsl');
      (DataMapperMetadataService.getXSLTDocumentName as jest.Mock).mockReturnValue('my-transformation.xsl');

      render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

      const input = screen.getByTitle(
        'The name of the XSLT document that is used by the Kaoto DataMapper',
      ) as HTMLInputElement;
      expect(input.value).toBe('my-transformation.xsl');
      expect(input).toHaveAttribute('readonly');
    });

    it('should show error state when XSLT document is not defined', () => {
      const vizNode = createMockVizNode();
      (DataMapperMetadataService.getXSLTDocumentName as jest.Mock).mockReturnValue(undefined);

      render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

      expect(
        screen.getByText(
          'This Kaoto DataMapper step is missing some configuration. Please click the configure button to configure it.',
        ),
      ).toBeInTheDocument();
    });

    it('should navigate to DataMapper page when Configure button is clicked', () => {
      const vizNode = createMockVizNode('test-document.xsl');
      (DataMapperMetadataService.getXSLTDocumentName as jest.Mock).mockReturnValue('test-document.xsl');

      render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

      const configureButton = screen.getByRole('button', { name: /Launch the Kaoto DataMapper editor/i });
      fireEvent.click(configureButton);

      expect(mockNavigate).toHaveBeenCalledWith(`${Links.DataMapper}/test-node-id`);
    });

    it('should render help icon with popover', () => {
      const vizNode = createMockVizNode('test-document.xsl');
      (DataMapperMetadataService.getXSLTDocumentName as jest.Mock).mockReturnValue('test-document.xsl');

      render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

      const helpButton = screen.getByRole('button', { name: 'More info' });
      expect(helpButton).toBeInTheDocument();
    });

    it('should render Configure button with wrench icon', () => {
      const vizNode = createMockVizNode('test-document.xsl');
      (DataMapperMetadataService.getXSLTDocumentName as jest.Mock).mockReturnValue('test-document.xsl');

      render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

      const configureButton = screen.getByRole('button', { name: /Launch the Kaoto DataMapper editor/i });
      expect(configureButton).toHaveClass('pf-m-primary');
      expect(configureButton).toHaveTextContent('Configure');
    });
  });
});
