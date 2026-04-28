import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { ModelContextProvider, SchemaProvider } from '@kaoto/forms';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { JSONSchema4 } from 'json-schema';
import { FunctionComponent, PropsWithChildren } from 'react';

import { CatalogContext, CatalogTilesContext } from '../../../../../../dynamic-catalog';
import { CatalogModalProvider } from '../../../../../../dynamic-catalog/catalog-modal.provider';
import { IDynamicCatalogRegistry } from '../../../../../../dynamic-catalog/models';
import { CatalogKind } from '../../../../../../models/catalog-kind';
import { CitrusTestResource } from '../../../../../../models/citrus/citrus-test-resource';
import { Test } from '../../../../../../models/citrus/entities/Test';
import { CamelCatalogService } from '../../../../../../models/visualization/flows';
import { TestProvidersWrapper } from '../../../../../../stubs';
import { getFirstCitrusCatalogMap } from '../../../../../../stubs/test-load-catalog';
import { ITile } from '../../../../../Catalog';
import { EndpointField } from './EndpointField';

describe('EndpointField', () => {
  const mockTiles: ITile[] = [
    { name: 'http-client', type: 'testEndpoint', title: 'Http Client', tags: [], iconUrl: '' },
    { name: 'jms-asynchronous', type: 'testEndpoint', title: 'Jms Asynchronous', tags: [], iconUrl: '' },
  ];

  const mockCatalogRegistry: IDynamicCatalogRegistry = {
    getEntity: jest.fn(),
    getCatalog: jest.fn(),
    setCatalog: jest.fn(),
    clearRegistry: jest.fn(),
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(async () => {
    const catalogsMap = await getFirstCitrusCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.TestEndpoint, catalogsMap.endpointsCatalogMap);
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
    onPropertyChange: jest.Mock = jest.fn(),
    options: { disabled?: boolean; required?: boolean } = {},
  ) => {
    const camelResource = createTestResource(testModel);
    const { Provider } = TestProvidersWrapper({ camelResource });

    await act(async () => {
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
    });

    return {
      getInput: () => screen.getByRole('textbox', { name: schema.title }),
    };
  };

  describe('rendering', () => {
    it('should render with undefined value', async () => {
      const testModel: Test = {
        name: 'test',
        actions: [],
      };

      const { getInput } = await renderField({ endpoint: undefined }, testModel);

      const input = getInput();
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

      const { getInput } = await renderField({ endpoint: 'httpClient' }, testModel);

      const input = getInput();
      expect(input).toHaveValue('httpClient');
    });

    it('should render with disabled state', async () => {
      const testModel: Test = {
        name: 'test',
        actions: [],
      };

      await renderField({ endpoint: undefined }, testModel, jest.fn(), { disabled: true });

      // When disabled, the component should render but interaction should be prevented
      // Note: The Typeahead component may not set the disabled attribute on the input itself
      const input = screen.getByRole('textbox', { name: schema.title });
      expect(input).toBeInTheDocument();
    });

    it('should render with required prop', async () => {
      const testModel: Test = {
        name: 'test',
        actions: [],
      };

      const { getInput } = await renderField({ endpoint: undefined }, testModel, jest.fn(), { required: true });

      const input = getInput();
      const formGroup = input.closest('.pf-v6-c-form__group');
      expect(formGroup).toBeInTheDocument();

      const requiredLabel = formGroup?.querySelector('.pf-v6-c-form__label-required');
      expect(requiredLabel).toBeInTheDocument();
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
      await waitFor(() => expect(screen.getByLabelText('Endpoint toggle')).toBeInTheDocument());
      const toggle = screen.getByLabelText('Endpoint toggle');

      await act(async () => {
        fireEvent.click(toggle);
      });

      // Check that both endpoints appear in the dropdown
      await waitFor(() => {
        expect(screen.getByText('httpClient')).toBeInTheDocument();
        expect(screen.getByText('jmsQueue')).toBeInTheDocument();
      });
    });
  });

  describe('create endpoint', () => {
    it('should create new endpoint', async () => {
      const onPropertyChange = jest.fn();
      const testModel: Test = {
        name: 'test',
        actions: [],
      };

      await renderField({ endpoint: undefined }, testModel, onPropertyChange);

      // Open the dropdown
      await waitFor(() => expect(screen.getByLabelText('Endpoint toggle')).toBeInTheDocument());
      const toggle = screen.getByLabelText('Endpoint toggle');

      await act(async () => {
        fireEvent.click(toggle);
      });

      // Create new endpoint
      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'option create-new-with-name' })).toBeInTheDocument();
      });

      await act(async () => {
        const createNew = screen.getByRole('option', { name: 'option create-new-with-name' });
        fireEvent.click(createNew);
      });

      // Modal should appear
      await waitFor(() => {
        expect(screen.getByTestId('EndpointModal')).toBeInTheDocument();
        // Modal should be in Create mode
        expect(screen.getByText('Create endpoint')).toBeInTheDocument();
      });

      // Select endpoint from catalog
      await waitFor(() => {
        expect(screen.getByTestId('tile-header-http-client')).toBeInTheDocument();
      });

      // Click on a tile
      const httpClientTile = screen.getByTestId('tile-header-http-client');
      await act(async () => {
        fireEvent.click(httpClientTile);
      });

      const nameInput = screen.getByLabelText('Name');
      await act(async () => {
        fireEvent.change(nameInput, { target: { value: 'httpClient' } });
      });

      const url = screen.getByLabelText('RequestUrl');
      await act(async () => {
        fireEvent.change(url, { target: { value: 'http://localhost:8080' } });
      });

      const confirmButton = screen.getByTestId('endpoint-modal-confirm-btn');
      await act(async () => {
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(onPropertyChange).toHaveBeenCalledWith(PROP_NAME, 'httpClient');
      });
    });
  });

  describe('value changes', () => {
    it('should call onPropertyChange when selecting an endpoint', async () => {
      const onPropertyChange = jest.fn();
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

      const { getInput } = await renderField({ endpoint: undefined }, testModel, onPropertyChange);

      // Open the dropdown
      await waitFor(() => expect(screen.getByLabelText('Endpoint toggle')).toBeInTheDocument());
      const toggle = screen.getByLabelText('Endpoint toggle');

      await act(async () => {
        fireEvent.click(toggle);
      });

      // Select an endpoint
      await waitFor(() => {
        expect(screen.getByText('httpClient')).toBeInTheDocument();
      });

      await act(async () => {
        const option = screen.getByRole('option', { name: 'option httpclient' });
        fireEvent.click(option);
      });

      await waitFor(() => {
        expect(onPropertyChange).toHaveBeenCalledWith(PROP_NAME, 'httpClient');
      });

      const input = getInput();
      expect(input).toHaveValue('httpClient');
    });

    it('should handle clearing the input', async () => {
      const onPropertyChange = jest.fn();
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

      const { getInput } = await renderField({ endpoint: 'httpClient' }, testModel, onPropertyChange);

      const input = getInput();
      expect(input).toHaveValue('httpClient');

      // Find and click the clear button
      await waitFor(() => expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument());
      const clearButton = screen.getByRole('button', { name: /clear/i });

      await act(async () => {
        fireEvent.click(clearButton);
      });

      await waitFor(() => {
        expect(onPropertyChange).toHaveBeenCalledWith(PROP_NAME, undefined);
      });
    });

    it('should change selected endpoint', async () => {
      const onPropertyChange = jest.fn();
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

      const { getInput } = await renderField({ endpoint: 'httpClient' }, testModel, onPropertyChange);

      const input = getInput();
      expect(input).toHaveValue('httpClient');

      // Open dropdown and select different endpoint
      await waitFor(() => expect(screen.getByLabelText('Endpoint toggle')).toBeInTheDocument());
      const toggle = screen.getByLabelText('Endpoint toggle');

      await act(async () => {
        fireEvent.click(toggle);
      });

      await waitFor(() => {
        expect(screen.getByText('jmsQueue')).toBeInTheDocument();
      });

      await act(async () => {
        const option = screen.getByRole('option', { name: 'option jmsqueue' });
        fireEvent.click(option);
      });

      await waitFor(() => {
        expect(onPropertyChange).toHaveBeenCalledWith(PROP_NAME, 'jmsQueue');
      });
    });

    it('should allow a custom endpoint name', async () => {
      const onPropertyChange = jest.fn();
      const testModel: Test = {
        name: 'test',
        actions: [],
      };

      const { getInput } = await renderField({ endpoint: undefined }, testModel, onPropertyChange);

      const input = getInput();

      await act(async () => {
        fireEvent.click(input);
        fireEvent.change(input, { target: { value: 'customEndpoint' } });
      });

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
      await waitFor(() => expect(screen.getByLabelText('Endpoint toggle')).toBeInTheDocument());
      const toggle = screen.getByLabelText('Endpoint toggle');

      await act(async () => {
        fireEvent.click(toggle);
      });

      // The endpoint type should be shown in the description
      await waitFor(() => {
        const httpClientOption = screen.getByRole('option', { name: 'option httpclient' });
        expect(httpClientOption).toBeInTheDocument();
        expect(httpClientOption).toHaveTextContent('http.client');
      });
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
      await waitFor(() => expect(screen.getByLabelText('Endpoint toggle')).toBeInTheDocument());
      const toggle = screen.getByLabelText('Endpoint toggle');

      await act(async () => {
        fireEvent.click(toggle);
      });

      // Check that the dynamic endpoint appears
      await waitFor(() => {
        expect(screen.getByText('dynamicJmsEndpoint')).toBeInTheDocument();
      });
    });
  });

  describe('object values', () => {
    it('should handle object values by stringifying them', async () => {
      const testModel: Test = {
        name: 'test',
        actions: [],
      };

      const objectValue = { uri: 'http://localhost:8080' };
      const { getInput } = await renderField({ endpoint: objectValue }, testModel);

      const input = getInput();
      expect(input).toHaveValue(JSON.stringify(objectValue));
    });
  });
});
