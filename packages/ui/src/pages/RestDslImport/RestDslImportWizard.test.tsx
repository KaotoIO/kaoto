import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { RestDslImportWizard } from './RestDslImportWizard';
import { useRestDslImportWizard } from './useRestDslImportWizard';

jest.mock('./useRestDslImportWizard');

describe('RestDslImportWizard', () => {
  const fetchSpy = jest.spyOn(globalThis, 'fetch');
  const mockOnClose = jest.fn();
  const mockOnGoToDesigner = jest.fn();

  const mockWizard = {
    importSource: 'file' as const,
    isOpenApiParsed: false,
    openApiSpecText: '',
    openApiLoadSource: undefined,
    sourceIdentifier: '',
    importCreateRest: false,
    importCreateRoutes: true,
    importSelectAll: true,
    importOperations: [],
    importStatus: null,
    apicurioRegistryUrl: 'http://registry.example.com',
    handleSchemaLoaded: jest.fn(),
    handleImportSourceChange: jest.fn(),
    setOpenApiSpecText: jest.fn(),
    handleParseOpenApiSpec: jest.fn(),
    setImportCreateRest: jest.fn(),
    setImportCreateRoutes: jest.fn(),
    handleToggleSelectAllOperations: jest.fn(),
    handleToggleOperation: jest.fn(),
    handleImportOpenApi: jest.fn(),
    resetImportWizard: jest.fn(),
  };

  beforeEach(() => {
    (useRestDslImportWizard as jest.Mock).mockReturnValue(mockWizard);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('Import source step', () => {
    it('renders all import source options', () => {
      render(<RestDslImportWizard onClose={mockOnClose} onGoToDesigner={mockOnGoToDesigner} />);
      expect(screen.getByLabelText('Upload file')).toBeInTheDocument();
      expect(screen.getByLabelText('Import from URI')).toBeInTheDocument();
      expect(screen.getByLabelText('Import from Apicurio')).toBeInTheDocument();
    });

    it('calls handleImportSourceChange when changing source', () => {
      render(<RestDslImportWizard onClose={mockOnClose} onGoToDesigner={mockOnGoToDesigner} />);
      const uriRadio = screen.getByLabelText('Import from URI');
      fireEvent.click(uriRadio);
      expect(mockWizard.handleImportSourceChange).toHaveBeenCalledWith('uri');
    });

    it('shows FileImportSource when file source is selected', () => {
      render(<RestDslImportWizard onClose={mockOnClose} onGoToDesigner={mockOnGoToDesigner} />);
      // FileImportSource renders a file upload component with the ID
      const fileUpload = document.querySelector('#openapi-file-upload');
      expect(fileUpload).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
    });

    it('shows UriImportSource when URI source is selected', () => {
      (useRestDslImportWizard as jest.Mock).mockReturnValue({ ...mockWizard, importSource: 'uri' });
      render(<RestDslImportWizard onClose={mockOnClose} onGoToDesigner={mockOnGoToDesigner} />);
      // UriImportSource renders a text input and Fetch button
      expect(screen.getByPlaceholderText('https://example.com/openapi.yaml')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /fetch/i })).toBeInTheDocument();
    });

    it('shows ApicurioImportSource when Apicurio source is selected', async () => {
      // Mock the Apicurio fetch call
      fetchSpy.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ artifacts: [] }),
      } as unknown as Response);

      (useRestDslImportWizard as jest.Mock).mockReturnValue({ ...mockWizard, importSource: 'apicurio' });
      render(<RestDslImportWizard onClose={mockOnClose} onGoToDesigner={mockOnGoToDesigner} />);

      // ApicurioImportSource renders search input and refresh button
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search OpenAPI artifacts')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      });
    });
  });

  describe('Operations step', () => {
    it('renders OpenAPI specification textarea', async () => {
      render(<RestDslImportWizard onClose={mockOnClose} onGoToDesigner={mockOnGoToDesigner} />);
      // Click on the Operations step in the nav
      const operationsNav = screen.getByRole('button', { name: /^Operations$/i });
      fireEvent.click(operationsNav);
      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /rest-openapi-spec/i })).toBeInTheDocument();
      });
    });

    it('calls setOpenApiSpecText when textarea changes', async () => {
      render(<RestDslImportWizard onClose={mockOnClose} onGoToDesigner={mockOnGoToDesigner} />);
      const operationsNav = screen.getByRole('button', { name: /^Operations$/i });
      fireEvent.click(operationsNav);
      await waitFor(() => {
        const textarea = screen.getByRole('textbox', { name: /rest-openapi-spec/i });
        fireEvent.change(textarea, { target: { value: 'openapi: 3.0.0' } });
        expect(mockWizard.setOpenApiSpecText).toHaveBeenCalledWith('openapi: 3.0.0');
      });
    });

    it('calls handleParseOpenApiSpec when Parse button is clicked', async () => {
      render(<RestDslImportWizard onClose={mockOnClose} onGoToDesigner={mockOnGoToDesigner} />);
      const operationsNav = screen.getByRole('button', { name: /^Operations$/i });
      fireEvent.click(operationsNav);
      await waitFor(() => {
        const parseButton = screen.getByRole('button', { name: /parse specification/i });
        fireEvent.click(parseButton);
        expect(mockWizard.handleParseOpenApiSpec).toHaveBeenCalled();
      });
    });

    it('shows error message in operations step', async () => {
      (useRestDslImportWizard as jest.Mock).mockReturnValue({
        ...mockWizard,
        importStatus: { type: 'error', message: 'Invalid specification' },
      });
      render(<RestDslImportWizard onClose={mockOnClose} onGoToDesigner={mockOnGoToDesigner} />);
      const operationsNav = screen.getByRole('button', { name: /^Operations$/i });
      fireEvent.click(operationsNav);
      await waitFor(() => {
        expect(screen.getByText('Invalid specification')).toBeInTheDocument();
      });
    });

    it('renders import options checkboxes', async () => {
      render(<RestDslImportWizard onClose={mockOnClose} onGoToDesigner={mockOnGoToDesigner} />);
      const operationsNav = screen.getByRole('button', { name: /^Operations$/i });
      fireEvent.click(operationsNav);
      await waitFor(() => {
        expect(screen.getByLabelText('Create Rest DSL operations')).toBeInTheDocument();
        expect(screen.getByLabelText('Create routes with direct endpoints')).toBeInTheDocument();
      });
    });

    it('calls setImportCreateRest when checkbox is toggled', async () => {
      render(<RestDslImportWizard onClose={mockOnClose} onGoToDesigner={mockOnGoToDesigner} />);
      const operationsNav = screen.getByRole('button', { name: /^Operations$/i });
      fireEvent.click(operationsNav);
      await waitFor(() => {
        const checkbox = screen.getByLabelText('Create Rest DSL operations');
        fireEvent.click(checkbox);
        expect(mockWizard.setImportCreateRest).toHaveBeenCalledWith(true);
      });
    });

    it('renders operations list when operations are available', async () => {
      const operations = [
        {
          operationId: 'getPet',
          method: 'get',
          path: '/pet/{id}',
          selected: true,
          routeExists: false,
        },
      ];
      (useRestDslImportWizard as jest.Mock).mockReturnValue({ ...mockWizard, importOperations: operations });
      render(<RestDslImportWizard onClose={mockOnClose} onGoToDesigner={mockOnGoToDesigner} />);
      const operationsNav = screen.getByRole('button', { name: /^Operations$/i });
      fireEvent.click(operationsNav);
      await waitFor(() => {
        expect(screen.getByText('Select all operations')).toBeInTheDocument();
        expect(screen.getByLabelText(/GET \/pet\/{id}/)).toBeInTheDocument();
      });
    });

    it('calls handleToggleOperation when individual operation is toggled', async () => {
      const operations = [
        {
          operationId: 'getPet',
          method: 'get',
          path: '/pet',
          selected: true,
          routeExists: false,
        },
      ];
      (useRestDslImportWizard as jest.Mock).mockReturnValue({ ...mockWizard, importOperations: operations });
      render(<RestDslImportWizard onClose={mockOnClose} onGoToDesigner={mockOnGoToDesigner} />);
      const operationsNav = screen.getByRole('button', { name: /^Operations$/i });
      fireEvent.click(operationsNav);
      await waitFor(() => {
        const checkbox = screen.getByLabelText(/GET \/pet/);
        fireEvent.click(checkbox);
        expect(mockWizard.handleToggleOperation).toHaveBeenCalledWith('getPet', 'get', '/pet', false);
      });
    });
  });

  describe('Result step', () => {
    it('shows success alert when import succeeds', async () => {
      (useRestDslImportWizard as jest.Mock).mockReturnValue({
        ...mockWizard,
        isOpenApiParsed: true,
        importStatus: { type: 'success', message: 'Import succeeded. 2 operations added.' },
        handleImportOpenApi: jest.fn().mockReturnValue(true),
      });
      render(<RestDslImportWizard onClose={mockOnClose} onGoToDesigner={mockOnGoToDesigner} />);

      // Navigate to Operations step
      const operationsNav = screen.getByRole('button', { name: /^Operations$/i });
      fireEvent.click(operationsNav);

      // Find and click the Import button
      await waitFor(() => {
        const importButton = screen.getByRole('button', { name: /^Import$/i });
        expect(importButton).toBeInTheDocument();
        fireEvent.click(importButton);
      });

      // Navigate to Result step
      await waitFor(() => {
        const resultNav = screen.getByRole('button', { name: /^Result$/i });
        fireEvent.click(resultNav);
      });

      await waitFor(() => {
        expect(screen.getByText('Import succeeded. 2 operations added.')).toBeInTheDocument();
      });
    });

    it('calls onGoToDesigner when Go to Designer button is clicked', async () => {
      (useRestDslImportWizard as jest.Mock).mockReturnValue({
        ...mockWizard,
        isOpenApiParsed: true,
        importStatus: { type: 'success', message: 'Import succeeded.' },
        handleImportOpenApi: jest.fn().mockReturnValue(true),
      });
      render(<RestDslImportWizard onClose={mockOnClose} onGoToDesigner={mockOnGoToDesigner} />);

      // Navigate to Result step
      const resultNav = screen.getByRole('button', { name: /^Result$/i });
      fireEvent.click(resultNav);

      await waitFor(() => {
        const designerButton = screen.getByRole('button', { name: /go to designer/i });
        fireEvent.click(designerButton);
        expect(mockWizard.resetImportWizard).toHaveBeenCalled();
        expect(mockOnGoToDesigner).toHaveBeenCalled();
      });
    });
  });

  describe('Wizard footer', () => {
    it('disables Back button on first step', () => {
      render(<RestDslImportWizard onClose={mockOnClose} onGoToDesigner={mockOnGoToDesigner} />);
      const backButton = screen.getByRole('button', { name: /back/i });
      expect(backButton).toBeDisabled();
    });

    it('disables Import button when spec is not parsed', async () => {
      (useRestDslImportWizard as jest.Mock).mockReturnValue({ ...mockWizard, isOpenApiParsed: false });
      render(<RestDslImportWizard onClose={mockOnClose} onGoToDesigner={mockOnGoToDesigner} />);

      // Navigate to Operations step
      const operationsNav = screen.getByRole('button', { name: /^Operations$/i });
      fireEvent.click(operationsNav);

      await waitFor(() => {
        const importButton = screen.getByRole('button', { name: /^Import$/i });
        expect(importButton).toBeDisabled();
      });
    });

    it('disables Import button when neither REST nor routes are selected', async () => {
      (useRestDslImportWizard as jest.Mock).mockReturnValue({
        ...mockWizard,
        isOpenApiParsed: true,
        importCreateRest: false,
        importCreateRoutes: false,
      });
      render(<RestDslImportWizard onClose={mockOnClose} onGoToDesigner={mockOnGoToDesigner} />);

      // Navigate to Operations step
      const operationsNav = screen.getByRole('button', { name: /^Operations$/i });
      fireEvent.click(operationsNav);

      await waitFor(() => {
        const importButton = screen.getByRole('button', { name: /^Import$/i });
        expect(importButton).toBeDisabled();
      });
    });

    it('calls resetImportWizard and onClose when Go to Rest Editor is clicked on result step', async () => {
      (useRestDslImportWizard as jest.Mock).mockReturnValue({
        ...mockWizard,
        isOpenApiParsed: true,
        importStatus: { type: 'success', message: 'Import succeeded.' },
        handleImportOpenApi: jest.fn().mockReturnValue(true),
      });
      render(<RestDslImportWizard onClose={mockOnClose} onGoToDesigner={mockOnGoToDesigner} />);

      const resultNav = screen.getByRole('button', { name: /^Result$/i });
      fireEvent.click(resultNav);

      await waitFor(() => {
        const restEditorButton = screen.getByRole('button', { name: /go to rest editor/i });
        fireEvent.click(restEditorButton);
        expect(mockWizard.resetImportWizard).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('shows operation as disabled with "Route exists" label when routeExists is true', async () => {
      const operations = [
        {
          operationId: 'getPet',
          method: 'get',
          path: '/pet',
          selected: true,
          routeExists: true,
        },
      ];
      (useRestDslImportWizard as jest.Mock).mockReturnValue({ ...mockWizard, importOperations: operations });
      render(<RestDslImportWizard onClose={mockOnClose} onGoToDesigner={mockOnGoToDesigner} />);

      const operationsNav = screen.getByRole('button', { name: /^Operations$/i });
      fireEvent.click(operationsNav);

      await waitFor(() => {
        const checkbox = screen.getByLabelText(/GET \/pet - Route exists/);
        expect(checkbox).toBeInTheDocument();
        expect(checkbox).toBeDisabled();
      });
    });

    it('does not advance to result when import fails', async () => {
      (useRestDslImportWizard as jest.Mock).mockReturnValue({
        ...mockWizard,
        isOpenApiParsed: true,
        importCreateRoutes: true,
        handleImportOpenApi: jest.fn().mockReturnValue(false),
      });
      render(<RestDslImportWizard onClose={mockOnClose} onGoToDesigner={mockOnGoToDesigner} />);

      const operationsNav = screen.getByRole('button', { name: /^Operations$/i });
      fireEvent.click(operationsNav);

      await waitFor(() => {
        const importButton = screen.getByRole('button', { name: /^Import$/i });
        fireEvent.click(importButton);
      });

      // Should still be on Operations step, not Result
      expect(screen.getByRole('textbox', { name: /rest-openapi-spec/i })).toBeInTheDocument();
    });
  });
});
