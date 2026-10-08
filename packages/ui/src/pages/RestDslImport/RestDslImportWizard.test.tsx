import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';
import type { Mock, MockInstance } from 'vitest';

import { CamelRouteResource } from '../../models/camel/camel-route-resource';
import { DefaultSettingsAdapter } from '../../models/settings';
import { SettingsContext } from '../../providers';
import { TestProvidersWrapper } from '../../stubs/TestProvidersWrapper';
import { RestDslImportWizard } from './RestDslImportWizard';

/** Builds an OpenAPI specification holding the given operations, grouped by path and method */
const createSpec = (paths: Record<string, Record<string, { operationId: string }>>) =>
  JSON.stringify({
    openapi: '3.0.0',
    info: { title: 'Test API', version: '1.0.0' },
    paths: Object.fromEntries(
      Object.entries(paths).map(([path, operations]) => [
        path,
        Object.fromEntries(
          Object.entries(operations).map(([method, operation]) => [
            method,
            { ...operation, responses: { '200': { description: 'ok' } } },
          ]),
        ),
      ]),
    ),
  });

const GET_PET_BY_ID_SPEC = createSpec({ '/pet/{id}': { get: { operationId: 'getPet' } } });
const GET_PET_SPEC = createSpec({ '/pet': { get: { operationId: 'getPet' } } });
const TWO_OPERATIONS_SPEC = createSpec({
  '/pet': { get: { operationId: 'getPet' }, post: { operationId: 'addPet' } },
});

describe('RestDslImportWizard', () => {
  let fetchSpy: MockInstance<typeof fetch>;
  const mockOnClose = vi.fn();
  const mockOnGoToDesigner = vi.fn();
  let EntitiesProvider: FunctionComponent<PropsWithChildren>;
  let updateEntitiesFromCamelResourceSpy: Mock;

  const settingsAdapter = new DefaultSettingsAdapter({
    rest: { apicurioRegistryUrl: 'http://registry.example.com', customMediaTypes: [] },
  });

  /** Renders the wizard with the real useRestDslImportWizard hook, backed by real settings and entities */
  const renderWizard = (Provider: FunctionComponent<PropsWithChildren> = EntitiesProvider) =>
    render(
      <SettingsContext.Provider value={settingsAdapter}>
        <Provider>
          <RestDslImportWizard onClose={mockOnClose} onGoToDesigner={mockOnGoToDesigner} />
        </Provider>
      </SettingsContext.Provider>,
    );

  const goToOperationsStep = () => {
    fireEvent.click(screen.getByRole('button', { name: /^Operations$/i }));
  };

  /** Goes to the Operations step, enters the specification and parses it */
  const parseSpec = async (spec: string) => {
    goToOperationsStep();
    const textarea = await screen.findByRole('textbox', { name: /rest-openapi-spec/i });
    fireEvent.change(textarea, { target: { value: spec } });
    fireEvent.click(screen.getByRole('button', { name: /parse specification/i }));
  };

  /** Parses the specification and imports its operations, landing on the Result step */
  const importSpec = async (spec: string) => {
    await parseSpec(spec);
    fireEvent.click(await screen.findByRole('button', { name: /^Import$/i }));
  };

  beforeEach(async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    ({ Provider: EntitiesProvider, updateEntitiesFromCamelResourceSpy } = await TestProvidersWrapper());
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('Import source step', () => {
    it('renders all import source options', () => {
      renderWizard();
      expect(screen.getByLabelText('Upload file')).toBeInTheDocument();
      expect(screen.getByLabelText('Import from URI')).toBeInTheDocument();
      expect(screen.getByLabelText('Import from Apicurio')).toBeInTheDocument();
    });

    it('calls handleImportSourceChange when changing source', () => {
      renderWizard();
      const uriRadio = screen.getByLabelText('Import from URI');
      fireEvent.click(uriRadio);
      expect(uriRadio).toBeChecked();
      expect(screen.getByLabelText('Upload file')).not.toBeChecked();
      expect(screen.getByPlaceholderText('https://example.com/openapi.yaml')).toBeInTheDocument();
    });

    it('shows FileImportSource when file source is selected', () => {
      renderWizard();
      // FileImportSource renders a file upload component with the ID
      const fileUpload = document.querySelector('#openapi-file-upload');
      expect(fileUpload).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
    });

    it('shows UriImportSource when URI source is selected', () => {
      renderWizard();
      fireEvent.click(screen.getByLabelText('Import from URI'));
      // UriImportSource renders a text input and Fetch button
      expect(screen.getByPlaceholderText('https://example.com/openapi.yaml')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /fetch/i })).toBeInTheDocument();
    });

    it('shows ApicurioImportSource when Apicurio source is selected', async () => {
      // Mock the Apicurio fetch call
      fetchSpy.mockResolvedValue(new Response(JSON.stringify({ artifacts: [] }), { status: 200 }));

      renderWizard();
      fireEvent.click(screen.getByLabelText('Import from Apicurio'));

      // ApicurioImportSource renders search input and refresh button
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search OpenAPI artifacts')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      });
      expect(fetchSpy).toHaveBeenCalledWith('http://registry.example.com/apis/registry/v2/search/artifacts');
    });
  });

  describe('Operations step', () => {
    it('renders OpenAPI specification textarea', async () => {
      renderWizard();
      // Click on the Operations step in the nav
      goToOperationsStep();
      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /rest-openapi-spec/i })).toBeInTheDocument();
      });
    });

    it('calls setOpenApiSpecText when textarea changes', async () => {
      renderWizard();
      goToOperationsStep();

      const textarea = await screen.findByRole('textbox', { name: /rest-openapi-spec/i });
      fireEvent.change(textarea, { target: { value: 'openapi: 3.0.0' } });

      await waitFor(() => {
        expect(textarea).toHaveValue('openapi: 3.0.0');
      });
    });

    it('calls handleParseOpenApiSpec when Parse button is clicked', async () => {
      renderWizard();

      await parseSpec(GET_PET_SPEC);

      await waitFor(() => {
        expect(screen.getByLabelText(/GET \/pet/)).toBeInTheDocument();
      });
    });

    it('shows error message in operations step', async () => {
      renderWizard();

      await parseSpec('Invalid specification');

      await waitFor(() => {
        expect(screen.getByText('Invalid OpenAPI specification.')).toBeInTheDocument();
      });
    });

    it('renders import options checkboxes', async () => {
      renderWizard();
      goToOperationsStep();
      await waitFor(() => {
        expect(screen.getByLabelText('Create Rest DSL operations')).toBeInTheDocument();
        expect(screen.getByLabelText('Create routes with direct endpoints')).toBeInTheDocument();
      });
    });

    it('calls setImportCreateRest when checkbox is toggled', async () => {
      renderWizard();
      goToOperationsStep();

      const checkbox = await screen.findByLabelText('Create Rest DSL operations');
      expect(checkbox).not.toBeChecked();
      fireEvent.click(checkbox);

      await waitFor(() => {
        expect(checkbox).toBeChecked();
      });
    });

    it('renders operations list when operations are available', async () => {
      renderWizard();

      await parseSpec(GET_PET_BY_ID_SPEC);

      await waitFor(() => {
        expect(screen.getByText('Select all operations')).toBeInTheDocument();
        expect(screen.getByLabelText(/GET \/pet\/{id}/)).toBeInTheDocument();
      });
    });

    it('calls handleToggleOperation when individual operation is toggled', async () => {
      renderWizard();

      await parseSpec(GET_PET_SPEC);

      const checkbox = await screen.findByLabelText(/GET \/pet/);
      expect(checkbox).toBeChecked();
      fireEvent.click(checkbox);

      await waitFor(() => {
        expect(checkbox).not.toBeChecked();
      });
    });
  });

  describe('Result step', () => {
    it('shows success alert when import succeeds', async () => {
      renderWizard();

      // Parse the specification in the Operations step and click the Import button
      await importSpec(TWO_OPERATIONS_SPEC);

      // Navigate to Result step
      const resultNav = await screen.findByRole('button', { name: /^Result$/i });
      fireEvent.click(resultNav);

      await waitFor(() => {
        expect(screen.getByText('Import succeeded. 2 operations added.')).toBeInTheDocument();
      });
      expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalled();
    });

    it('calls onGoToDesigner when Go to Designer button is clicked', async () => {
      renderWizard();
      await importSpec(GET_PET_SPEC);

      const designerButton = await screen.findByRole('button', { name: /go to designer/i });
      expect(screen.getByText('Import succeeded. 1 operation added.')).toBeInTheDocument();
      fireEvent.click(designerButton);

      await waitFor(() => {
        // The wizard was reset
        expect(screen.getByText('No import results yet.')).toBeInTheDocument();
        expect(mockOnGoToDesigner).toHaveBeenCalled();
      });
    });
  });

  describe('Wizard footer', () => {
    it('disables Back button on first step', () => {
      renderWizard();
      const backButton = screen.getByRole('button', { name: /back/i });
      expect(backButton).toBeDisabled();
    });

    it('disables Import button when spec is not parsed', async () => {
      renderWizard();

      // Navigate to Operations step
      goToOperationsStep();

      const importButton = await screen.findByRole('button', { name: /^Import$/i });
      expect(importButton).toBeDisabled();
    });

    it('disables Import button when neither REST nor routes are selected', async () => {
      renderWizard();
      await parseSpec(GET_PET_SPEC);

      // `Create Rest DSL operations` is unchecked by default
      fireEvent.click(await screen.findByLabelText('Create routes with direct endpoints'));

      await waitFor(() => {
        const importButton = screen.getByRole('button', { name: /^Import$/i });
        expect(importButton).toBeDisabled();
      });
    });

    it('calls resetImportWizard and onClose when Go to Rest Editor is clicked on result step', async () => {
      renderWizard();
      await importSpec(GET_PET_SPEC);

      const restEditorButton = await screen.findByRole('button', { name: /go to rest editor/i });
      expect(screen.getByText('Import succeeded. 1 operation added.')).toBeInTheDocument();
      fireEvent.click(restEditorButton);

      await waitFor(() => {
        // The wizard was reset
        expect(screen.getByText('No import results yet.')).toBeInTheDocument();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('shows operation as disabled with "Route exists" label when routeExists is true', async () => {
      const camelResource = new CamelRouteResource([
        { route: { id: 'route-getPet', from: { uri: 'direct:getPet', steps: [] } } },
      ]);
      const { Provider } = await TestProvidersWrapper({ camelResource });
      renderWizard(Provider);

      await parseSpec(GET_PET_SPEC);

      await waitFor(() => {
        const checkbox = screen.getByLabelText(/GET \/pet - Route exists/);
        expect(checkbox).toBeInTheDocument();
        expect(checkbox).toBeDisabled();
      });
    });

    it('does not advance to result when import fails', async () => {
      renderWizard();
      await parseSpec(GET_PET_SPEC);

      // Deselect the only operation, so the import fails
      fireEvent.click(await screen.findByLabelText(/GET \/pet/));

      const importButton = await screen.findByRole('button', { name: /^Import$/i });
      fireEvent.click(importButton);

      // Should still be on Operations step, not Result
      expect(screen.getByText('Import failed. Select at least one operation.')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /rest-openapi-spec/i })).toBeInTheDocument();
    });
  });
});
