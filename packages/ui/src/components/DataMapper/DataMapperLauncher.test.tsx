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

// Mock XsltDocumentRenameInput component
jest.mock('./XsltDocumentRenameInput', () => {
  // Import React hooks from the outer scope
  const {
    useState: useStateHook,
    useEffect: useEffectHook,
    createElement: createElementFn,
  } = jest.requireActual('react');

  const MockXsltDocumentRenameInput = ({
    value,
    onChange,
    validator,
    editTitle,
    'data-testid': dataTestId,
  }: {
    value?: string;
    onChange: (value: string) => void;
    validator: (value: string) => Promise<{ status: string; errMessages: string[] }>;
    textTitle: string;
    editTitle: string;
    'data-testid': string;
  }) => {
    const [isEditing, setIsEditing] = useStateHook(false);
    const [currentValue, setCurrentValue] = useStateHook(value || '');
    const [validationError, setValidationError] = useStateHook(null);
    const [isValid, setIsValid] = useStateHook(true);

    useEffectHook(() => {
      setCurrentValue(value || '');
    }, [value]);

    useEffectHook(() => {
      if (isEditing) {
        validator(currentValue).then((result: { status: string; errMessages: string[] }) => {
          setIsValid(result.status === 'success');
          setValidationError(result.errMessages[0] || null);
        });
      }
    }, [currentValue, isEditing, validator]);

    const handleEdit = () => {
      setIsEditing(true);
      setCurrentValue(value || '');
    };

    const handleSave = async () => {
      const result = await validator(currentValue);
      if (result.status === 'success') {
        onChange(currentValue);
        setIsEditing(false);
        setValidationError(null);
      }
    };

    const handleCancel = () => {
      setIsEditing(false);
      setCurrentValue(value || '');
      setValidationError(null);
    };

    const handleChange = (e: { target: { value: string } }) => {
      setCurrentValue(e.target.value);
    };

    return createElementFn(
      'div',
      { 'data-testid': dataTestId },
      isEditing
        ? createElementFn(
            'div',
            { 'data-testid': `${dataTestId}--form` },
            createElementFn('input', {
              'data-testid': `${dataTestId}--text-input`,
              value: currentValue,
              onChange: handleChange,
            }),
            validationError &&
              createElementFn(
                'div',
                { className: 'pf-v6-c-helper-text' },
                createElementFn('div', { className: 'pf-v6-c-helper-text__item pf-m-error' }, validationError),
              ),
            createElementFn(
              'button',
              { 'data-testid': `${dataTestId}--save`, onClick: handleSave, disabled: !isValid },
              'Save',
            ),
            createElementFn('button', { 'data-testid': `${dataTestId}--cancel`, onClick: handleCancel }, 'Cancel'),
          )
        : [
            createElementFn('span', { key: 'text', 'data-testid': `${dataTestId}--text` }, value),
            createElementFn(
              'button',
              { key: 'edit', 'data-testid': `${dataTestId}--edit`, onClick: handleEdit },
              editTitle,
            ),
          ],
    );
  };

  return {
    __esModule: true,
    default: MockXsltDocumentRenameInput,
  };
});

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
    isResourceExist: jest.fn().mockResolvedValue(true), // Mock file exists
    deleteResource: jest.fn(),
    askUserForFileSelection: jest.fn(),
    getSuggestions: jest.fn(),
    shouldSaveSchema: false,
  };

  const mockCamelResource = {
    initialize: jest.fn(),
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
    const originalConsoleError = console.error;
    // Suppress act() warnings for async useEffect in component
    jest.spyOn(console, 'error').mockImplementation((message) => {
      if (typeof message === 'string' && message.includes('not wrapped in act')) {
        return;
      }
      originalConsoleError(message);
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
      expect(screen.getByTestId('xslt-document-name')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Launch the Kaoto DataMapper editor/i })).toBeInTheDocument();
    });

    it('should display the XSLT document name when defined', async () => {
      const vizNode = createMockVizNode('my-transformation.xsl');
      (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('my-transformation.xsl');

      render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

      const span = await waitFor(() => screen.getByTestId('xslt-document-name'));
      expect(span).toHaveTextContent('my-transformation.xsl');
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

    it('should handle navigation when vizNode is undefined', () => {
      render(<DataMapperLauncher />, { wrapper });

      const configureButton = screen.getByRole('button', { name: /Launch the Kaoto DataMapper editor/i });
      fireEvent.click(configureButton);

      expect(mockNavigate).toHaveBeenCalledWith(`${Links.DataMapper}/undefined`);
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
        mockMetadataContext.isResourceExist = jest.fn().mockResolvedValue(false);

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.queryByText('Document')).not.toBeInTheDocument();
        });
      });

      it('should show form when file exists', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');
        mockMetadataContext.isResourceExist = jest.fn().mockResolvedValue(true);

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByText('Document')).toBeInTheDocument();
        });
      });

      it('should not check file existence when xsltDocumentName is undefined', async () => {
        const vizNode = createMockVizNode();
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue(undefined);
        const isResourceExistSpy = jest.fn();
        mockMetadataContext.isResourceExist = isResourceExistSpy;

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.queryByText('Document')).not.toBeInTheDocument();
        });
        expect(isResourceExistSpy).not.toHaveBeenCalled();
      });

      it('should not check file existence when metadata is undefined', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');

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
        mockMetadataContext.isResourceExist = jest.fn().mockImplementation((path: string) => {
          if (path === 'test-document.xsl') return Promise.resolve(true); // Original file exists
          return Promise.resolve(false); // New files don't exist
        });
      });

      it('should show specific error message for required field', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByText('Document')).toBeInTheDocument();
        });

        const editButton = screen.getByTestId('xslt-document-name--edit');
        fireEvent.click(editButton);

        const input = await waitFor(() => screen.getByTestId('xslt-document-name--text-input'));
        fireEvent.change(input, { target: { value: '' } });

        await waitFor(() => {
          expect(screen.getByText('XSLT document name is required.')).toBeInTheDocument();
        });
      });

      it('should show specific error message for invalid format', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByText('Document')).toBeInTheDocument();
        });

        const editButton = screen.getByTestId('xslt-document-name--edit');
        fireEvent.click(editButton);

        const input = await waitFor(() => screen.getByTestId('xslt-document-name--text-input'));
        fireEvent.change(input, { target: { value: 'invalid.txt' } });

        await waitFor(() => {
          expect(screen.getByText('XSLT document name must be a valid filename ending with .xsl.')).toBeInTheDocument();
        });
      });

      it('should show specific error message for existing file', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');

        mockMetadataContext.isResourceExist = jest.fn().mockImplementation((path: string) => {
          if (path === 'test-document.xsl' || path === 'existing.xsl') return Promise.resolve(true);
          return Promise.resolve(false);
        });

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByText('Document')).toBeInTheDocument();
        });

        const editButton = screen.getByTestId('xslt-document-name--edit');
        fireEvent.click(editButton);

        const input = await waitFor(() => screen.getByTestId('xslt-document-name--text-input'));
        fireEvent.change(input, { target: { value: 'existing.xsl' } });

        await waitFor(() => {
          expect(screen.getByText('An XSLT document with this name already exists.')).toBeInTheDocument();
        });
      });

      // Old tests have been replaced by the new inline edit integration tests above
    });

    describe('inline edit integration', () => {
      beforeEach(() => {
        mockMetadataContext.isResourceExist = jest.fn().mockResolvedValue(true);
      });

      it('should render InlineEdit component with correct props', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByTestId('xslt-document-name')).toBeInTheDocument();
        });

        expect(screen.getByTestId('xslt-document-name')).toHaveTextContent('test-document.xsl');
      });

      it('should allow editing the document name', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByTestId('xslt-document-name--edit')).toBeInTheDocument();
        });

        const editButton = screen.getByTestId('xslt-document-name--edit');
        fireEvent.click(editButton);

        const input = await waitFor(() => screen.getByTestId('xslt-document-name--text-input'));
        expect(input).toBeInTheDocument();
        expect(input).toHaveValue('test-document.xsl');
      });

      it('should show save and cancel buttons in edit mode', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');

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
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByTestId('xslt-document-name--edit')).toBeInTheDocument();
        });

        const editButton = screen.getByTestId('xslt-document-name--edit');
        fireEvent.click(editButton);

        const input = await waitFor(() => screen.getByTestId('xslt-document-name--text-input'));
        fireEvent.change(input, { target: { value: 'changed.xsl' } });

        const cancelButton = screen.getByTestId('xslt-document-name--cancel');
        fireEvent.click(cancelButton);

        await waitFor(() => {
          expect(screen.getByTestId('xslt-document-name')).toHaveTextContent('test-document.xsl');
        });
      });

      it('should disable save button when validation fails', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByTestId('xslt-document-name--edit')).toBeInTheDocument();
        });

        const editButton = screen.getByTestId('xslt-document-name--edit');
        fireEvent.click(editButton);

        const input = await waitFor(() => screen.getByTestId('xslt-document-name--text-input'));
        fireEvent.change(input, { target: { value: 'invalid' } });

        await waitFor(() => {
          const saveButton = screen.getByTestId('xslt-document-name--save');
          expect(saveButton).toBeDisabled();
        });
      });

      it('should enable save button when validation passes', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');

        mockMetadataContext.isResourceExist = jest.fn().mockImplementation((path: string) => {
          if (path === 'test-document.xsl') return Promise.resolve(true);
          return Promise.resolve(false);
        });

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByTestId('xslt-document-name--edit')).toBeInTheDocument();
        });

        const editButton = screen.getByTestId('xslt-document-name--edit');
        fireEvent.click(editButton);

        const input = await waitFor(() => screen.getByTestId('xslt-document-name--text-input'));
        fireEvent.change(input, { target: { value: 'valid-name.xsl' } });

        await waitFor(() => {
          const saveButton = screen.getByTestId('xslt-document-name--save');
          expect(saveButton).not.toBeDisabled();
        });
      });

      it('should display error message below input when errorPosition is bottom', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByTestId('xslt-document-name--edit')).toBeInTheDocument();
        });

        const editButton = screen.getByTestId('xslt-document-name--edit');
        fireEvent.click(editButton);

        const input = await waitFor(() => screen.getByTestId('xslt-document-name--text-input'));
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
        mockMetadataContext.isResourceExist = jest.fn().mockImplementation((path: string) => {
          if (path === 'test-document.xsl') return Promise.resolve(true);
          return Promise.resolve(false);
        });
      });

      it('should trigger rename when save button is clicked after editing', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');
        (DataMapperStepService.getDataMapperMetadataId as jest.Mock) = jest.fn().mockReturnValue('test-node-id');

        const mockMetadata: IDataMapperMetadata = {
          sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [], fieldTypeOverrides: [] },
          sourceParameters: {},
          targetBody: { type: DocumentDefinitionType.Primitive, filePath: [], fieldTypeOverrides: [] },
          xsltPath: 'test-document.xsl',
          namespaceMap: {},
        };

        mockMetadataContext.getMetadata = jest.fn().mockResolvedValue(mockMetadata);
        mockMetadataContext.getResourceContent = jest.fn().mockResolvedValue('mock xslt content');
        mockMetadataContext.saveResourceContent = jest.fn().mockResolvedValue(undefined);
        mockMetadataContext.deleteResource = jest.fn().mockResolvedValue(undefined);
        (DataMapperMetadataService.updateXsltPath as jest.Mock) = jest.fn().mockResolvedValue(undefined);
        (DataMapperStepService.updateXsltFileName as jest.Mock) = jest.fn();

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByTestId('xslt-document-name--edit')).toBeInTheDocument();
        });

        const editButton = screen.getByTestId('xslt-document-name--edit');
        fireEvent.click(editButton);

        const input = await waitFor(() => screen.getByTestId('xslt-document-name--text-input'));
        fireEvent.change(input, { target: { value: 'renamed.xsl' } });

        const saveButton = await waitFor(() => screen.getByTestId('xslt-document-name--save'));
        fireEvent.click(saveButton);

        await waitFor(() => {
          expect(mockMetadataContext.saveResourceContent).toHaveBeenCalledWith('renamed.xsl', 'mock xslt content');
          expect(DataMapperStepService.updateXsltFileName).toHaveBeenCalledWith(
            vizNode,
            'renamed.xsl',
            mockEntitiesContext,
          );
          expect(mockMetadataContext.deleteResource).toHaveBeenCalledWith('test-document.xsl');
        });
      });

      it('should not trigger rename when save is clicked without changes', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');

        mockMetadataContext.saveResourceContent = jest.fn();
        mockMetadataContext.deleteResource = jest.fn();

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
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');
        (DataMapperStepService.getDataMapperMetadataId as jest.Mock) = jest.fn().mockReturnValue('test-node-id');

        // Mock getMetadata to return null (metadata not found)
        mockMetadataContext.getMetadata = jest.fn().mockResolvedValue(null);
        mockMetadataContext.saveResourceContent = jest.fn();
        mockMetadataContext.deleteResource = jest.fn();

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByTestId('xslt-document-name--edit')).toBeInTheDocument();
        });

        const editButton = screen.getByTestId('xslt-document-name--edit');
        fireEvent.click(editButton);

        const input = await waitFor(() => screen.getByTestId('xslt-document-name--text-input'));
        fireEvent.change(input, { target: { value: 'renamed.xsl' } });

        const saveButton = await waitFor(() => screen.getByTestId('xslt-document-name--save'));
        fireEvent.click(saveButton);

        // Should not proceed with rename operations when metadata is not found
        await waitFor(() => {
          expect(mockMetadataContext.saveResourceContent).not.toHaveBeenCalled();
          expect(mockMetadataContext.deleteResource).not.toHaveBeenCalled();
        });
      });

      it('should return to readonly mode after successful save', async () => {
        const vizNode = createMockVizNode('test-document.xsl');
        (DataMapperStepService.getXsltFileName as jest.Mock).mockReturnValue('test-document.xsl');
        (DataMapperStepService.getDataMapperMetadataId as jest.Mock) = jest.fn().mockReturnValue('test-node-id');

        const mockMetadata: IDataMapperMetadata = {
          sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [], fieldTypeOverrides: [] },
          sourceParameters: {},
          targetBody: { type: DocumentDefinitionType.Primitive, filePath: [], fieldTypeOverrides: [] },
          xsltPath: 'test-document.xsl',
          namespaceMap: {},
        };

        let fileRenamed = false;
        // Mock file existence - track when file is renamed
        mockMetadataContext.isResourceExist = jest.fn().mockImplementation((path: string) => {
          if (path === 'test-document.xsl' && !fileRenamed) return Promise.resolve(true); // Original file exists before rename
          if (path === 'renamed.xsl' && fileRenamed) return Promise.resolve(true); // New file exists after rename
          return Promise.resolve(false);
        });
        mockMetadataContext.getMetadata = jest.fn().mockResolvedValue(mockMetadata);
        mockMetadataContext.getResourceContent = jest.fn().mockResolvedValue('mock xslt content');
        mockMetadataContext.saveResourceContent = jest.fn().mockImplementation(() => {
          fileRenamed = true; // Mark file as renamed when save is called
          return Promise.resolve(undefined);
        });
        mockMetadataContext.deleteResource = jest.fn().mockResolvedValue(undefined);
        (DataMapperMetadataService.updateXsltPath as jest.Mock) = jest.fn().mockResolvedValue(undefined);
        (DataMapperStepService.updateXsltFileName as jest.Mock) = jest.fn();

        render(<DataMapperLauncher vizNode={vizNode} />, { wrapper });

        await waitFor(() => {
          expect(screen.getByTestId('xslt-document-name--edit')).toBeInTheDocument();
        });

        const editButton = screen.getByTestId('xslt-document-name--edit');
        fireEvent.click(editButton);

        const input = await waitFor(() => screen.getByTestId('xslt-document-name--text-input'));
        fireEvent.change(input, { target: { value: 'renamed.xsl' } });

        const saveButton = await waitFor(() => screen.getByTestId('xslt-document-name--save'));
        fireEvent.click(saveButton);

        await waitFor(() => {
          expect(screen.getByTestId('xslt-document-name')).toBeInTheDocument();
          expect(screen.queryByTestId('xslt-document-name--text-input')).not.toBeInTheDocument();
        });
      });
    });
  });
});
