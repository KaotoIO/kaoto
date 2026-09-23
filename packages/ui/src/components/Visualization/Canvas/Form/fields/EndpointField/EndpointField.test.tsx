import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { ModelContextProvider, SchemaProvider } from '@kaoto/forms';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { JSONSchema4 } from 'json-schema';
import { FunctionComponent, PropsWithChildren } from 'react';
import type { Mock } from 'vitest';

import { CatalogModalProvider } from '../../../../../../dynamic-catalog/catalog-modal.provider';
import { DynamicCatalogRegistry } from '../../../../../../dynamic-catalog/dynamic-catalog-registry';
import { IDynamicCatalogRegistry } from '../../../../../../dynamic-catalog/models';
import { CatalogContext, CatalogTilesContext } from '../../../../../../dynamic-catalog/ui';
import { CitrusTestResource } from '../../../../../../models/citrus/citrus-test-resource';
import { Test } from '../../../../../../models/citrus/entities/Test';
import { TestProvidersWrapper } from '../../../../../../stubs';
import { getFirstCitrusCatalogMap, setupCitrusDynamicCatalogRegistry } from '../../../../../../stubs/test-load-catalog';
import { ITile } from '../../../../../Catalog';
import { EndpointField } from './EndpointField';

describe('EndpointField', () => {
  const mockTiles: ITile[] = [
    { name: 'http-client', type: 'testEndpoint', title: 'Http Client', tags: [], iconUrl: '' },
    { name: 'jms-asynchronous', type: 'testEndpoint', title: 'Jms Asynchronous', tags: [], iconUrl: '' },
  ];

  const mockCatalogRegistry: IDynamicCatalogRegistry = {
    getEntity: vi.fn(),
    getCatalog: vi.fn(),
    setCatalog: vi.fn(),
    clearRegistry: vi.fn(),
  };

  const createWrapper = (
    fetchTiles: () => Promise<ITile[]> = () => Promise.resolve(mockTiles),
    getTiles: () => ITile[] = () => mockTiles,
  ): FunctionComponent<PropsWithChildren> => {
    const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
      <CatalogContext.Provider value={mockCatalogRegistry}>
        <CatalogTilesContext.Provider value={{ fetchTiles, getTiles }}>
          <CatalogModalProvider>{children}</CatalogModalProvider>
        </CatalogTilesContext.Provider>
      </CatalogContext.Provider>
    );
    return wrapper;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
  });

  beforeAll(async () => {
    const catalogsMap = await getFirstCitrusCatalogMap(catalogLibrary as CatalogLibrary);
    setupCitrusDynamicCatalogRegistry(catalogsMap);
  });

  afterAll(() => {
    DynamicCatalogRegistry.get().clearRegistry();
  });

  const PROP_NAME = 'endpoint';
  const schema: JSONSchema4 = {
    title: 'Endpoint',
    type: 'string',
    description: 'Reference to an endpoint',
  };

  const createTestResource = (testModel: Test) => new CitrusTestResource(testModel);

  const renderField = async (
    model: Record<string, unknown>,
    testModel: Test,
    onPropertyChange: Mock = vi.fn(),
    options: { disabled?: boolean; required?: boolean } = {},
  ) => {
    const camelResource = createTestResource(testModel);
    const { Provider } = await TestProvidersWrapper({ camelResource });

    const wrapper = createWrapper();
    render(
      <Provider>
        <SchemaProvider schema={schema}>
          <ModelContextProvider model={model} onPropertyChange={onPropertyChange} disabled={options.disabled}>
            <EndpointField propName={PROP_NAME} required={options.required} />
          </ModelContextProvider>
        </SchemaProvider>
      </Provider>,
      { wrapper },
    );

    return {
      findInput: () => screen.findByRole('combobox', { name: schema.title }),
    };
  };

  describe('rendering', () => {
    it('should render with undefined value', async () => {
      const testModel: Test = {
        name: 'test',
        actions: [],
      };

      const { findInput } = await renderField({ endpoint: undefined }, testModel);

      const input = await findInput();
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('');
    });

    it('should render with string endpoint reference', async () => {
      const testModel: Test = {
        name: 'test',
        actions: [],
        endpoints: [
          {
            http: {
              client: {
                name: 'httpClient',
                requestUrl: 'http://localhost:8080',
              },
            },
          },
        ],
      };

      const { findInput } = await renderField({ endpoint: 'httpClient' }, testModel);

      const input = await findInput();
      expect(input).toHaveValue('httpClient');
    });

    it('should render with disabled state', async () => {
      const testModel: Test = {
        name: 'test',
        actions: [],
      };

      await renderField({ endpoint: undefined }, testModel, vi.fn(), { disabled: true });

      // When disabled, the component should render but interaction should be prevented
      // Note: The Typeahead component may not set the disabled attribute on the input itself
      const input = await screen.findByRole('combobox', { name: schema.title });
      expect(input).toBeInTheDocument();
    });

    it('should render with required prop', async () => {
      const testModel: Test = {
        name: 'test',
        actions: [],
      };

      const { findInput } = await renderField({ endpoint: undefined }, testModel, vi.fn(), { required: true });

      const input = await findInput();
      const fieldWrapper = input.closest('[data-testid="endpoint__field-wrapper"]');
      expect(fieldWrapper).toBeInTheDocument();
      expect(fieldWrapper?.querySelector('.kaoto-field-wrapper__required')).toBeInTheDocument();
    });

    it('should display available endpoints from test resource', async () => {
      const testModel: Test = {
        name: 'test',
        actions: [],
        endpoints: [
          {
            http: {
              client: {
                name: 'httpClient',
                requestUrl: 'http://localhost:8080',
              },
            },
          },
          {
            jms: {
              asynchronous: {
                name: 'jmsQueue',
                connectionFactory: 'jmsConnectionFactory',
                destination: 'test.queue',
              },
            },
          },
        ],
      };

      await renderField({ endpoint: undefined }, testModel);

      // Open the dropdown
      const toggle = await screen.findByRole('button', { name: 'Open' });

      fireEvent.click(toggle);

      // Check that both endpoints appear in the dropdown
      await screen.findByText('httpClient');
      await screen.findByText('jmsQueue');
    });
  });

  it('should create new endpoint', async () => {
    const onPropertyChange = vi.fn();
    const testModel: Test = {
      name: 'test',
      actions: [],
    };

    await renderField({ endpoint: undefined }, testModel, onPropertyChange);

    // Open the dropdown
    const toggle = await screen.findByRole('button', { name: 'Open' });

    fireEvent.click(toggle);

    // Create new endpoint
    const createNew = await screen.findByRole('option', { name: /Create new/i });
    fireEvent.click(createNew);

    // Modal should appear
    await screen.findByTestId('NewEndpointModal');
    // Modal should be in Create mode
    await screen.findByText('Create endpoint');

    // Select endpoint from catalog
    const httpClientTile = await screen.findByTestId('tile-header-http-client');
    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      fireEvent.click(httpClientTile);
    });

    const nameInput = await screen.findByLabelText('Name');
    fireEvent.change(nameInput, { target: { value: 'httpClient' } });

    const url = await screen.findByLabelText('RequestUrl');
    fireEvent.change(url, { target: { value: 'http://localhost:8080' } });

    const confirmButton = await screen.findByTestId('endpoint-modal-confirm-btn');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(onPropertyChange).toHaveBeenCalledWith(PROP_NAME, 'httpClient');
    });
  });

  describe('value changes', () => {
    it('should call onPropertyChange when selecting an endpoint', async () => {
      const onPropertyChange = vi.fn();
      const testModel: Test = {
        name: 'test',
        actions: [],
        endpoints: [
          {
            http: {
              client: {
                name: 'httpClient',
                requestUrl: 'http://localhost:8080',
              },
            },
          },
          {
            jms: {
              asynchronous: {
                name: 'jmsQueue',
                connectionFactory: 'jmsConnectionFactory',
                destination: 'test.queue',
              },
            },
          },
        ],
      };

      const { findInput } = await renderField({ endpoint: undefined }, testModel, onPropertyChange);

      // Open the dropdown
      const toggle = await screen.findByRole('button', { name: 'Open' });

      fireEvent.click(toggle);

      // Select an endpoint
      const option = await screen.findByRole('option', { name: 'httpClient' });
      fireEvent.click(option);

      await waitFor(() => {
        expect(onPropertyChange).toHaveBeenCalledWith(PROP_NAME, 'httpClient');
      });

      const input = await findInput();
      expect(input).toHaveValue('httpClient');
    });

    it('should handle clearing the input', async () => {
      const onPropertyChange = vi.fn();
      const testModel: Test = {
        name: 'test',
        actions: [],
        endpoints: [
          {
            http: {
              client: {
                name: 'httpClient',
                requestUrl: 'http://localhost:8080',
              },
            },
          },
        ],
      };

      const { findInput } = await renderField({ endpoint: 'httpClient' }, testModel, onPropertyChange);

      const input = await findInput();
      expect(input).toHaveValue('httpClient');

      // Find and click the clear button
      await screen.findByRole('button', { name: /clear/i });
      const clearButton = await screen.findByRole('button', { name: /clear/i });

      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(onPropertyChange).toHaveBeenCalledWith(PROP_NAME, undefined);
      });
    });

    it('should change selected endpoint', async () => {
      const onPropertyChange = vi.fn();
      const testModel: Test = {
        name: 'test',
        actions: [],
        endpoints: [
          {
            http: {
              client: {
                name: 'httpClient',
                requestUrl: 'http://localhost:8080',
              },
            },
          },
          {
            jms: {
              asynchronous: {
                name: 'jmsQueue',
                connectionFactory: 'jmsConnectionFactory',
                destination: 'test.queue',
              },
            },
          },
        ],
      };

      const { findInput } = await renderField({ endpoint: 'httpClient' }, testModel, onPropertyChange);

      const input = await findInput();
      expect(input).toHaveValue('httpClient');

      // Open dropdown and select different endpoint
      const toggle = await screen.findByRole('button', { name: 'Open' });

      fireEvent.click(toggle);

      const option = await screen.findByRole('option', { name: 'jmsQueue' });
      fireEvent.click(option);

      await waitFor(() => {
        expect(onPropertyChange).toHaveBeenCalledWith(PROP_NAME, 'jmsQueue');
      });
    });

    it('should allow a custom endpoint name', async () => {
      const onPropertyChange = vi.fn();
      const testModel: Test = {
        name: 'test',
        actions: [],
      };

      const { findInput } = await renderField({ endpoint: undefined }, testModel, onPropertyChange);

      const input = await findInput();

      fireEvent.click(input);
      fireEvent.change(input, { target: { value: 'customEndpoint' } });

      // The Typeahead allows custom input with allowCustomInput={true}
      expect(input).toHaveValue('customEndpoint');
    });
  });

  describe('endpoint types', () => {
    it('should display endpoint type as description', async () => {
      const testModel: Test = {
        name: 'test',
        actions: [],
        endpoints: [
          {
            http: {
              client: {
                name: 'httpClient',
                requestUrl: 'http://localhost:8080',
              },
            },
          },
        ],
      };

      await renderField({ endpoint: undefined }, testModel);

      // Open the dropdown
      const toggle = await screen.findByRole('button', { name: 'Open' });

      fireEvent.click(toggle);

      // The endpoint type should be shown in the description
      const httpClientOption = await screen.findByRole('option', { name: 'httpClient' });
      expect(httpClientOption).toHaveTextContent('http.client');
    });

    it('should handle endpoints from createEndpoint actions', async () => {
      const testModel: Test = {
        name: 'test',
        actions: [
          {
            createEndpoint: {
              type: 'jms',
              name: 'dynamicJmsEndpoint',
              properties: {
                destination: 'dynamic.queue',
              },
            },
          },
        ],
      };

      await renderField({ endpoint: undefined }, testModel);

      // Open the dropdown
      const toggle = await screen.findByRole('button', { name: 'Open' });

      fireEvent.click(toggle);

      // Check that the dynamic endpoint appears
      await screen.findByText('dynamicJmsEndpoint');
    });
  });

  it('should handle object values by stringifying them', async () => {
    const testModel: Test = {
      name: 'test',
      actions: [],
    };

    const objectValue = { uri: 'http://localhost:8080' };
    const { findInput } = await renderField({ endpoint: objectValue }, testModel);

    const input = await findInput();
    expect(input).toHaveValue(JSON.stringify(objectValue));
  });

  it('should throw TypeError when camelResource is not a CitrusTestResource', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { Provider } = await TestProvidersWrapper(); // uses CamelRouteResource by default

    expect(() => {
      render(
        <Provider>
          <SchemaProvider schema={schema}>
            <ModelContextProvider model={{}} onPropertyChange={vi.fn()}>
              <EndpointField propName={PROP_NAME} />
            </ModelContextProvider>
          </SchemaProvider>
        </Provider>,
      );
    }).toThrow('EndpointField must be used only with CitrusTestResource');
  });

  it('should restore the previous endpoint reference when cancel is clicked', async () => {
    const onPropertyChange = vi.fn();
    const testModel: Test = {
      name: 'test',
      actions: [],
      endpoints: [
        {
          http: {
            client: {
              name: 'httpClient',
              requestUrl: 'http://localhost:8080',
            },
          },
        },
      ],
    };

    await renderField({ endpoint: 'httpClient' }, testModel, onPropertyChange);

    // Open dropdown and select "create new" option to open the modal
    fireEvent.click(await screen.findByRole('button', { name: 'Open' }));

    fireEvent.click(await screen.findByRole('option', { name: /Create new/i }));

    await screen.findByTestId('NewEndpointModal');

    // Cancel the modal
    fireEvent.click(await screen.findByTestId('endpoint-modal-cancel-btn'));

    await waitFor(() => {
      expect(screen.queryByTestId('NewEndpointModal')).not.toBeInTheDocument();
    });

    // onChange should be called with the original endpoint reference to restore it
    expect(onPropertyChange).toHaveBeenCalledWith(PROP_NAME, 'httpClient');
  });
});
