import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import type { MockInstance } from 'vitest';

import { IVisualizationNode, KaotoResource } from '../../models';
import { SourceSchemaType } from '../../models/camel';
import { DocumentDefinitionType } from '../../models/datamapper';
import { IDataMapperMetadata } from '../../models/datamapper/metadata';
import { EntitiesContext } from '../../providers';
import { IMetadataApi, MetadataContext } from '../../providers/metadata.provider';
import { Links } from '../../router/links.models';
import { DataMapperMetadataService } from '../../services/datamapper-metadata.service';
import { DataMapperStepService } from '../../services/datamapper-step.service';
import { DataMapperValidationStepService } from '../../services/datamapper-validation-step.service';
import { DataMapperLauncher } from './DataMapperLauncher';

/** Renders the current router location so navigation can be asserted on */
const LocationProbe: FunctionComponent = () => {
  const location = useLocation();
  return <span data-testid="current-location">{location.pathname}</span>;
};

describe('DataMapperLauncher', () => {
  const mockMetadataContext: IMetadataApi = {
    onStepUpdated: vi.fn(),
    getMetadata: vi.fn(),
    setMetadata: vi.fn(),
    getResourceContent: vi.fn().mockResolvedValue('mock xslt content'), // Mock file exists
    saveResourceContent: vi.fn(),
    isResourceExist: vi.fn().mockResolvedValue(true), // Mock file exists
    deleteResource: vi.fn(),
    askUserForFileSelection: vi.fn(),
    getSuggestions: vi.fn(),
    shouldSaveSchema: false,
  };

  const mockCamelResource: KaotoResource = {
    initialize: vi.fn(),
    getVisualEntities: vi.fn().mockReturnValue([]),
    getEntities: vi.fn().mockReturnValue([]),
    addNewEntity: vi.fn(),
    removeEntity: vi.fn(),
    toSourceCode: vi.fn(),
    toJSON: vi.fn(),
    getType: vi.fn().mockReturnValue(SourceSchemaType.RouteYaml),
    supportsMultipleVisualEntities: vi.fn().mockReturnValue(false),
    getCanvasEntityList: vi.fn().mockReturnValue([]),
    supportedEntities: [],
    getCompatibleComponents: vi.fn().mockReturnValue([]),
    getCompatibleRuntimes: vi.fn().mockReturnValue([]),
  };

  const mockEntitiesContext = {
    currentEntity: null,
    entities: [],
    visualEntities: [],
    camelResource: mockCamelResource,
    currentSchemaType: SourceSchemaType.RouteYaml,
    updateSourceCodeFromEntities: vi.fn(),
    updateEntitiesFromSource: vi.fn(),
    updateEntitiesFromCamelResource: vi.fn(),
    setCurrentEntity: vi.fn(),
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
      data: { definition: mockModel },
      updateModel: vi.fn(),
    } as unknown as IVisualizationNode;
  };

  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <MemoryRouter>
      <MetadataContext.Provider value={mockMetadataContext}>
        <EntitiesContext.Provider value={mockEntitiesContext}>{children}</EntitiesContext.Provider>
      </MetadataContext.Provider>
      <LocationProbe />
    </MemoryRouter>
  );

  let getXsltFileNameSpy: MockInstance<typeof DataMapperStepService.getXsltFileName>;
  let getDataMapperMetadataIdSpy: MockInstance<typeof DataMapperStepService.getDataMapperMetadataId>;
  let updateXsltFileNameSpy: MockInstance<typeof DataMapperStepService.updateXsltFileName>;
  let isValidationEnabledSpy: MockInstance<typeof DataMapperValidationStepService.isValidationEnabled>;
  let addValidationStepSpy: MockInstance<typeof DataMapperValidationStepService.addValidationStep>;
  let removeValidationStepSpy: MockInstance<typeof DataMapperValidationStepService.removeValidationStep>;

  const noMetadataWrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <MemoryRouter>
      <MetadataContext.Provider value={undefined}>{children}</MetadataContext.Provider>
    </MemoryRouter>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    getXsltFileNameSpy = vi.spyOn(DataMapperStepService, 'getXsltFileName').mockReturnValue(undefined);
    getDataMapperMetadataIdSpy = vi.spyOn(DataMapperStepService, 'getDataMapperMetadataId');
    updateXsltFileNameSpy = vi.spyOn(DataMapperStepService, 'updateXsltFileName').mockImplementation(() => {});
    vi.spyOn(DataMapperMetadataService, 'updateXsltPath').mockResolvedValue(undefined);
    isValidationEnabledSpy = vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockReturnValue(false);
    addValidationStepSpy = vi
      .spyOn(DataMapperValidationStepService, 'addValidationStep')
      .mockImplementation(() => undefined);
    removeValidationStepSpy = vi
      .spyOn(DataMapperValidationStepService, 'removeValidationStep')
      .mockImplementation(() => undefined);
    const originalConsoleError = console.error;
    // Suppress act() warnings for async useEffect in component
    vi.spyOn(console, 'error').mockImplementation((message) => {
      if (typeof message === 'string' && message.includes('not wrapped in act')) {
        return;
      }
      originalConsoleError(message);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
      getXsltFileNameSpy.mockReturnValue('test-document.xsl');

      render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('Document')).toBeInTheDocument();
      });
      expect(screen.getByTestId('xslt-document-name')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Launch the Kaoto DataMapper editor/i })).toBeInTheDocument();
    });

    it('should display the XSLT document name when defined', async () => {
      const vizNode = createMockVizNode('my-transformation.xsl');
      getXsltFileNameSpy.mockReturnValue('my-transformation.xsl');

      render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

      const span = await screen.findByTestId('xslt-document-name');
      expect(span).toHaveTextContent('my-transformation.xsl');
    });

    it('should show error state when XSLT document is not defined', () => {
      const vizNode = createMockVizNode();
      getXsltFileNameSpy.mockReturnValue(undefined);

      render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

      expect(
        screen.getByText(
          'This Kaoto DataMapper step is missing some configuration. Please click the configure button to configure it.',
        ),
      ).toBeInTheDocument();
    });

    it('should navigate to DataMapper page when Configure button is clicked', async () => {
      const vizNode = createMockVizNode('test-document.xsl');
      getXsltFileNameSpy.mockReturnValue('test-document.xsl');

      render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

      const configureButton = screen.getByRole('button', { name: /Launch the Kaoto DataMapper editor/i });
      fireEvent.click(configureButton);

      await waitFor(() => {
        expect(screen.getByTestId('current-location')).toHaveTextContent(`${Links.DataMapper}/test-node-id`);
      });
    });

    it('should handle navigation when vizNode is undefined', async () => {
      render(<DataMapperLauncher />, { wrapper });

      const configureButton = screen.getByRole('button', { name: /Launch the Kaoto DataMapper editor/i });
      fireEvent.click(configureButton);

      await waitFor(() => {
        expect(screen.getByTestId('current-location')).toHaveTextContent(`${Links.DataMapper}/undefined`);
      });
    });

    it('should render help icon with popover', async () => {
      const vizNode = createMockVizNode('test-document.xsl');
      getXsltFileNameSpy.mockReturnValue('test-document.xsl');

      render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

      const helpButton = await screen.findByRole('button', { name: 'More info' });
      expect(helpButton).toBeInTheDocument();
    });

    it('should render Configure button with wrench icon', () => {
      const vizNode = createMockVizNode('test-document.xsl');
      getXsltFileNameSpy.mockReturnValue('test-document.xsl');

      render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

      const configureButton = screen.getByRole('button', { name: /Launch the Kaoto DataMapper editor/i });
      expect(configureButton).toHaveClass('pf-m-primary');
      expect(configureButton).toHaveTextContent('Configure');
    });

    describe('file existence checking', () => {
      it('should not show form when file does not exist', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');
        mockMetadataContext.isResourceExist = vi.fn().mockResolvedValue(false);

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.queryByText('Document')).not.toBeInTheDocument();
        });
      });

      it('should show form when file exists', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');
        mockMetadataContext.isResourceExist = vi.fn().mockResolvedValue(true);

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByText('Document')).toBeInTheDocument();
        });
      });

      it('should not check file existence when xsltDocumentName is undefined', async () => {
        const vizNode = createMockVizNode();
        getXsltFileNameSpy.mockReturnValue(undefined);
        const isResourceExistSpy = vi.fn();
        mockMetadataContext.isResourceExist = isResourceExistSpy;

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.queryByText('Document')).not.toBeInTheDocument();
        });
        expect(isResourceExistSpy).not.toHaveBeenCalled();
      });

      it('should not check file existence when metadata is undefined', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper: noMetadataWrapper });

        await waitFor(() => {
          expect(screen.getByText('The Kaoto DataMapper cannot be configured')).toBeInTheDocument();
        });

        expect(screen.queryByText('Document')).not.toBeInTheDocument();
      });
    });

    describe('document name validation', () => {
      beforeEach(() => {
        // Mock isResourceExist to return true for existing file, false for new files
        mockMetadataContext.isResourceExist = vi.fn().mockImplementation((path: string) => {
          if (path === 'test-document.xsl') return Promise.resolve(true); // Original file exists
          return Promise.resolve(false); // New files don't exist
        });
      });

      it('should show specific error message for required field', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByText('Document')).toBeInTheDocument();
        });

        const editButton = screen.getByTestId('xslt-document-name--edit');
        fireEvent.click(editButton);

        const input = await screen.findByTestId('xslt-document-name--text-input');
        fireEvent.change(input, { target: { value: '' } });

        await waitFor(() => {
          expect(screen.getByText('XSLT document name is required.')).toBeInTheDocument();
        });
      });

      it('should show specific error message for invalid format', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByText('Document')).toBeInTheDocument();
        });

        const editButton = screen.getByTestId('xslt-document-name--edit');
        fireEvent.click(editButton);

        const input = await screen.findByTestId('xslt-document-name--text-input');
        fireEvent.change(input, { target: { value: 'invalid.txt' } });

        await waitFor(() => {
          expect(screen.getByText('XSLT document name must be a valid filename ending with .xsl.')).toBeInTheDocument();
        });
      });

      it('should show specific error message for existing file', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');

        mockMetadataContext.isResourceExist = vi.fn().mockImplementation((path: string) => {
          if (path === 'test-document.xsl' || path === 'existing.xsl') return Promise.resolve(true);
          return Promise.resolve(false);
        });

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByText('Document')).toBeInTheDocument();
        });

        const editButton = screen.getByTestId('xslt-document-name--edit');
        fireEvent.click(editButton);

        const input = await screen.findByTestId('xslt-document-name--text-input');
        fireEvent.change(input, { target: { value: 'existing.xsl' } });

        await waitFor(() => {
          expect(screen.getByText('An XSLT document with this name already exists.')).toBeInTheDocument();
        });
      });

      // Old tests have been replaced by the new inline edit integration tests above
    });

    describe('inline edit integration', () => {
      beforeEach(() => {
        mockMetadataContext.isResourceExist = vi.fn().mockResolvedValue(true);
      });

      it('should render InlineEdit component with correct props', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByTestId('xslt-document-name')).toBeInTheDocument();
        });

        expect(screen.getByTestId('xslt-document-name')).toHaveTextContent('test-document.xsl');
      });

      it('should allow editing the document name', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByTestId('xslt-document-name--edit')).toBeInTheDocument();
        });

        const editButton = screen.getByTestId('xslt-document-name--edit');
        fireEvent.click(editButton);

        const input = await screen.findByTestId('xslt-document-name--text-input');
        expect(input).toBeInTheDocument();
        expect(input).toHaveValue('test-document.xsl');
      });

      it('should show save and cancel buttons in edit mode', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByTestId('xslt-document-name--edit')).toBeInTheDocument();
        });

        const editButton = screen.getByTestId('xslt-document-name--edit');
        fireEvent.click(editButton);

        await waitFor(() => {
          expect(screen.getByTestId('xslt-document-name--save')).toBeInTheDocument();
          expect(screen.getByTestId('xslt-document-name--cancel')).toBeInTheDocument();
        });
      });

      it('should cancel editing and restore original value', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByTestId('xslt-document-name--edit')).toBeInTheDocument();
        });

        const editButton = screen.getByTestId('xslt-document-name--edit');
        fireEvent.click(editButton);

        const input = await screen.findByTestId('xslt-document-name--text-input');
        fireEvent.change(input, { target: { value: 'changed.xsl' } });

        const cancelButton = screen.getByTestId('xslt-document-name--cancel');
        fireEvent.click(cancelButton);

        await waitFor(() => {
          expect(screen.getByTestId('xslt-document-name')).toHaveTextContent('test-document.xsl');
        });
      });

      it('should disable save button when validation fails', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByTestId('xslt-document-name--edit')).toBeInTheDocument();
        });

        const editButton = screen.getByTestId('xslt-document-name--edit');
        fireEvent.click(editButton);

        const input = await screen.findByTestId('xslt-document-name--text-input');
        fireEvent.change(input, { target: { value: 'invalid' } });

        await waitFor(() => {
          const saveButton = screen.getByTestId('xslt-document-name--save');
          expect(saveButton).toBeDisabled();
        });
      });

      it('should enable save button when validation passes', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');

        mockMetadataContext.isResourceExist = vi.fn().mockImplementation((path: string) => {
          if (path === 'test-document.xsl') return Promise.resolve(true);
          return Promise.resolve(false);
        });

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByTestId('xslt-document-name--edit')).toBeInTheDocument();
        });

        const editButton = screen.getByTestId('xslt-document-name--edit');
        fireEvent.click(editButton);

        const input = await screen.findByTestId('xslt-document-name--text-input');
        fireEvent.change(input, { target: { value: 'valid-name.xsl' } });

        await waitFor(() => {
          const saveButton = screen.getByTestId('xslt-document-name--save');
          expect(saveButton).not.toBeDisabled();
        });
      });

      it('should display error message below input when errorPosition is bottom', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByTestId('xslt-document-name--edit')).toBeInTheDocument();
        });

        const editButton = screen.getByTestId('xslt-document-name--edit');
        fireEvent.click(editButton);

        const input = await screen.findByTestId('xslt-document-name--text-input');
        fireEvent.change(input, { target: { value: '' } });

        await waitFor(() => {
          // Error message should be displayed below the input
          expect(screen.getByText('XSLT document name is required.')).toBeInTheDocument();

          // Verify the helper text is rendered as a sibling to the input group (errorPosition="bottom")
          const form = screen.getByTestId('xslt-document-name--form');
          const helperText = form.querySelector('.pf-v6-c-helper-text');
          expect(helperText).toBeInTheDocument();
        });
      });
    });

    describe('save button behavior with inline edit', () => {
      beforeEach(() => {
        mockMetadataContext.isResourceExist = vi.fn().mockImplementation((path: string) => {
          if (path === 'test-document.xsl') return Promise.resolve(true);
          return Promise.resolve(false);
        });
      });

      it('should trigger rename when save button is clicked after editing', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');
        getDataMapperMetadataIdSpy.mockReturnValue('test-node-id');

        const mockMetadata: IDataMapperMetadata = {
          sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [], fieldTypeOverrides: [] },
          sourceParameters: {},
          targetBody: { type: DocumentDefinitionType.Primitive, filePath: [], fieldTypeOverrides: [] },
          xsltPath: 'test-document.xsl',
          namespaceMap: {},
        };

        mockMetadataContext.getMetadata = vi.fn().mockResolvedValue(mockMetadata);
        mockMetadataContext.getResourceContent = vi.fn().mockResolvedValue('mock xslt content');
        mockMetadataContext.saveResourceContent = vi.fn().mockResolvedValue(undefined);
        mockMetadataContext.deleteResource = vi.fn().mockResolvedValue(undefined);

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByTestId('xslt-document-name--edit')).toBeInTheDocument();
        });

        const editButton = screen.getByTestId('xslt-document-name--edit');
        fireEvent.click(editButton);

        const input = await screen.findByTestId('xslt-document-name--text-input');
        fireEvent.change(input, { target: { value: 'renamed.xsl' } });

        const saveButton = await screen.findByTestId('xslt-document-name--save');
        fireEvent.click(saveButton);

        await waitFor(() => {
          expect(mockMetadataContext.saveResourceContent).toHaveBeenCalledWith('renamed.xsl', 'mock xslt content');
          expect(updateXsltFileNameSpy).toHaveBeenCalledWith(vizNode, 'renamed.xsl', mockEntitiesContext);
          expect(mockMetadataContext.deleteResource).toHaveBeenCalledWith('test-document.xsl');
        });
      });

      it('should not trigger rename when save is clicked without changes', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');

        mockMetadataContext.saveResourceContent = vi.fn();
        mockMetadataContext.deleteResource = vi.fn();

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByTestId('xslt-document-name--edit')).toBeInTheDocument();
        });

        const editButton = screen.getByTestId('xslt-document-name--edit');
        fireEvent.click(editButton);

        await waitFor(() => {
          expect(screen.getByTestId('xslt-document-name--save')).toBeInTheDocument();
        });

        const saveButton = screen.getByTestId('xslt-document-name--save');
        fireEvent.click(saveButton);

        await waitFor(() => {
          expect(mockMetadataContext.saveResourceContent).not.toHaveBeenCalled();
          expect(mockMetadataContext.deleteResource).not.toHaveBeenCalled();
        });
      });

      it('should handle case when metadata is not found', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');
        getDataMapperMetadataIdSpy.mockReturnValue('test-node-id');

        // Mock getMetadata to return null (metadata not found)
        mockMetadataContext.getMetadata = vi.fn().mockResolvedValue(null);
        mockMetadataContext.saveResourceContent = vi.fn();
        mockMetadataContext.deleteResource = vi.fn();

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByTestId('xslt-document-name--edit')).toBeInTheDocument();
        });

        const editButton = screen.getByTestId('xslt-document-name--edit');
        fireEvent.click(editButton);

        const input = await screen.findByTestId('xslt-document-name--text-input');
        fireEvent.change(input, { target: { value: 'renamed.xsl' } });

        const saveButton = await screen.findByTestId('xslt-document-name--save');
        fireEvent.click(saveButton);

        // Should not proceed with rename operations when metadata is not found
        await waitFor(() => {
          expect(mockMetadataContext.saveResourceContent).not.toHaveBeenCalled();
          expect(mockMetadataContext.deleteResource).not.toHaveBeenCalled();
        });
      });

      it('should return to readonly mode after successful save', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');
        getDataMapperMetadataIdSpy.mockReturnValue('test-node-id');

        const mockMetadata: IDataMapperMetadata = {
          sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [], fieldTypeOverrides: [] },
          sourceParameters: {},
          targetBody: { type: DocumentDefinitionType.Primitive, filePath: [], fieldTypeOverrides: [] },
          xsltPath: 'test-document.xsl',
          namespaceMap: {},
        };

        let fileRenamed = false;
        // Mock file existence - track when file is renamed
        mockMetadataContext.isResourceExist = vi.fn().mockImplementation((path: string) => {
          if (path === 'test-document.xsl' && !fileRenamed) return Promise.resolve(true); // Original file exists before rename
          if (path === 'renamed.xsl' && fileRenamed) return Promise.resolve(true); // New file exists after rename
          return Promise.resolve(false);
        });
        mockMetadataContext.getMetadata = vi.fn().mockResolvedValue(mockMetadata);
        mockMetadataContext.getResourceContent = vi.fn().mockResolvedValue('mock xslt content');
        mockMetadataContext.saveResourceContent = vi.fn().mockImplementation(() => {
          fileRenamed = true; // Mark file as renamed when save is called
          return Promise.resolve(undefined);
        });
        mockMetadataContext.deleteResource = vi.fn().mockResolvedValue(undefined);

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByTestId('xslt-document-name--edit')).toBeInTheDocument();
        });

        const editButton = screen.getByTestId('xslt-document-name--edit');
        fireEvent.click(editButton);

        const input = await screen.findByTestId('xslt-document-name--text-input');
        fireEvent.change(input, { target: { value: 'renamed.xsl' } });

        const saveButton = await screen.findByTestId('xslt-document-name--save');
        fireEvent.click(saveButton);

        await waitFor(() => {
          expect(screen.getByTestId('xslt-document-name')).toBeInTheDocument();
          expect(screen.queryByTestId('xslt-document-name--text-input')).not.toBeInTheDocument();
        });
      });
    });

    // Output validation UI: skipped until feature is complete
    describe.skip('Validate Output toggle', () => {
      beforeEach(() => {
        // Default: file exists, XML target, validation disabled
        mockMetadataContext.isResourceExist = vi.fn().mockResolvedValue(true);
        const mockMeta: IDataMapperMetadata = {
          sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
          sourceParameters: {},
          targetBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['ShipOrder.xsd'] },
          xsltPath: 'test-document.xsl',
        };
        mockMetadataContext.getMetadata = vi.fn().mockResolvedValue(mockMeta);
        isValidationEnabledSpy.mockReturnValue(false);
        getDataMapperMetadataIdSpy.mockReturnValue('test-node-id');
      });

      it('should show Validate Output checkbox when file exists and target is not Primitive', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByTestId('validate-output-checkbox')).toBeInTheDocument();
        });
        expect(screen.getByText('Output Validation')).toBeInTheDocument();
      });

      it('should hide Validate Output checkbox when target is Primitive', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');
        const primitiveMeta: IDataMapperMetadata = {
          sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
          sourceParameters: {},
          targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
          xsltPath: 'test-document.xsl',
        };
        mockMetadataContext.getMetadata = vi.fn().mockResolvedValue(primitiveMeta);

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.queryByText('Document')).toBeInTheDocument();
        });
        expect(screen.queryByTestId('validate-output-checkbox')).not.toBeInTheDocument();
      });

      it('should hide Validate Output checkbox when XSLT file does not exist', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');
        mockMetadataContext.isResourceExist = vi.fn().mockResolvedValue(false);

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.queryByTestId('validate-output-checkbox')).not.toBeInTheDocument();
        });
      });

      it('should render checkbox as unchecked when validation is disabled', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');
        isValidationEnabledSpy.mockReturnValue(false);

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        const checkbox = (await screen.findByTestId('validate-output-checkbox')) as HTMLInputElement;
        expect(checkbox.checked).toBe(false);
      });

      it('should render checkbox as checked when validation is enabled', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');
        isValidationEnabledSpy.mockReturnValue(true);

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        const checkbox = (await screen.findByTestId('validate-output-checkbox')) as HTMLInputElement;
        expect(checkbox.checked).toBe(true);
      });

      it('should call addValidationStep when checkbox is toggled ON', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');
        isValidationEnabledSpy.mockReturnValue(false);

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        const checkbox = await screen.findByTestId('validate-output-checkbox');
        fireEvent.click(checkbox);

        await waitFor(() => {
          expect(addValidationStepSpy).toHaveBeenCalled();
        });
      });

      it('should call removeValidationStep when checkbox is toggled OFF', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');
        isValidationEnabledSpy.mockReturnValue(true);

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        const checkbox = (await screen.findByTestId('validate-output-checkbox')) as HTMLInputElement;
        fireEvent.click(checkbox);

        await waitFor(() => {
          expect(removeValidationStepSpy).toHaveBeenCalled();
        });
      });
    });
  });
});
