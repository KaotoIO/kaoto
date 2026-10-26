import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FunctionComponent, PropsWithChildren } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import type { Mock, MockInstance } from 'vitest';

import { createVisualizationNode, IVisualizationNode, KaotoResource } from '../../models';
import { SourceSchemaType } from '../../models/camel';
import { DocumentDefinitionType } from '../../models/datamapper';
import { IDataMapperMetadata } from '../../models/datamapper/metadata';
import { EntitiesContext } from '../../providers';
import { IMetadataApi, MetadataContext } from '../../providers/metadata.provider';
import { Links } from '../../router/links.models';
import { DataMapperMetadataService } from '../../services/datamapper-metadata.service';
import { DataMapperOutputValidationService } from '../../services/datamapper-output-validation.service';
import { DataMapperStepService } from '../../services/datamapper-step.service';
import { DataMapperStepSettingsService } from '../../services/datamapper-step-settings.service';
import { DataMapperValidationStepService } from '../../services/datamapper-validation-step.service';
import {
  GENERATED_WRAPPER_MARKER,
  GENERATED_WRAPPER_NOTICE,
} from '../../services/document/xml-schema/xml-schema-wrapper-generator.service';
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
    getTestReport: vi.fn().mockResolvedValue(undefined),
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
    refreshVisualEntities: vi.fn(),
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

  /** A viz node with a real step definition, so the URIs the rename writes can be asserted on */
  const createStepVizNode = (...uris: string[]): IVisualizationNode =>
    ({
      data: { definition: { id: 'test-node-id', steps: uris.map((uri) => ({ to: { uri } })) } },
      updateModel: vi.fn(),
    }) as unknown as IVisualizationNode;

  const stepUris = (vizNode: IVisualizationNode) =>
    ((vizNode.data.definition as { steps: Array<{ to: { uri: string } }> }).steps ?? []).map((step) => step.to.uri);

  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <MemoryRouter>
      <MetadataContext.Provider value={mockMetadataContext}>
        <EntitiesContext.Provider value={mockEntitiesContext}>{children}</EntitiesContext.Provider>
      </MetadataContext.Provider>
      <LocationProbe />
    </MemoryRouter>
  );

  /** Waits for the document name input to be rendered and focuses it, which reveals the save and cancel buttons */
  const focusNameInput = async () => {
    const input = await screen.findByRole('textbox', { name: 'XSLT document name' });
    await userEvent.click(input);
    return input;
  };

  let getXsltFileNameSpy: MockInstance<typeof DataMapperStepService.getXsltFileName>;
  let getDataMapperMetadataIdSpy: MockInstance<typeof DataMapperStepService.getDataMapperMetadataId>;
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
    // Tests replace this mock where the behaviour matters (e.g. the rename tests use a stateful one); do not leak it.
    mockMetadataContext.isResourceExist = vi.fn().mockResolvedValue(true);
    getXsltFileNameSpy = vi.spyOn(DataMapperStepService, 'getXsltFileName').mockReturnValue(undefined);
    getDataMapperMetadataIdSpy = vi.spyOn(DataMapperStepService, 'getDataMapperMetadataId');
    vi.spyOn(DataMapperStepService, 'getOutputVariable').mockReturnValue(undefined);
    vi.spyOn(DataMapperStepService, 'setOutputVariable').mockImplementation(() => {});
    vi.spyOn(DataMapperMetadataService, 'updateXsltPath').mockResolvedValue(undefined);
    isValidationEnabledSpy = vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockReturnValue(false);
    addValidationStepSpy = vi.spyOn(DataMapperValidationStepService, 'addValidationStep').mockImplementation(() => {});
    removeValidationStepSpy = vi
      .spyOn(DataMapperValidationStepService, 'removeValidationStep')
      .mockImplementation(() => {});
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
        expect(screen.getByText('Document', { selector: 'label' })).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /Launch the Kaoto DataMapper editor/i })).toBeInTheDocument();
    });

    it('should display the XSLT document name when defined', async () => {
      const vizNode = createMockVizNode('my-transformation.xsl');
      getXsltFileNameSpy.mockReturnValue('my-transformation.xsl');

      render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

      const input = await screen.findByRole('textbox', { name: 'XSLT document name' });
      expect(input).toHaveValue('my-transformation.xsl');
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

      const helpButton = await screen.findByRole('button', { name: 'More info for Document field' });
      expect(helpButton).toBeInTheDocument();
    });

    it('should render Configure button with wrench icon', () => {
      const vizNode = createMockVizNode('test-document.xsl');
      getXsltFileNameSpy.mockReturnValue('test-document.xsl');

      render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

      const configureButton = screen.getByRole('button', { name: /Launch the Kaoto DataMapper editor/i });
      expect(configureButton).toHaveClass('cds--btn--primary');
      expect(configureButton).toHaveTextContent('Configure');
    });

    describe('file existence checking', () => {
      it('should not show form when file does not exist', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');
        mockMetadataContext.isResourceExist = vi.fn().mockResolvedValue(false);

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.queryByText('Document', { selector: 'label' })).not.toBeInTheDocument();
        });
      });

      it('should show form when file exists', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');
        mockMetadataContext.isResourceExist = vi.fn().mockResolvedValue(true);

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByText('Document', { selector: 'label' })).toBeInTheDocument();
        });
      });

      it('should not check file existence when xsltDocumentName is undefined', async () => {
        const vizNode = createMockVizNode();
        getXsltFileNameSpy.mockReturnValue(undefined);
        const isResourceExistSpy = vi.fn();
        mockMetadataContext.isResourceExist = isResourceExistSpy;

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.queryByText('Document', { selector: 'label' })).not.toBeInTheDocument();
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

        expect(screen.queryByText('Document', { selector: 'label' })).not.toBeInTheDocument();
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

        const input = await focusNameInput();
        fireEvent.change(input, { target: { value: '' } });

        await waitFor(() => {
          expect(screen.getByText('XSLT document name is required.')).toBeInTheDocument();
        });
      });

      it('should show specific error message for invalid format and disable the save button', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        const input = await focusNameInput();
        fireEvent.change(input, { target: { value: 'invalid.txt' } });

        await waitFor(() => {
          expect(screen.getByText('XSLT document name must be a valid filename ending with .xsl.')).toBeInTheDocument();
        });
        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByRole('button', { name: 'Save value' })).toBeDisabled();
      });

      it('should show specific error message for existing file', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');

        mockMetadataContext.isResourceExist = vi.fn().mockImplementation((path: string) => {
          if (path === 'test-document.xsl' || path === 'existing.xsl') return Promise.resolve(true);
          return Promise.resolve(false);
        });

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        const input = await focusNameInput();
        fireEvent.change(input, { target: { value: 'existing.xsl' } });

        await waitFor(() => {
          expect(screen.getByText('An XSLT document with this name already exists.')).toBeInTheDocument();
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

      it('should rename the document when save is clicked after editing', async () => {
        const vizNode = createStepVizNode('xslt-saxon:test-document.xsl');
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
        mockMetadataContext.isResourceExist = vi
          .fn()
          .mockImplementation((path: string) => Promise.resolve(path === 'test-document.xsl'));
        mockMetadataContext.saveResourceContent = vi.fn().mockResolvedValue(undefined);
        mockMetadataContext.deleteResource = vi.fn().mockResolvedValue(true);

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        const input = await focusNameInput();
        fireEvent.change(input, { target: { value: 'renamed.xsl' } });

        const saveButton = await screen.findByRole('button', { name: 'Save value' });
        fireEvent.click(saveButton);

        await waitFor(() => {
          expect(mockMetadataContext.deleteResource).toHaveBeenCalledWith('test-document.xsl');
        });
        expect(mockMetadataContext.saveResourceContent).toHaveBeenCalledWith('renamed.xsl', 'mock xslt content');
        expect(stepUris(vizNode)).toEqual(['xslt-saxon:renamed.xsl']);
        expect(vizNode.updateModel).toHaveBeenCalledTimes(1);
      });

      describe('validation wrapper on rename', () => {
        const WRAPPER_CONTENT = `${GENERATED_WRAPPER_MARKER}. ${GENERATED_WRAPPER_NOTICE}`;
        const OLD_VALIDATOR_URI = 'validator:test-document-validation-wrapper.xsd?failOnNullBody=false';

        /** Clicks through the rename of `test-document.xsl` to `renamed.xsl`, without waiting for the outcome */
        const startRename = async (
          resources: Record<string, string>,
          overrideMocks?: () => void,
          beforeSave?: () => Promise<void>,
        ) => {
          const vizNode = createStepVizNode('xslt-saxon:test-document.xsl', OLD_VALIDATOR_URI);
          getXsltFileNameSpy.mockReturnValue('test-document.xsl');
          getDataMapperMetadataIdSpy.mockReturnValue('test-node-id');
          mockMetadataContext.getMetadata = vi.fn().mockResolvedValue({
            sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
            sourceParameters: {},
            targetBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
            xsltPath: 'test-document.xsl',
            namespaceMap: {},
          });
          mockMetadataContext.getResourceContent = vi
            .fn()
            .mockImplementation((path: string) => Promise.resolve(resources[path]));
          mockMetadataContext.isResourceExist = vi
            .fn()
            .mockImplementation((path: string) => Promise.resolve(resources[path] !== undefined));
          mockMetadataContext.saveResourceContent = vi.fn().mockResolvedValue(undefined);
          mockMetadataContext.deleteResource = vi.fn().mockResolvedValue(true);
          overrideMocks?.();

          render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });
          const input = await focusNameInput();
          fireEvent.change(input, { target: { value: 'renamed.xsl' } });
          await beforeSave?.();
          fireEvent.click(await screen.findByRole('button', { name: 'Save value' }));
          return vizNode;
        };

        /** The Validate output checkbox is only shown for a schema target */
        const useXmlTarget = () => {
          mockMetadataContext.getMetadata = vi.fn().mockResolvedValue({
            sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
            sourceParameters: {},
            targetBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['ShipOrder.xsd'] },
            xsltPath: 'test-document.xsl',
            namespaceMap: {},
          });
        };

        const renameWith = async (resources: Record<string, string>) => {
          const vizNode = await startRename(resources);
          await waitFor(() => {
            expect(vizNode.updateModel).toHaveBeenCalledTimes(1);
          });
          return vizNode;
        };

        it('should copy the wrapper, repoint the step and only then delete the old files', async () => {
          const vizNode = await renameWith({
            'test-document.xsl': 'mock xslt content',
            'test-document-validation-wrapper.xsd': WRAPPER_CONTENT,
          });

          await waitFor(() => {
            expect(mockMetadataContext.deleteResource).toHaveBeenCalledWith('test-document-validation-wrapper.xsd');
          });
          expect(mockMetadataContext.saveResourceContent).toHaveBeenCalledWith(
            'renamed-validation-wrapper.xsd',
            WRAPPER_CONTENT,
          );
          // The XSLT step and the validator (query options included) follow the renamed files
          expect(stepUris(vizNode)).toEqual([
            'xslt-saxon:renamed.xsl',
            'validator:renamed-validation-wrapper.xsd?failOnNullBody=false',
          ]);
          expect(mockEntitiesContext.updateSourceCodeFromEntities).toHaveBeenCalledTimes(1);
          expect(mockMetadataContext.deleteResource).toHaveBeenCalledTimes(2);
          // The old files are deleted after the route was repointed, never before
          const updateModelOrder = (vizNode.updateModel as Mock).mock.invocationCallOrder[0];
          for (const deleteOrder of (mockMetadataContext.deleteResource as Mock).mock.invocationCallOrder) {
            expect(updateModelOrder).toBeLessThan(deleteOrder);
          }
        });

        it('should neither copy nor delete a wrapper when there is none', async () => {
          const vizNode = await renameWith({ 'test-document.xsl': 'mock xslt content' });

          await waitFor(() => {
            expect(mockMetadataContext.deleteResource).toHaveBeenCalledWith('test-document.xsl');
          });
          expect(stepUris(vizNode)).toEqual(['xslt-saxon:renamed.xsl', OLD_VALIDATOR_URI]);
          expect(mockMetadataContext.deleteResource).toHaveBeenCalledTimes(1);
          expect(mockMetadataContext.saveResourceContent).toHaveBeenCalledTimes(1);
          expect(mockMetadataContext.saveResourceContent).toHaveBeenCalledWith('renamed.xsl', 'mock xslt content');
        });

        it('should not rename, remove the copies and tell the user when copying the wrapper failed', async () => {
          vi.spyOn(DataMapperMetadataService, 'duplicateValidationWrapper').mockResolvedValue({
            renames: {},
            failure: 'boom',
          });

          const vizNode = await startRename({
            'test-document.xsl': 'mock xslt content',
            'test-document-validation-wrapper.xsd': WRAPPER_CONTENT,
          });

          expect(await screen.findByTestId('xslt-document-rename-error')).toHaveTextContent(
            'Could not copy the validation wrapper of "test-document.xsl", the document was not renamed: boom',
          );
          expect(vizNode.updateModel).not.toHaveBeenCalled();
          expect(stepUris(vizNode)).toEqual(['xslt-saxon:test-document.xsl', OLD_VALIDATOR_URI]);
          // Only the new XSLT file that was written for the rename is removed, the old files stay
          expect(mockMetadataContext.deleteResource).toHaveBeenCalledTimes(1);
          expect(mockMetadataContext.deleteResource).toHaveBeenCalledWith('renamed.xsl');
        });

        it('should clear the reason of a failed rename when the user cancels the edit', async () => {
          vi.spyOn(DataMapperMetadataService, 'duplicateValidationWrapper').mockResolvedValue({
            renames: {},
            failure: 'boom',
          });
          await startRename({
            'test-document.xsl': 'mock xslt content',
            'test-document-validation-wrapper.xsd': WRAPPER_CONTENT,
          });
          expect(await screen.findByTestId('xslt-document-rename-error')).toBeInTheDocument();

          await userEvent.click(screen.getByRole('textbox', { name: 'XSLT document name' }));
          await userEvent.click(await screen.findByRole('button', { name: 'Cancel editing' }));

          await waitFor(() => {
            expect(screen.queryByTestId('xslt-document-rename-error')).not.toBeInTheDocument();
          });
        });

        it('should refuse the rename while a validation toggle is pending, and let the toggle finish', async () => {
          let finishToggle: (warnings: string[]) => void = () => {};
          vi.spyOn(DataMapperOutputValidationService, 'setOutputValidation').mockImplementation(
            () => new Promise<string[]>((resolve) => (finishToggle = resolve)),
          );

          const vizNode = await startRename({ 'test-document.xsl': 'mock xslt content' }, useXmlTarget, async () => {
            fireEvent.click(await screen.findByTestId('validate-output-checkbox'));
          });

          try {
            expect(await screen.findByTestId('xslt-document-rename-error')).toHaveTextContent(
              'Output validation is being updated, try again in a moment.',
            );
            expect(mockMetadataContext.saveResourceContent).not.toHaveBeenCalled();
            expect(vizNode.updateModel).not.toHaveBeenCalled();
          } finally {
            finishToggle([]);
          }
        });

        it('should disable the validation checkbox while the renamed document is being saved', async () => {
          let finishSave: () => void = () => {};
          await startRename(
            { 'test-document.xsl': 'mock xslt content' },
            () => {
              useXmlTarget();
              mockMetadataContext.saveResourceContent = vi
                .fn()
                .mockImplementation(() => new Promise<void>((resolve) => (finishSave = resolve)));
            },
            async () => {
              expect(await screen.findByTestId('validate-output-checkbox')).toBeEnabled();
            },
          );

          try {
            await waitFor(() => {
              expect(screen.getByTestId('validate-output-checkbox')).toBeDisabled();
            });
          } finally {
            finishSave();
          }
          // The rename ran to the end
          await waitFor(() => {
            expect(mockMetadataContext.deleteResource).toHaveBeenCalledWith('test-document.xsl');
          });
        });

        it('should not delete any old file when repointing the step throws', async () => {
          vi.spyOn(DataMapperStepService, 'applyResourceRenamesToNode').mockImplementation(() => {
            throw new Error('model update failed');
          });

          await startRename({
            'test-document.xsl': 'mock xslt content',
            'test-document-validation-wrapper.xsd': WRAPPER_CONTENT,
          });

          expect(await screen.findByText('Unable to save document name. Please try again.')).toBeInTheDocument();
          expect(mockMetadataContext.saveResourceContent).toHaveBeenCalledWith('renamed.xsl', 'mock xslt content');
          expect(mockMetadataContext.deleteResource).not.toHaveBeenCalled();
        });

        it('should show no error when only deleting the old file fails after the route was repointed', async () => {
          const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

          const vizNode = await startRename({ 'test-document.xsl': 'mock xslt content' }, () => {
            mockMetadataContext.deleteResource = vi.fn().mockRejectedValue(new Error('locked'));
          });

          await waitFor(() => {
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Could not delete "test-document.xsl"'));
          });
          expect(stepUris(vizNode)).toEqual(['xslt-saxon:renamed.xsl', OLD_VALIDATOR_URI]);
          expect(screen.queryByText('Unable to save document name. Please try again.')).not.toBeInTheDocument();
          expect(screen.queryByTestId('xslt-document-rename-error')).not.toBeInTheDocument();
        });

        it('should not touch the step nor delete anything when saving the renamed file is rejected', async () => {
          const vizNode = await startRename({ 'test-document.xsl': 'mock xslt content' }, () => {
            mockMetadataContext.saveResourceContent = vi.fn().mockRejectedValue(new Error('disk full'));
          });

          expect(await screen.findByText('Unable to save document name. Please try again.')).toBeInTheDocument();
          expect(vizNode.updateModel).not.toHaveBeenCalled();
          expect(stepUris(vizNode)).toEqual(['xslt-saxon:test-document.xsl', OLD_VALIDATOR_URI]);
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

        const input = await focusNameInput();
        fireEvent.change(input, { target: { value: 'renamed.xsl' } });

        const saveButton = await screen.findByRole('button', { name: 'Save value' });
        fireEvent.click(saveButton);

        // Should not proceed with rename operations when metadata is not found
        await waitFor(() => {
          expect(mockMetadataContext.saveResourceContent).not.toHaveBeenCalled();
          expect(mockMetadataContext.deleteResource).not.toHaveBeenCalled();
        });
      });
    });

    describe('Validate Output toggle', () => {
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

      it('should show an enabled Validate Output checkbox when file exists and target is not Primitive', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByTestId('validate-output-checkbox')).toBeEnabled();
        });
        expect(screen.getByText('Output validation')).toBeInTheDocument();
      });

      it('should show a disabled Validate Output checkbox, with the attach-schema reason, when target is Primitive', async () => {
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
          expect(screen.getByTestId('validate-output-checkbox')).toBeDisabled();
        });
        expect(screen.getByText('Attach a target schema to enable validation.')).toBeInTheDocument();
      });

      it('should show a disabled Validate Output checkbox, with the JSON reason, when target is JSON', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');
        const jsonMeta: IDataMapperMetadata = {
          sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
          sourceParameters: {},
          targetBody: { type: DocumentDefinitionType.JSON_SCHEMA, filePath: ['schema.json'] },
          xsltPath: 'test-document.xsl',
        };
        mockMetadataContext.getMetadata = vi.fn().mockResolvedValue(jsonMeta);

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByTestId('validate-output-checkbox')).toBeDisabled();
        });
        expect(screen.getByText('Output validation for JSON schemas is not supported yet.')).toBeInTheDocument();
      });

      it('should keep the Validate Output checkbox visible, but disabled, when the XSLT file does not exist', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');
        mockMetadataContext.isResourceExist = vi.fn().mockResolvedValue(false);

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByTestId('validate-output-checkbox')).toBeDisabled();
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
        vi.spyOn(DataMapperValidationStepService, 'canAddValidationStep').mockReturnValue(true);
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');
        isValidationEnabledSpy.mockReturnValue(false);

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        const checkbox = await screen.findByTestId('validate-output-checkbox');
        fireEvent.click(checkbox);

        await waitFor(() => {
          expect(addValidationStepSpy).toHaveBeenCalledTimes(1);
        });
        expect(addValidationStepSpy).toHaveBeenCalledWith(
          vizNode,
          expect.objectContaining({ filePath: ['ShipOrder.xsd'] }),
          mockEntitiesContext,
          'ShipOrder.xsd',
        );
        expect(removeValidationStepSpy).not.toHaveBeenCalled();
      });

      it('should render the checkbox disabled until the async checks are done', async () => {
        let resolveExists: (exists: boolean) => void = () => {};
        mockMetadataContext.isResourceExist = vi.fn().mockReturnValue(
          new Promise<boolean>((resolve) => {
            resolveExists = resolve;
          }),
        );
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        expect(screen.getByTestId('validate-output-checkbox')).toBeDisabled();

        resolveExists(true);
        await waitFor(() => {
          expect(screen.getByTestId('validate-output-checkbox')).toBeEnabled();
        });
      });

      it('should render the checkbox checked from first paint when validation is enabled, before the async checks resolve', () => {
        // isResourceExist never resolves in this test: the checkbox must show the real model state (checked,
        // disabled) synchronously, not force it unchecked while the target type is still unknown.
        mockMetadataContext.isResourceExist = vi.fn().mockReturnValue(new Promise(() => {}));
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');
        isValidationEnabledSpy.mockReturnValue(true);

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        const checkbox = screen.getByTestId('validate-output-checkbox') as HTMLInputElement;
        expect(checkbox.checked).toBe(true);
        expect(checkbox).toBeDisabled();
      });

      it('should show the warnings of the validation setup under the checkbox', async () => {
        vi.spyOn(DataMapperOutputValidationService, 'setOutputValidation').mockResolvedValue([
          'No unreferenced schema found, validating against "a.xsd" only',
        ]);
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        expect(screen.queryByTestId('validate-output-helper-text')).not.toBeInTheDocument();
        const checkbox = await screen.findByTestId('validate-output-checkbox');
        await waitFor(() => expect(checkbox).toBeEnabled());
        fireEvent.click(checkbox);

        const helperText = await screen.findByTestId('validate-output-helper-text');
        expect(helperText).toHaveTextContent('No unreferenced schema found, validating against "a.xsd" only');
      });

      it('should not bring back old warnings when the checkbox is enabled again', async () => {
        vi.spyOn(DataMapperOutputValidationService, 'setOutputValidation').mockResolvedValue(['old warning']);
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');

        const { rerender } = render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });
        const checkbox = await screen.findByTestId('validate-output-checkbox');
        await waitFor(() => expect(checkbox).toBeEnabled());
        fireEvent.click(checkbox);
        expect(await screen.findByText('old warning')).toBeInTheDocument();

        // The XSLT file goes away: the checkbox stays visible but disabled, and its message is cleared ...
        mockMetadataContext.isResourceExist = vi.fn().mockResolvedValue(false);
        getXsltFileNameSpy.mockReturnValue('other.xsl');
        rerender(<DataMapperLauncher vizNode={createMockVizNode('other.xsl')} />);
        await waitFor(() => {
          expect(screen.getByTestId('validate-output-checkbox')).toBeDisabled();
        });
        expect(screen.queryByText('old warning')).not.toBeInTheDocument();

        // ... and comes back with a file: no message of the earlier toggle either.
        mockMetadataContext.isResourceExist = vi.fn().mockResolvedValue(true);
        getXsltFileNameSpy.mockReturnValue('third.xsl');
        rerender(<DataMapperLauncher vizNode={createMockVizNode('third.xsl')} />);
        await waitFor(() => expect(screen.getByTestId('validate-output-checkbox')).toBeEnabled());
        expect(screen.queryByText('old warning')).not.toBeInTheDocument();
      });

      it('should revert the checkbox, tell the user and not throw when enabling the validation is rejected', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(DataMapperOutputValidationService, 'setOutputValidation').mockRejectedValue(new Error('no access'));
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');
        // The model was not changed: the validator step is still absent
        isValidationEnabledSpy.mockReturnValue(false);

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        const checkbox = (await screen.findByTestId('validate-output-checkbox')) as HTMLInputElement;
        await waitFor(() => expect(checkbox).toBeEnabled());
        fireEvent.click(checkbox);

        await waitFor(() => {
          expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('enable output validation'), expect.any(Error));
        });
        await waitFor(() => {
          expect(checkbox).toBeEnabled();
        });
        expect(checkbox.checked).toBe(false);
        expect(await screen.findByTestId('validate-output-helper-text')).toHaveTextContent(
          'Could not enable output validation: no access',
        );
      });

      it('should show the state of the model, not the requested one, when enabling is rejected after the model changed', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(DataMapperOutputValidationService, 'setOutputValidation').mockImplementation(async () => {
          // The validator step was added, then a later step of the same call failed
          isValidationEnabledSpy.mockReturnValue(true);
          throw new Error('late failure');
        });
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');
        isValidationEnabledSpy.mockReturnValue(false);

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        const checkbox = (await screen.findByTestId('validate-output-checkbox')) as HTMLInputElement;
        await waitFor(() => expect(checkbox).toBeEnabled());
        expect(checkbox.checked).toBe(false);
        fireEvent.click(checkbox);

        expect(await screen.findByTestId('validate-output-helper-text')).toHaveTextContent(
          'Could not enable output validation: late failure',
        );
        await waitFor(() => expect(checkbox).toBeEnabled());
        expect(checkbox.checked).toBe(true);
      });

      it('should keep the checkbox checked and tell the user when disabling the validation is rejected', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(DataMapperOutputValidationService, 'setOutputValidation').mockRejectedValue(new Error('locked'));
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');
        // The validator step is still in the model after the failed disable
        isValidationEnabledSpy.mockReturnValue(true);

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        const checkbox = (await screen.findByTestId('validate-output-checkbox')) as HTMLInputElement;
        await waitFor(() => expect(checkbox).toBeEnabled());
        expect(checkbox.checked).toBe(true);
        fireEvent.click(checkbox);

        expect(await screen.findByTestId('validate-output-helper-text')).toHaveTextContent(
          'Could not disable output validation: locked',
        );
        await waitFor(() => expect(checkbox).toBeEnabled());
        expect(checkbox.checked).toBe(true);
      });

      it('should point to the log when the step settings service itself rejects', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(DataMapperStepSettingsService, 'updateStepSettings').mockRejectedValue(new Error('model broken'));
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        const checkbox = (await screen.findByTestId('validate-output-checkbox')) as HTMLInputElement;
        await waitFor(() => expect(checkbox).toBeEnabled());
        fireEvent.click(checkbox);

        expect(await screen.findByTestId('validate-output-helper-text')).toHaveTextContent(
          'Could not enable output validation, see the log for details.',
        );
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[DataMapperLauncher]'), expect.any(Error));
        await waitFor(() => expect(checkbox).toBeEnabled());
        expect(checkbox.checked).toBe(false);
      });

      it('should name the disable in the message when the step settings service rejects a disable', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(DataMapperStepSettingsService, 'updateStepSettings').mockRejectedValue(new Error('model broken'));
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');
        isValidationEnabledSpy.mockReturnValue(true);

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        const checkbox = (await screen.findByTestId('validate-output-checkbox')) as HTMLInputElement;
        await waitFor(() => expect(checkbox).toBeEnabled());
        fireEvent.click(checkbox);

        expect(await screen.findByTestId('validate-output-helper-text')).toHaveTextContent(
          'Could not disable output validation, see the log for details.',
        );
      });

      it('should toggle through the step settings service only', async () => {
        const updateSpy = vi
          .spyOn(DataMapperStepSettingsService, 'updateStepSettings')
          .mockResolvedValue({ settings: { isOutputValidationEnabled: true }, warnings: [] });
        const setValidationSpy = vi.spyOn(DataMapperOutputValidationService, 'setOutputValidation');
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');
        isValidationEnabledSpy.mockReturnValue(false);

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });
        const checkbox = (await screen.findByTestId('validate-output-checkbox')) as HTMLInputElement;
        await waitFor(() => expect(checkbox).toBeEnabled());
        fireEvent.click(checkbox);

        await waitFor(() => {
          expect(updateSpy).toHaveBeenCalledWith(
            expect.anything(),
            vizNode,
            mockEntitiesContext,
            expect.objectContaining({ isOutputValidationEnabled: true }),
          );
        });
        expect(setValidationSpy).not.toHaveBeenCalled();
      });

      it('should call removeValidationStep when checkbox is toggled OFF', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        getXsltFileNameSpy.mockReturnValue('test-document.xsl');
        isValidationEnabledSpy.mockReturnValue(true);

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        const checkbox = (await screen.findByTestId('validate-output-checkbox')) as HTMLInputElement;
        fireEvent.click(checkbox);

        await waitFor(() => {
          expect(removeValidationStepSpy).toHaveBeenCalledTimes(1);
        });
        expect(removeValidationStepSpy).toHaveBeenCalledWith(vizNode, mockEntitiesContext);
        expect(addValidationStepSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('output variable', () => {
    beforeEach(() => {
      mockMetadataContext.isResourceExist = vi.fn().mockResolvedValue(true);
      (DataMapperStepService.getXsltFileName as Mock).mockReturnValue('test-document.xsl');
    });

    it('should render an empty output variable input when no output variable is set', () => {
      const vizNode = createMockVizNode('test-document.xsl');
      (DataMapperStepService.getOutputVariable as Mock).mockReturnValue(undefined);

      render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

      expect(screen.getByTestId('output-variable-name-input')).toHaveValue('');
      expect(screen.queryByTestId('save-as-variable-toggle')).not.toBeInTheDocument();
    });

    it('should expose the output variable input and its help button by the field label', () => {
      const vizNode = createMockVizNode('test-document.xsl');
      (DataMapperStepService.getOutputVariable as Mock).mockReturnValue(undefined);

      render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

      expect(screen.getByRole('textbox', { name: 'Save as variable' })).toBe(
        screen.getByTestId('output-variable-name-input'),
      );
      expect(screen.getByRole('button', { name: 'More info for Save as variable field' })).toBeInTheDocument();
    });

    it('should prefill the input when an output variable is set', () => {
      const vizNode = createMockVizNode('test-document.xsl');
      (DataMapperStepService.getOutputVariable as Mock).mockReturnValue('existingVar');

      render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

      expect(screen.getByTestId('output-variable-name-input')).toHaveValue('existingVar');
    });

    it('should show the success state after typing a valid name and drop it when cleared', async () => {
      const user = userEvent.setup();
      const vizNode = createMockVizNode('test-document.xsl');
      (DataMapperStepService.getOutputVariable as Mock).mockReturnValue(undefined);
      (DataMapperStepService.setOutputVariable as Mock).mockImplementation(() => undefined);

      render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

      const input = screen.getByTestId('output-variable-name-input');
      await user.type(input, 'myVar');
      expect(input.closest('.output-variable-field--success')).not.toBeNull();

      await user.clear(input);
      expect(input.closest('.output-variable-field--success')).toBeNull();
      expect(screen.queryByTestId('output-variable-name-error')).not.toBeInTheDocument();
    });

    it('should show an error for a whitespace-only name and clear the step', async () => {
      const user = userEvent.setup();
      const vizNode = createMockVizNode('test-document.xsl');
      (DataMapperStepService.getOutputVariable as Mock).mockReturnValue(undefined);
      (DataMapperStepService.setOutputVariable as Mock).mockImplementation(() => undefined);

      render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

      await user.type(screen.getByTestId('output-variable-name-input'), '   ');

      expect(screen.getByTestId('output-variable-name-error')).toBeInTheDocument();
      expect(DataMapperStepService.setOutputVariable).toHaveBeenLastCalledWith(vizNode, undefined, mockEntitiesContext);
    });

    it('should call setOutputVariable with the variable name on change', async () => {
      const vizNode = createMockVizNode('test-document.xsl');
      (DataMapperStepService.getOutputVariable as Mock).mockReturnValue(undefined);
      (DataMapperStepService.setOutputVariable as Mock).mockImplementation(() => undefined);

      render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

      const input = screen.getByTestId('output-variable-name-input');
      fireEvent.change(input, { target: { value: 'myOutputVar' } });

      await waitFor(() => {
        expect(DataMapperStepService.setOutputVariable).toHaveBeenCalledWith(
          vizNode,
          'myOutputVar',
          mockEntitiesContext,
        );
      });
    });

    it('should call setOutputVariable with undefined when variable name is cleared', async () => {
      const vizNode = createMockVizNode('test-document.xsl');
      (DataMapperStepService.getOutputVariable as Mock).mockReturnValue(undefined);
      (DataMapperStepService.setOutputVariable as Mock).mockImplementation(() => undefined);

      render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

      const input = screen.getByTestId('output-variable-name-input');
      fireEvent.change(input, { target: { value: 'myOutputVar' } });
      fireEvent.change(input, { target: { value: '' } });

      await waitFor(() => {
        expect(DataMapperStepService.setOutputVariable).toHaveBeenLastCalledWith(
          vizNode,
          undefined,
          mockEntitiesContext,
        );
      });
    });

    describe('when another DataMapper step is shown by the same launcher', () => {
      const createDataMapperVizNode = (stepId: string, outputVariable?: string): IVisualizationNode => {
        const steps: Record<string, unknown>[] = [{ to: { uri: `xslt-saxon:${stepId}.xsl` } }];
        if (outputVariable) {
          steps.push({
            setVariable: { id: `kaoto-datamapper-output-variable-${stepId}`, name: outputVariable, simple: '${body}' },
          });
        }

        return createVisualizationNode('route.from.steps.0.step:kaoto-datamapper', {
          name: 'kaoto-datamapper',
          path: 'route.from.steps.0.step',
          isPlaceholder: false,
          isGroup: false,
          iconUrl: '',
          title: '',
          description: '',
          definition: { id: stepId, steps },
        });
      };

      beforeEach(() => {
        vi.mocked(DataMapperStepService.getOutputVariable).mockRestore();
      });

      it('should show the output variable of the newly shown DataMapper step', () => {
        const { rerender } = render(
          <DataMapperLauncher vizNode={createDataMapperVizNode('kaoto-datamapper-1111', 'firstVar')} />,
          { wrapper },
        );
        expect(screen.getByTestId('output-variable-name-input')).toHaveValue('firstVar');

        rerender(<DataMapperLauncher vizNode={createDataMapperVizNode('kaoto-datamapper-2222', 'secondVar')} />);

        expect(screen.getByTestId('output-variable-name-input')).toHaveValue('secondVar');
      });

      it('should not carry an unsaved variable name over to another DataMapper step', async () => {
        const user = userEvent.setup();
        const { rerender } = render(<DataMapperLauncher vizNode={createDataMapperVizNode('kaoto-datamapper-1111')} />, {
          wrapper,
        });
        await user.type(screen.getByTestId('output-variable-name-input'), '   ');
        expect(screen.getByTestId('output-variable-name-error')).toBeInTheDocument();

        rerender(<DataMapperLauncher vizNode={createDataMapperVizNode('kaoto-datamapper-2222')} />);

        expect(screen.getByTestId('output-variable-name-input')).toHaveValue('');
        expect(screen.queryByTestId('output-variable-name-error')).not.toBeInTheDocument();
      });
    });
  });
});
