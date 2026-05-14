import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { IVisualizationNode } from '../../models';
import { SourceSchemaType } from '../../models/camel';
import { DocumentDefinitionType } from '../../models/datamapper';
import { IDataMapperMetadata } from '../../models/datamapper/metadata';
import { EntitiesContext } from '../../providers';
import { IMetadataApi, MetadataContext } from '../../providers/metadata.provider';
import { Links } from '../../router/links.models';
import { DataMapperMetadataService } from '../../services/datamapper-metadata.service';
import { DataMapperStepService } from '../../services/datamapper-step.service';
import { DataMapperLauncher } from './DataMapperLauncher';

// Mock the navigate function
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock the services
jest.mock('../../services/datamapper-step.service');
jest.mock('../../services/datamapper-metadata.service');

describe('DataMapperLauncher', () => {
  const mockMetadataContext: IMetadataApi = {
    onStepUpdated: jest.fn(),
    getMetadata: jest.fn(),
    setMetadata: jest.fn(),
    getResourceContent: jest.fn().mockResolvedValue('mock xslt content'), // Mock file exists
    saveResourceContent: jest.fn(),
    deleteResource: jest.fn(),
    askUserForFileSelection: jest.fn(),
    getSuggestions: jest.fn(),
    shouldSaveSchema: false,
  };

  const mockCamelResource = {
    getVisualEntities: jest.fn().mockReturnValue([]),
    getEntities: jest.fn().mockReturnValue([]),
    addNewEntity: jest.fn(),
    removeEntity: jest.fn(),
    updateEntity: jest.fn(),
    toJSON: jest.fn(),
    sortEntities: jest.fn(),
    getType: jest.fn().mockReturnValue(SourceSchemaType.Route),
    setComments: jest.fn(),
    getComments: jest.fn().mockReturnValue([]),
    supportsMultipleVisualEntities: jest.fn().mockReturnValue(false),
    createEntityFromStepCatalog: jest.fn(),
    getCanvasEntityList: jest.fn().mockReturnValue([]),
    getSerializerType: jest.fn(),
    setSerializer: jest.fn(),
    getCompatibleComponents: jest.fn().mockReturnValue([]),
    getCompatibleRuntimes: jest.fn().mockReturnValue([]),
  };

  const mockEntitiesContext = {
    currentEntity: null,
    entities: [],
    visualEntities: [],
    camelResource: mockCamelResource,
    currentSchemaType: SourceSchemaType.Route,
    updateSourceCodeFromEntities: jest.fn(),
    updateEntitiesFromSource: jest.fn(),
    updateEntitiesFromCamelResource: jest.fn(),
    setCurrentEntity: jest.fn(),
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

    const mockModel = {
      id: 'test-node-id',
      steps: mockSteps,
    };

    return {
      getNodeDefinition: jest.fn().mockReturnValue(mockModel),
      updateModel: jest.fn(),
    } as unknown as IVisualizationNode;
  };

  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <MemoryRouter>
      <MetadataContext.Provider value={mockMetadataContext}>
        <EntitiesContext.Provider value={mockEntitiesContext}>{children}</EntitiesContext.Provider>
      </MetadataContext.Provider>
    </MemoryRouter>
  );

  const noMetadataWrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <MemoryRouter>
      <MetadataContext.Provider value={undefined}>{children}</MetadataContext.Provider>
    </MemoryRouter>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress act() warnings for async useEffect in component
    jest.spyOn(console, 'error').mockImplementation((message) => {
      if (typeof message === 'string' && message.includes('not wrapped in act')) {
        return;
      }
      console.error(message);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
    it('should render the data mapper launcher form', async () => {
      const vizNode = createMockVizNode('test-document.xsl');
      (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');

      render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('Document')).toBeInTheDocument();
      });
      expect(
        screen.getByTitle('The name of the XSLT document that is used by the Kaoto DataMapper'),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Launch the Kaoto DataMapper editor/i })).toBeInTheDocument();
    });

    it('should display the XSLT document name when defined', async () => {
      const vizNode = createMockVizNode('my-transformation.xsl');
      (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('my-transformation.xsl');

      render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

      const input = (await waitFor(() =>
        screen.getByTitle('The name of the XSLT document that is used by the Kaoto DataMapper'),
      )) as HTMLInputElement;
      expect(input.value).toBe('my-transformation.xsl');
    });

    it('should show error state when XSLT document is not defined', () => {
      const vizNode = createMockVizNode();
      (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue(undefined);

      render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

      expect(
        screen.getByText(
          'This Kaoto DataMapper step is missing some configuration. Please click the configure button to configure it.',
        ),
      ).toBeInTheDocument();
    });

    it('should navigate to DataMapper page when Configure button is clicked', () => {
      const vizNode = createMockVizNode('test-document.xsl');
      (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');

      render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

      const configureButton = screen.getByRole('button', { name: /Launch the Kaoto DataMapper editor/i });
      fireEvent.click(configureButton);

      expect(mockNavigate).toHaveBeenCalledWith(`${Links.DataMapper}/test-node-id`);
    });

    it('should render help icon with popover', async () => {
      const vizNode = createMockVizNode('test-document.xsl');
      (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');

      render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

      const helpButton = await waitFor(() => screen.getByRole('button', { name: 'More info' }));
      expect(helpButton).toBeInTheDocument();
    });

    it('should render Configure button with wrench icon', () => {
      const vizNode = createMockVizNode('test-document.xsl');
      (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');

      render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

      const configureButton = screen.getByRole('button', { name: /Launch the Kaoto DataMapper editor/i });
      expect(configureButton).toHaveClass('pf-m-primary');
      expect(configureButton).toHaveTextContent('Configure');
    });

    describe('file existence checking', () => {
      it('should not show form when file does not exist', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');
        mockMetadataContext.getResourceContent = jest.fn().mockResolvedValue(undefined);

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.queryByText('Document')).not.toBeInTheDocument();
        });
      });

      it('should show form when file exists', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');
        mockMetadataContext.getResourceContent = jest.fn().mockResolvedValue('mock xslt content');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByText('Document')).toBeInTheDocument();
        });
      });

      it('should not check file existence when xsltDocumentName is undefined', async () => {
        const vizNode = createMockVizNode();
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue(undefined);
        const getResourceContentSpy = jest.fn();
        mockMetadataContext.getResourceContent = getResourceContentSpy;

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.queryByText('Document')).not.toBeInTheDocument();
        });
        expect(getResourceContentSpy).not.toHaveBeenCalled();
      });

      it('should not check file existence when metadata is undefined', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');
        const getResourceContentSpy = jest.fn();

        render(
          <MemoryRouter>
            <MetadataContext.Provider value={undefined}>
              <EntitiesContext.Provider value={mockEntitiesContext}>
                <DataMapperLauncher vizNode={vizNode} />
              </EntitiesContext.Provider>
            </MetadataContext.Provider>
          </MemoryRouter>,
        );

        await waitFor(() => {
          expect(screen.getByText('The Kaoto DataMapper cannot be configured')).toBeInTheDocument();
        });
        expect(getResourceContentSpy).not.toHaveBeenCalled();
      });
    });

    describe('document name validation', () => {
      beforeEach(() => {
        mockMetadataContext.getResourceContent = jest.fn().mockResolvedValue('mock xslt content');
      });

      it('should accept valid .xsl filename', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        const input = (await waitFor(() =>
          screen.getByTitle('The name of the XSLT document that is used by the Kaoto DataMapper'),
        )) as HTMLInputElement;

        fireEvent.change(input, { target: { value: 'new-document.xsl' } });

        await waitFor(() => {
          expect(input.value).toBe('new-document.xsl');
          expect(screen.queryByText(/XSLT document name is required/)).not.toBeInTheDocument();
        });
      });

      it('should show error for empty filename', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        const input = (await waitFor(() =>
          screen.getByTitle('The name of the XSLT document that is used by the Kaoto DataMapper'),
        )) as HTMLInputElement;

        fireEvent.change(input, { target: { value: '' } });

        await waitFor(() => {
          expect(
            screen.getByText('XSLT document name is required and must be a valid filename ending with .xsl.'),
          ).toBeInTheDocument();
        });
      });

      it('should show error for whitespace-only filename', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        const input = (await waitFor(() =>
          screen.getByTitle('The name of the XSLT document that is used by the Kaoto DataMapper'),
        )) as HTMLInputElement;

        fireEvent.change(input, { target: { value: '   ' } });

        await waitFor(() => {
          expect(
            screen.getByText('XSLT document name is required and must be a valid filename ending with .xsl.'),
          ).toBeInTheDocument();
        });
      });

      it('should show error for filename without extension', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        const input = (await waitFor(() =>
          screen.getByTitle('The name of the XSLT document that is used by the Kaoto DataMapper'),
        )) as HTMLInputElement;

        fireEvent.change(input, { target: { value: 'document' } });

        await waitFor(() => {
          expect(
            screen.getByText('XSLT document name is required and must be a valid filename ending with .xsl.'),
          ).toBeInTheDocument();
        });
      });

      it('should show error for filename with wrong extension', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        const input = (await waitFor(() =>
          screen.getByTitle('The name of the XSLT document that is used by the Kaoto DataMapper'),
        )) as HTMLInputElement;

        fireEvent.change(input, { target: { value: 'document.xml' } });

        await waitFor(() => {
          expect(
            screen.getByText('XSLT document name is required and must be a valid filename ending with .xsl.'),
          ).toBeInTheDocument();
        });
      });

      it('should show error for filename starting with dot', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        const input = (await waitFor(() =>
          screen.getByTitle('The name of the XSLT document that is used by the Kaoto DataMapper'),
        )) as HTMLInputElement;

        fireEvent.change(input, { target: { value: '.document.xsl' } });

        await waitFor(() => {
          expect(
            screen.getByText('XSLT document name is required and must be a valid filename ending with .xsl.'),
          ).toBeInTheDocument();
        });
      });

      it('should show error for filename with invalid characters', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        const input = (await waitFor(() =>
          screen.getByTitle('The name of the XSLT document that is used by the Kaoto DataMapper'),
        )) as HTMLInputElement;

        const invalidFilenames = ['doc<ument.xsl', 'doc>ument.xsl', 'doc:ument.xsl', 'doc"ument.xsl', 'doc|ument.xsl'];

        for (const invalidName of invalidFilenames) {
          fireEvent.change(input, { target: { value: invalidName } });

          await waitFor(() => {
            expect(
              screen.getByText('XSLT document name is required and must be a valid filename ending with .xsl.'),
            ).toBeInTheDocument();
          });
        }
      });

      it('should not show error when filename matches original', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        const input = (await waitFor(() =>
          screen.getByTitle('The name of the XSLT document that is used by the Kaoto DataMapper'),
        )) as HTMLInputElement;

        // Change to invalid, then back to original
        fireEvent.change(input, { target: { value: 'invalid' } });
        fireEvent.change(input, { target: { value: 'test-document.xsl' } });

        await waitFor(() => {
          expect(screen.queryByText(/XSLT document name is required/)).not.toBeInTheDocument();
        });
      });
    });

    describe('button disabled state', () => {
      beforeEach(() => {
        mockMetadataContext.getResourceContent = jest.fn().mockResolvedValue('mock xslt content');
      });

      it('should disable button when filename is invalid', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        const input = (await waitFor(() =>
          screen.getByTitle('The name of the XSLT document that is used by the Kaoto DataMapper'),
        )) as HTMLInputElement;

        fireEvent.change(input, { target: { value: 'invalid' } });

        await waitFor(() => {
          const button = screen.getByRole('button', { name: /Launch the Kaoto DataMapper editor/i });
          expect(button).toBeDisabled();
        });
      });

      it('should enable button when filename is valid', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        const input = (await waitFor(() =>
          screen.getByTitle('The name of the XSLT document that is used by the Kaoto DataMapper'),
        )) as HTMLInputElement;

        fireEvent.change(input, { target: { value: 'new-document.xsl' } });

        await waitFor(() => {
          const button = screen.getByRole('button', { name: /Launch the Kaoto DataMapper editor/i });
          expect(button).not.toBeDisabled();
        });
      });

      it('should enable button when file does not exist', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');
        mockMetadataContext.getResourceContent = jest.fn().mockResolvedValue(undefined);

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          const button = screen.getByRole('button', { name: /Launch the Kaoto DataMapper editor/i });
          expect(button).not.toBeDisabled();
        });
      });
    });

    describe('file renaming workflow', () => {
      const mockMetadata: IDataMapperMetadata = {
        sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [], fieldTypeOverrides: [] },
        sourceParameters: {},
        targetBody: { type: DocumentDefinitionType.Primitive, filePath: [], fieldTypeOverrides: [] },
        xsltPath: 'test-document.xsl',
        namespaceMap: {},
      };

      beforeEach(() => {
        mockMetadataContext.getResourceContent = jest.fn().mockResolvedValue('mock xslt content');
        mockMetadataContext.getMetadata = jest.fn().mockResolvedValue(mockMetadata);
        mockMetadataContext.saveResourceContent = jest.fn().mockResolvedValue(undefined);
        mockMetadataContext.deleteResource = jest.fn().mockResolvedValue(undefined);
        (DataMapperMetadataService.updateXsltPath as jest.Mock) = jest.fn().mockResolvedValue(undefined);
        (DataMapperStepService.updateXsltFileName as jest.Mock) = jest.fn();
        (DataMapperStepService.getDataMapperMetadataId as jest.Mock) = jest.fn().mockReturnValue('test-node-id');
      });

      it('should rename file when name is changed and Configure is clicked', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        const input = (await waitFor(() =>
          screen.getByTitle('The name of the XSLT document that is used by the Kaoto DataMapper'),
        )) as HTMLInputElement;

        fireEvent.change(input, { target: { value: 'renamed-document.xsl' } });

        const button = screen.getByRole('button', { name: /Launch the Kaoto DataMapper editor/i });
        fireEvent.click(button);

        await waitFor(() => {
          expect(mockMetadataContext.getMetadata).toHaveBeenCalledWith('test-node-id');
          expect(mockMetadataContext.getResourceContent).toHaveBeenCalledWith('test-document.xsl');
          expect(mockMetadataContext.saveResourceContent).toHaveBeenCalledWith(
            'renamed-document.xsl',
            'mock xslt content',
          );
          expect(DataMapperMetadataService.updateXsltPath).toHaveBeenCalledWith(
            mockMetadataContext,
            'test-node-id',
            mockMetadata,
            'renamed-document.xsl',
          );
          expect(DataMapperStepService.updateXsltFileName).toHaveBeenCalledWith(
            vizNode,
            'renamed-document.xsl',
            mockEntitiesContext,
          );
          expect(mockMetadataContext.deleteResource).toHaveBeenCalledWith('test-document.xsl');
          expect(mockNavigate).toHaveBeenCalledWith(`${Links.DataMapper}/test-node-id`);
        });
      });

      it('should not rename file when name is unchanged', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByText('Document')).toBeInTheDocument();
        });

        const button = screen.getByRole('button', { name: /Launch the Kaoto DataMapper editor/i });
        fireEvent.click(button);

        await waitFor(() => {
          expect(mockMetadataContext.saveResourceContent).not.toHaveBeenCalled();
          expect(mockMetadataContext.deleteResource).not.toHaveBeenCalled();
          expect(mockNavigate).toHaveBeenCalledWith(`${Links.DataMapper}/test-node-id`);
        });
      });

      it('should not rename file when file does not exist', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');
        mockMetadataContext.getResourceContent = jest.fn().mockResolvedValue(undefined);

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.queryByText('Document')).not.toBeInTheDocument();
        });

        const button = screen.getByRole('button', { name: /Launch the Kaoto DataMapper editor/i });
        fireEvent.click(button);

        await waitFor(() => {
          expect(mockMetadataContext.saveResourceContent).not.toHaveBeenCalled();
          expect(mockMetadataContext.deleteResource).not.toHaveBeenCalled();
          expect(mockNavigate).toHaveBeenCalledWith(`${Links.DataMapper}/test-node-id`);
        });
      });

      it('should handle missing metadata gracefully', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');
        mockMetadataContext.getMetadata = jest.fn().mockResolvedValue(undefined);

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        const input = (await waitFor(() =>
          screen.getByTitle('The name of the XSLT document that is used by the Kaoto DataMapper'),
        )) as HTMLInputElement;

        fireEvent.change(input, { target: { value: 'renamed-document.xsl' } });

        const button = screen.getByRole('button', { name: /Launch the Kaoto DataMapper editor/i });
        fireEvent.click(button);

        await waitFor(() => {
          expect(mockMetadataContext.saveResourceContent).not.toHaveBeenCalled();
          expect(mockNavigate).toHaveBeenCalledWith(`${Links.DataMapper}/test-node-id`);
        });
      });

      it('should handle missing file content gracefully', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');
        mockMetadataContext.getResourceContent = jest
          .fn()
          .mockResolvedValueOnce('mock xslt content')
          .mockResolvedValueOnce(undefined);

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        const input = (await waitFor(() =>
          screen.getByTitle('The name of the XSLT document that is used by the Kaoto DataMapper'),
        )) as HTMLInputElement;

        fireEvent.change(input, { target: { value: 'renamed-document.xsl' } });

        const button = screen.getByRole('button', { name: /Launch the Kaoto DataMapper editor/i });
        fireEvent.click(button);

        await waitFor(() => {
          expect(mockMetadataContext.saveResourceContent).not.toHaveBeenCalled();
          expect(mockMetadataContext.deleteResource).not.toHaveBeenCalled();
          expect(mockNavigate).toHaveBeenCalledWith(`${Links.DataMapper}/test-node-id`);
        });
      });

      it('should trim whitespace from new filename before renaming', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        const input = (await waitFor(() =>
          screen.getByTitle('The name of the XSLT document that is used by the Kaoto DataMapper'),
        )) as HTMLInputElement;

        fireEvent.change(input, { target: { value: '  renamed-document.xsl  ' } });

        const button = screen.getByRole('button', { name: /Launch the Kaoto DataMapper editor/i });
        fireEvent.click(button);

        await waitFor(() => {
          expect(mockMetadataContext.saveResourceContent).toHaveBeenCalledWith(
            'renamed-document.xsl',
            'mock xslt content',
          );
          expect(DataMapperMetadataService.updateXsltPath).toHaveBeenCalledWith(
            mockMetadataContext,
            'test-node-id',
            mockMetadata,
            'renamed-document.xsl',
          );
          expect(DataMapperStepService.updateXsltFileName).toHaveBeenCalledWith(
            vizNode,
            'renamed-document.xsl',
            mockEntitiesContext,
          );
        });
      });
    });
  });
});
