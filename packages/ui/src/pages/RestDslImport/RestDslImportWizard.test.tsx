import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';
import type { Mock, MockInstance } from 'vitest';

import { CamelRouteResource } from '../../models/camel/camel-route-resource';
import { KaotoResource } from '../../models/kaoto-resource';
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
  let consoleErrorSpy: MockInstance<typeof console.error> | undefined;
  const mockOnClose = vi.fn();
  const mockOnGoToDesigner = vi.fn();
  const mockOnOpenSettings = vi.fn();
  let EntitiesProvider: FunctionComponent<PropsWithChildren>;
  let camelResource: KaotoResource;
  let updateEntitiesFromCamelResourceSpy: Mock;

  const settingsAdapter = new DefaultSettingsAdapter({
    rest: { apicurioRegistryUrl: 'http://registry.example.com', customMediaTypes: [] },
  });

  /** Renders the wizard with the real useRestDslImportWizard hook, backed by real settings and entities */
  const renderWizard = (Provider: FunctionComponent<PropsWithChildren> = EntitiesProvider) =>
    render(
      <SettingsContext.Provider value={settingsAdapter}>
        <Provider>
          <RestDslImportWizard
            onClose={mockOnClose}
            onGoToDesigner={mockOnGoToDesigner}
            onOpenSettings={mockOnOpenSettings}
          />
        </Provider>
      </SettingsContext.Provider>,
    );

  const goToStep = (name: RegExp) => {
    const steps = within(screen.getByRole('navigation', { name: 'Import steps' }));
    fireEvent.click(steps.getByRole('button', { name }));
  };
  const goToSpecificationStep = () => {
    goToStep(/specification/i);
  };
  const goToOperationsStep = () => {
    goToStep(/operations/i);
  };

  /** Loads the specification from a file in the Import source step, which also parses it */
  const loadSpec = async (spec: string) => {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File([spec], 'spec.json')] } });
    await screen.findByText('Schema loaded successfully');
  };

  /** Loads the specification and goes to the Specification step */
  const loadSpecAndGoToSpecification = async (spec: string) => {
    await loadSpec(spec);
    goToSpecificationStep();
    await screen.findByRole('textbox', { name: 'OpenAPI Specification' });
  };

  /** Loads the specification and goes to the Operations step */
  const parseSpecAndGoToOperations = async (spec: string) => {
    await loadSpec(spec);
    goToOperationsStep();
  };

  /** Parses the specification and imports its operations, landing on the Result step */
  const importSpec = async (spec: string) => {
    await parseSpecAndGoToOperations(spec);
    fireEvent.click(await screen.findByRole('button', { name: /^Import$/i }));
  };

  beforeEach(async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    ({ Provider: EntitiesProvider, camelResource, updateEntitiesFromCamelResourceSpy } = await TestProvidersWrapper());
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    consoleErrorSpy?.mockRestore();
    consoleErrorSpy = undefined;
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
      expect(screen.getByRole('button', { name: 'Drag and drop files here or click to upload' })).toBeInTheDocument();
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

    it('disables Next until a specification is loaded', () => {
      renderWizard();
      expect(screen.getByRole('button', { name: /^Next$/i })).toBeDisabled();
    });
  });

  describe('Specification step', () => {
    it('renders OpenAPI specification textarea', async () => {
      renderWizard();
      await loadSpecAndGoToSpecification(GET_PET_SPEC);
      expect(screen.getByRole('textbox', { name: 'OpenAPI Specification' })).toBeInTheDocument();
    });

    it('updates the text when the textarea changes', async () => {
      renderWizard();
      await loadSpecAndGoToSpecification(GET_PET_SPEC);

      const textarea = screen.getByRole('textbox', { name: 'OpenAPI Specification' });
      fireEvent.change(textarea, { target: { value: 'openapi: 3.0.0' } });

      await waitFor(() => {
        expect(textarea).toHaveValue('openapi: 3.0.0');
      });
    });

    it('reports the operations found in the loaded specification', async () => {
      renderWizard();

      await loadSpecAndGoToSpecification(TWO_OPERATIONS_SPEC);

      expect(await screen.findByText('Specification parsed successfully.')).toBeInTheDocument();
      expect(screen.getByText('2 operations found.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Next$/i })).toBeEnabled();
    });

    it('shows the parse error and keeps Next disabled', async () => {
      renderWizard();
      await loadSpecAndGoToSpecification(GET_PET_SPEC);

      fireEvent.change(screen.getByRole('textbox', { name: 'OpenAPI Specification' }), {
        target: { value: 'Invalid specification' },
      });
      fireEvent.click(screen.getByRole('button', { name: /parse specification/i }));

      expect(await screen.findByText('Invalid OpenAPI specification.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Next$/i })).toBeDisabled();
    });

    it('goes to the Operations step with Next once the specification is parsed', async () => {
      renderWizard();
      await loadSpecAndGoToSpecification(GET_PET_SPEC);

      fireEvent.click(await screen.findByRole('button', { name: /^Next$/i }));

      expect(await screen.findByLabelText('Create Rest DSL operations')).toBeInTheDocument();
    });
  });

  describe('Operations step', () => {
    it('renders import options checkboxes', async () => {
      renderWizard();
      await parseSpecAndGoToOperations(GET_PET_SPEC);
      await waitFor(() => {
        expect(screen.getByLabelText('Create Rest DSL operations')).toBeInTheDocument();
        expect(screen.getByLabelText('Create routes with direct endpoints')).toBeInTheDocument();
      });
    });

    it('toggles the Create Rest DSL operations checkbox', async () => {
      renderWizard();
      await parseSpecAndGoToOperations(GET_PET_SPEC);

      const checkbox = await screen.findByLabelText('Create Rest DSL operations');
      expect(checkbox).not.toBeChecked();
      fireEvent.click(checkbox);

      await waitFor(() => {
        expect(checkbox).toBeChecked();
      });
    });

    it('renders operations list when operations are available', async () => {
      renderWizard();

      await parseSpecAndGoToOperations(GET_PET_BY_ID_SPEC);

      await waitFor(() => {
        expect(screen.getByText('Select all operations')).toBeInTheDocument();
        expect(screen.getByLabelText(/GET \/pet\/{id}/)).toBeInTheDocument();
      });
    });

    it('toggles an individual operation', async () => {
      renderWizard();

      await parseSpecAndGoToOperations(GET_PET_SPEC);

      const checkbox = await screen.findByLabelText(/GET \/pet/);
      expect(checkbox).toBeChecked();
      fireEvent.click(checkbox);

      await waitFor(() => {
        expect(checkbox).not.toBeChecked();
      });
    });

    it('shows operation as disabled with "Route exists" label when routeExists is true', async () => {
      const existingRoutes = new CamelRouteResource([
        { route: { id: 'route-getPet', from: { uri: 'direct:getPet', steps: [] } } },
      ]);
      const { Provider } = await TestProvidersWrapper({ camelResource: existingRoutes });
      renderWizard(Provider);

      await parseSpecAndGoToOperations(GET_PET_SPEC);

      await waitFor(() => {
        const checkbox = screen.getByLabelText(/GET \/pet - Route exists/);
        expect(checkbox).toBeInTheDocument();
        expect(checkbox).toBeDisabled();
      });
    });

    it('stays on Operations and shows the validation error when nothing is selected', async () => {
      renderWizard();
      await parseSpecAndGoToOperations(GET_PET_SPEC);

      // Deselect the only operation, so the import fails
      fireEvent.click(await screen.findByLabelText(/GET \/pet/));
      fireEvent.click(await screen.findByRole('button', { name: /^Import$/i }));

      expect(await screen.findByText('Import failed. Select at least one operation.')).toBeInTheDocument();
      expect(screen.getByLabelText('Select all operations')).toBeInTheDocument();
      expect(screen.queryByText('No import results yet.')).not.toBeInTheDocument();
    });

    it('does not show the import validation error in the Specification step', async () => {
      renderWizard();
      await parseSpecAndGoToOperations(GET_PET_SPEC);
      fireEvent.click(await screen.findByLabelText(/GET \/pet/));
      fireEvent.click(await screen.findByRole('button', { name: /^Import$/i }));
      await screen.findByText('Import failed. Select at least one operation.');

      goToSpecificationStep();

      expect(await screen.findByRole('textbox', { name: 'OpenAPI Specification' })).toBeInTheDocument();
      expect(screen.queryByText('Import failed. Select at least one operation.')).not.toBeInTheDocument();
    });
  });

  describe('Steps progress', () => {
    const stepButton = (name: RegExp) =>
      within(screen.getByRole('navigation', { name: 'Import steps' })).getByRole('button', { name });

    it('disables Specification and Operations until the specification is loaded', async () => {
      renderWizard();

      expect(stepButton(/specification/i)).toBeDisabled();
      expect(stepButton(/operations/i)).toBeDisabled();

      await loadSpec(GET_PET_SPEC);

      expect(stepButton(/specification/i)).toBeEnabled();
      expect(stepButton(/operations/i)).toBeEnabled();
    });

    it('disables Operations again when the specification is edited and not parsed', async () => {
      renderWizard();
      await loadSpecAndGoToSpecification(GET_PET_SPEC);

      fireEvent.change(screen.getByRole('textbox', { name: 'OpenAPI Specification' }), {
        target: { value: 'openapi: 3.0.0' },
      });

      expect(stepButton(/import source/i)).toHaveTextContent('Incomplete');
      expect(stepButton(/operations/i)).toBeDisabled();
    });

    it('disables the Result step until an import has run', () => {
      renderWizard();

      expect(stepButton(/result/i)).toBeDisabled();
    });

    it('marks the steps as complete once the specification is parsed and imported', async () => {
      renderWizard();
      await importSpec(GET_PET_SPEC);

      await screen.findByText('Import succeeded. 1 operation added.');
      expect(stepButton(/import source/i)).toHaveTextContent('Complete');
      expect(stepButton(/specification/i)).toHaveTextContent('Complete');
      expect(stepButton(/operations/i)).toHaveTextContent('Complete');
      expect(stepButton(/result/i)).toBeEnabled();
    });

    it('marks Operations and Result as invalid when the import throws', async () => {
      camelResource.addNewEntity = vi.fn(() => {
        throw new Error('boom');
      });
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      renderWizard();

      await importSpec(GET_PET_SPEC);

      await screen.findByText('Import failed.');
      expect(stepButton(/operations/i)).toHaveTextContent('Invalid');
      expect(stepButton(/result/i)).toHaveTextContent('Invalid');
    });
  });

  describe('Specification edits', () => {
    it('requires a new parse after the text is edited', async () => {
      renderWizard();
      await loadSpecAndGoToSpecification(GET_PET_SPEC);
      await screen.findByText('Specification parsed successfully.');
      expect(screen.getByRole('button', { name: /^Next$/i })).toBeEnabled();

      fireEvent.change(screen.getByRole('textbox', { name: 'OpenAPI Specification' }), {
        target: { value: createSpec({ '/orders': { get: { operationId: 'getOrders' } } }) },
      });

      expect(screen.queryByText('Specification parsed successfully.')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Next$/i })).toBeDisabled();

      fireEvent.click(screen.getByRole('button', { name: /parse specification/i }));

      expect(await screen.findByText('Specification parsed successfully.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Next$/i })).toBeEnabled();
    });

    it('does not show an import error as a parse error after the source changes', async () => {
      renderWizard();
      await parseSpecAndGoToOperations(GET_PET_SPEC);
      fireEvent.click(screen.getByLabelText('GET /pet'));
      fireEvent.click(screen.getByRole('button', { name: /^Import$/i }));
      expect(await screen.findByText('Import failed. Select at least one operation.')).toBeInTheDocument();

      goToStep(/import source/i);
      fireEvent.click(screen.getByLabelText('Import from URI'));

      expect(
        within(screen.getByRole('navigation', { name: 'Import steps' })).getByRole('button', {
          name: /specification/i,
        }),
      ).toBeDisabled();
      expect(screen.queryByText('Import failed. Select at least one operation.')).not.toBeInTheDocument();
    });
  });

  describe('Previous result', () => {
    const stepButton = (name: RegExp) =>
      within(screen.getByRole('navigation', { name: 'Import steps' })).getByRole('button', { name });

    it('discards the result when the specification is edited, and keeps Specification reachable', async () => {
      renderWizard();
      await importSpec(GET_PET_SPEC);
      await screen.findByText('Import succeeded. 1 operation added.');

      goToSpecificationStep();
      fireEvent.change(await screen.findByRole('textbox', { name: 'OpenAPI Specification' }), {
        target: { value: 'openapi: 3.0.0' },
      });

      expect(stepButton(/result/i)).toBeDisabled();
      expect(stepButton(/operations/i)).toHaveTextContent('Incomplete');

      goToStep(/import source/i);
      expect(stepButton(/specification/i)).toBeEnabled();
    });

    it('discards the failure when the specification is edited', async () => {
      camelResource.addNewEntity = vi.fn(() => {
        throw new Error('boom');
      });
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      renderWizard();
      await importSpec(GET_PET_SPEC);
      await screen.findByText('Import failed.');

      goToSpecificationStep();
      fireEvent.change(await screen.findByRole('textbox', { name: 'OpenAPI Specification' }), {
        target: { value: 'openapi: 3.0.0' },
      });

      expect(stepButton(/result/i)).toBeDisabled();
      expect(stepButton(/operations/i)).not.toHaveTextContent('Invalid');
    });
  });

  describe('URI source', () => {
    const fetchFromUri = (uri: string) => {
      fireEvent.change(screen.getByPlaceholderText('https://example.com/openapi.yaml'), { target: { value: uri } });
      fireEvent.click(screen.getByRole('button', { name: /fetch/i }));
    };

    it('discards the loaded specification when the URI is edited', async () => {
      fetchSpy.mockResolvedValue(new Response(GET_PET_SPEC, { status: 200 }));
      renderWizard();
      fireEvent.click(screen.getByLabelText('Import from URI'));
      fetchFromUri('http://example.com/a.yaml');
      await screen.findByText('Loaded');
      expect(screen.getByRole('button', { name: /^Next$/i })).toBeEnabled();

      fireEvent.change(screen.getByPlaceholderText('https://example.com/openapi.yaml'), {
        target: { value: 'http://example.com/b.yaml' },
      });

      expect(screen.queryByText('Loaded')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Next$/i })).toBeDisabled();
    });

    it('ignores a fetch that finishes after the URI was edited', async () => {
      let resolveFetch: (response: Response) => void = () => undefined;
      fetchSpy.mockReturnValue(
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
      );
      renderWizard();
      fireEvent.click(screen.getByLabelText('Import from URI'));
      fetchFromUri('http://example.com/a.yaml');

      fireEvent.change(screen.getByPlaceholderText('https://example.com/openapi.yaml'), {
        target: { value: 'http://example.com/b.yaml' },
      });
      resolveFetch(new Response(GET_PET_SPEC, { status: 200 }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /fetch/i })).toBeEnabled();
      });
      expect(screen.queryByText('Loaded')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Next$/i })).toBeDisabled();
    });

    it('discards the loaded specification when the URI is edited while a refetch is pending', async () => {
      let resolveRefetch: (response: Response) => void = () => undefined;
      fetchSpy.mockResolvedValueOnce(new Response(GET_PET_SPEC, { status: 200 })).mockReturnValueOnce(
        new Promise<Response>((resolve) => {
          resolveRefetch = resolve;
        }),
      );
      renderWizard();
      fireEvent.click(screen.getByLabelText('Import from URI'));
      fetchFromUri('http://example.com/a.yaml');
      await screen.findByText('Loaded');

      fireEvent.click(screen.getByRole('button', { name: /fetch/i }));
      fireEvent.change(screen.getByPlaceholderText('https://example.com/openapi.yaml'), {
        target: { value: 'http://example.com/b.yaml' },
      });
      resolveRefetch(new Response(GET_PET_SPEC, { status: 200 }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /fetch/i })).toBeEnabled();
      });
      expect(screen.queryByText('Loaded')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Next$/i })).toBeDisabled();
    });

    it('discards the loaded specification when the URI is edited after a failed refetch', async () => {
      fetchSpy
        .mockResolvedValueOnce(new Response(GET_PET_SPEC, { status: 200 }))
        .mockResolvedValueOnce(new Response('', { status: 500 }));
      renderWizard();
      fireEvent.click(screen.getByLabelText('Import from URI'));
      fetchFromUri('http://example.com/a.yaml');
      await screen.findByText('Loaded');

      fireEvent.click(screen.getByRole('button', { name: /fetch/i }));
      await screen.findByText('Failed to fetch specification (HTTP 500)');

      fireEvent.change(screen.getByPlaceholderText('https://example.com/openapi.yaml'), {
        target: { value: 'http://example.com/b.yaml' },
      });

      expect(screen.getByRole('button', { name: /^Next$/i })).toBeDisabled();
    });
  });

  describe('Apicurio source', () => {
    it('does not keep the previous artifact importable while another one is loading or failed', async () => {
      fetchSpy.mockImplementation((input) => {
        const url = String(input);
        if (url.includes('/search/artifacts')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                artifacts: [
                  { id: 'pets', name: 'Pets', type: 'OPENAPI' },
                  { id: 'orders', name: 'Orders', type: 'OPENAPI' },
                ],
              }),
              { status: 200 },
            ),
          );
        }
        return Promise.resolve(
          url.endsWith('/pets') ? new Response(GET_PET_SPEC, { status: 200 }) : new Response('', { status: 500 }),
        );
      });
      renderWizard();
      fireEvent.click(screen.getByLabelText('Import from Apicurio'));
      fireEvent.click(await screen.findByLabelText(/Pets/));
      await screen.findByText('Loaded');
      expect(screen.getByRole('button', { name: /^Next$/i })).toBeEnabled();

      fireEvent.click(screen.getByLabelText(/Orders/));

      await screen.findByText('Failed to fetch artifact (500)');
      expect(screen.getByRole('button', { name: /^Next$/i })).toBeDisabled();
    });

    it('ignores an artifact that finishes downloading after the user changed the source', async () => {
      let resolveArtifact: (response: Response) => void = () => undefined;
      fetchSpy.mockImplementation((input) => {
        if (String(input).includes('/search/artifacts')) {
          return Promise.resolve(
            new Response(JSON.stringify({ artifacts: [{ id: 'pets', name: 'Pets', type: 'OPENAPI' }] }), {
              status: 200,
            }),
          );
        }
        return new Promise<Response>((resolve) => {
          resolveArtifact = resolve;
        });
      });
      renderWizard();
      fireEvent.click(screen.getByLabelText('Import from Apicurio'));
      fireEvent.click(await screen.findByLabelText(/Pets/));

      fireEvent.click(screen.getByLabelText('Upload file'));
      resolveArtifact(new Response(GET_PET_SPEC, { status: 200 }));

      await waitFor(() => {
        expect(screen.getByLabelText('Upload file')).toBeChecked();
      });
      expect(screen.getByRole('button', { name: /^Next$/i })).toBeDisabled();
    });
  });

  describe('Source selection', () => {
    it('keeps the URI when the user comes back to Import source', async () => {
      fetchSpy.mockResolvedValue(new Response(GET_PET_SPEC, { status: 200 }));
      renderWizard();
      fireEvent.click(screen.getByLabelText('Import from URI'));
      fireEvent.change(screen.getByPlaceholderText('https://example.com/openapi.yaml'), {
        target: { value: 'http://example.com/spec.yaml' },
      });
      fireEvent.click(screen.getByRole('button', { name: /fetch/i }));
      await screen.findByText('Loaded');

      goToSpecificationStep();
      await screen.findByRole('textbox', { name: 'OpenAPI Specification' });
      goToStep(/import source/i);

      expect(screen.getByPlaceholderText('https://example.com/openapi.yaml')).toHaveValue(
        'http://example.com/spec.yaml',
      );
    });

    it('keeps the uploaded file when the user comes back to Import source and drops it when removed', async () => {
      renderWizard();
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [new File([GET_PET_SPEC], 'spec.json')] } });
      await screen.findByText('Schema loaded successfully');
      expect(screen.getByRole('button', { name: /^Next$/i })).toBeEnabled();

      goToSpecificationStep();
      await screen.findByRole('textbox', { name: 'OpenAPI Specification' });
      goToStep(/import source/i);

      expect(screen.getByText('spec.json')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Next$/i })).toBeEnabled();

      fireEvent.click(screen.getByRole('button', { name: /remove file/i }));

      expect(screen.getByRole('button', { name: /^Next$/i })).toBeDisabled();
    });
  });

  describe('Result step', () => {
    it('shows the success notification and what to do next when the import succeeds', async () => {
      renderWizard();

      await importSpec(TWO_OPERATIONS_SPEC);

      expect(await screen.findByText('Import succeeded. 2 operations added.')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'What you can do next' })).toBeInTheDocument();
      expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalled();
    });

    it('calls onGoToDesigner and resets the wizard when Go to Designer is clicked', async () => {
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

    it('calls onClose and resets the wizard when Go to Rest Editor is clicked', async () => {
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

    it('shows the failure view and lets the user go back when the import throws', async () => {
      camelResource.addNewEntity = vi.fn(() => {
        throw new Error('boom');
      });
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      renderWizard();

      await importSpec(GET_PET_SPEC);

      expect(await screen.findByText('Import failed.')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'What you can do' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /go to designer/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go to rest editor/i })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /^Back$/i }));

      expect(await screen.findByRole('button', { name: /^Import$/i })).toBeInTheDocument();
    });
  });

  describe('Wizard footer', () => {
    it('disables Back button on first step', () => {
      renderWizard();
      expect(screen.getByRole('button', { name: /^back$/i })).toBeDisabled();
    });

    it('goes back to the previous step when clicking Back', async () => {
      renderWizard();
      await loadSpecAndGoToSpecification(GET_PET_SPEC);

      fireEvent.click(screen.getByRole('button', { name: /^back$/i }));

      expect(await screen.findByLabelText('Import from Apicurio')).toBeInTheDocument();
    });

    it('disables Import button when neither REST nor routes are selected', async () => {
      renderWizard();
      await parseSpecAndGoToOperations(GET_PET_SPEC);

      // `Create Rest DSL operations` is unchecked by default
      fireEvent.click(await screen.findByLabelText('Create routes with direct endpoints'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^Import$/i })).toBeDisabled();
      });
    });
  });

  describe('Settings', () => {
    it('calls onOpenSettings when the Apicurio registry is not configured', () => {
      const noRegistry = new DefaultSettingsAdapter({ rest: { apicurioRegistryUrl: '', customMediaTypes: [] } });
      render(
        <SettingsContext.Provider value={noRegistry}>
          <EntitiesProvider>
            <RestDslImportWizard
              onClose={mockOnClose}
              onGoToDesigner={mockOnGoToDesigner}
              onOpenSettings={mockOnOpenSettings}
            />
          </EntitiesProvider>
        </SettingsContext.Provider>,
      );

      fireEvent.click(screen.getByLabelText('Import from Apicurio'));
      fireEvent.click(screen.getByRole('button', { name: 'Open Settings' }));

      expect(mockOnOpenSettings).toHaveBeenCalled();
    });
  });
});
