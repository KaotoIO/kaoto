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
import { ACTION_ID_CANCEL, ACTION_ID_CONFIRM, ActionConfirmationModalContext } from '../../../../../../providers';
import { TestProvidersWrapper } from '../../../../../../stubs';
import { getFirstCitrusCatalogMap } from '../../../../../../stubs/test-load-catalog';
import { ITile } from '../../../../../Catalog';
import { EndpointsField } from './EndpointsField';

describe('EndpointsField', () => {
  const mockTiles: ITile[] = [
    { name: 'http-client', type: 'testEndpoint', title: 'Http Client', tags: [] },
    { name: 'jms-asynchronous', type: 'testEndpoint', title: 'Jms Asynchronous', tags: [] },
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

  const PROP_NAME = 'endpoints';
  const schema: JSONSchema4 = {
    title: 'Endpoints',
    type: 'array',
    description: 'Test endpoints',
  };

  const mockActionConfirmationModalContext = {
    actionConfirmation: jest.fn(),
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
          <ActionConfirmationModalContext.Provider value={mockActionConfirmationModalContext}>
            <SchemaProvider schema={schema}>
              <ModelContextProvider model={model} onPropertyChange={onPropertyChange} disabled={options.disabled}>
                <EndpointsField propName={PROP_NAME} required={options.required} />
              </ModelContextProvider>
            </SchemaProvider>
          </ActionConfirmationModalContext.Provider>
        </Provider>,
        { wrapper },
      );
    });

    return {
      getTable: () => screen.getByRole('grid', { name: 'endpoint-table' }),
      getAddButton: () => screen.getByTestId('create-new-endpoint-btn'),
    };
  };

  describe('rendering', () => {
    it('should render empty table when no endpoints are defined', async () => {
      const testModel: Test = {
        name: 'test',
        actions: [],
      };

      const { getTable, getAddButton } = await renderField({ endpoints: [] }, testModel);

      const table = getTable();
      expect(table).toBeInTheDocument();

      // Table should have headers
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();

      // Add button should be present
      const addButton = getAddButton();
      expect(addButton).toBeInTheDocument();
      expect(addButton).toHaveTextContent('Add');
    });

    it('should render table with endpoints', async () => {
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

      const { getTable } = await renderField({ endpoints: testModel.endpoints }, testModel);

      const table = getTable();
      expect(table).toBeInTheDocument();

      // Check endpoint names are displayed
      expect(screen.getByText('httpClient')).toBeInTheDocument();
      expect(screen.getByText('jmsQueue')).toBeInTheDocument();

      // Check endpoint types are displayed
      expect(screen.getByText('http.client')).toBeInTheDocument();
      expect(screen.getByText('jms.asynchronous')).toBeInTheDocument();
    });

    it('should render edit and delete buttons for each endpoint', async () => {
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

      await renderField({ endpoints: testModel.endpoints }, testModel);

      // Check for edit button
      const editButton = screen.getByTestId('endpoint-edit-0-btn');
      expect(editButton).toBeInTheDocument();
      expect(editButton).toHaveAttribute('title', 'Edit httpClient');

      // Check for delete button
      const deleteButton = screen.getByTestId('endpoint-delete-0-btn');
      expect(deleteButton).toBeInTheDocument();
      expect(deleteButton).toHaveAttribute('title', 'Delete httpClient');
    });

    it('should render with required prop', async () => {
      const testModel: Test = {
        name: 'test',
        actions: [],
      };

      await renderField({ endpoints: [] }, testModel, jest.fn(), { required: true });

      const fieldWrapper = screen.getByTestId('endpoints__field-wrapper');
      expect(fieldWrapper).toBeInTheDocument();
    });
  });

  describe('adding endpoints', () => {
    it('should open modal when Add button is clicked', async () => {
      const testModel: Test = {
        name: 'test',
        actions: [],
      };

      const { getAddButton } = await renderField({ endpoints: [] }, testModel);

      const addButton = getAddButton();

      await act(async () => {
        fireEvent.click(addButton);
      });

      // Modal should appear
      await waitFor(() => {
        expect(screen.getByTestId('EndpointModal')).toBeInTheDocument();
      });

      // Modal should be in Create mode
      expect(screen.getByText('Create endpoint')).toBeInTheDocument();
    });

    it('should add endpoint when confirm button is clicked', async () => {
      const testModel: Test = {
        name: 'test',
        actions: [],
      };

      const { getAddButton } = await renderField({ endpoints: [] }, testModel);

      const addButton = getAddButton();

      await act(async () => {
        fireEvent.click(addButton);
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

      expect(testModel.endpoints).toHaveLength(1);
      expect(testModel.endpoints![0].http.client.name).toEqual('httpClient');
    });

    it('should close modal when cancel is clicked', async () => {
      const testModel: Test = {
        name: 'test',
        actions: [],
      };

      const { getAddButton } = await renderField({ endpoints: [] }, testModel);

      await act(async () => {
        fireEvent.click(getAddButton());
      });

      await waitFor(() => {
        expect(screen.getByTestId('EndpointModal')).toBeInTheDocument();
      });

      const cancelButton = screen.getByTestId('endpoint-modal-cancel-btn');

      await act(async () => {
        fireEvent.click(cancelButton);
      });

      await waitFor(() => {
        expect(screen.queryByTestId('EndpointModal')).not.toBeInTheDocument();
      });
    });
  });

  describe('editing endpoints', () => {
    it('should open modal in Update mode when edit button is clicked', async () => {
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

      await renderField({ endpoints: testModel.endpoints }, testModel);

      const editButton = screen.getByTestId('endpoint-edit-0-btn');

      await act(async () => {
        fireEvent.click(editButton);
      });

      // Modal should appear in Update mode
      await waitFor(() => {
        expect(screen.getByTestId('EndpointModal')).toBeInTheDocument();
        expect(screen.getByText('Update endpoint')).toBeInTheDocument();
      });
    });

    it('should show confirmation modal when renaming an endpoint', async () => {
      mockActionConfirmationModalContext.actionConfirmation.mockResolvedValue(ACTION_ID_CONFIRM);

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

      await renderField({ endpoints: testModel.endpoints }, testModel, onPropertyChange);

      // Click edit button
      const editButton = screen.getByTestId('endpoint-edit-0-btn');
      await act(async () => {
        fireEvent.click(editButton);
      });

      // Wait for modal
      await waitFor(() => {
        expect(screen.getByTestId('EndpointModal')).toBeInTheDocument();
      });

      const input = screen.getByLabelText('Name');
      await act(async () => {
        fireEvent.change(input, { target: { value: 'newHttpClient' } });
      });

      const confirmButton = screen.getByTestId('endpoint-modal-confirm-btn');
      await act(async () => {
        fireEvent.click(confirmButton);
      });

      // The confirmation should be triggered when the user tries to change the name
      // This is handled by the modal's onConfirm callback
      expect(mockActionConfirmationModalContext.actionConfirmation).toHaveBeenCalled();

      expect(testModel.endpoints).toHaveLength(1);
      expect(testModel.endpoints![0].http.client.name).toEqual('newHttpClient');
    });

    it('should not show confirmation modal when update arbitrary properties', async () => {
      mockActionConfirmationModalContext.actionConfirmation.mockResolvedValue(ACTION_ID_CANCEL);

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

      await renderField({ endpoints: testModel.endpoints }, testModel, onPropertyChange);

      // Click edit button
      const editButton = screen.getByTestId('endpoint-edit-0-btn');
      await act(async () => {
        fireEvent.click(editButton);
      });

      // Wait for modal
      await waitFor(() => {
        expect(screen.getByTestId('EndpointModal')).toBeInTheDocument();
      });

      const input = screen.getByLabelText('RequestUrl');
      await act(async () => {
        fireEvent.change(input, { target: { value: 'http://localhost:9999' } });
      });

      const confirmButton = screen.getByTestId('endpoint-modal-confirm-btn');
      await act(async () => {
        fireEvent.click(confirmButton);
      });

      // The confirmation should be triggered when the user tries to change the name
      // This is handled by the modal's onConfirm callback
      expect(mockActionConfirmationModalContext.actionConfirmation).not.toHaveBeenCalled();

      expect(testModel.endpoints).toHaveLength(1);
      expect(testModel.endpoints![0].http.client.requestUrl).toEqual('http://localhost:9999');
    });

    it('should not update endpoint when rename is cancelled', async () => {
      mockActionConfirmationModalContext.actionConfirmation.mockResolvedValue(ACTION_ID_CANCEL);

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

      await renderField({ endpoints: testModel.endpoints }, testModel, onPropertyChange);

      // Click edit button
      const editButton = screen.getByTestId('endpoint-edit-0-btn');
      await act(async () => {
        fireEvent.click(editButton);
      });

      // Wait for modal
      await waitFor(() => {
        expect(screen.getByTestId('EndpointModal')).toBeInTheDocument();
      });

      const input = screen.getByLabelText('Name');
      await act(async () => {
        fireEvent.change(input, { target: { value: 'newHttpClient' } });
      });

      const cancelButton = screen.getByTestId('endpoint-modal-cancel-btn');
      await act(async () => {
        fireEvent.click(cancelButton);
      });

      // The confirmation should be triggered when the user tries to change the name
      // This is handled by the modal's onConfirm callback
      expect(mockActionConfirmationModalContext.actionConfirmation).not.toHaveBeenCalled();

      // The rename confirmation would happen when handleCreateOrEdit is called with a different name
      // This is tested indirectly through the modal interaction
      expect(testModel.endpoints).toHaveLength(1);
    });
  });

  describe('deleting endpoints', () => {
    it('should remove endpoint when delete button is clicked', async () => {
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

      await renderField({ endpoints: testModel.endpoints }, testModel, onPropertyChange);

      // Initial state - 2 endpoints
      expect(screen.getByText('httpClient')).toBeInTheDocument();
      expect(screen.getByText('jmsQueue')).toBeInTheDocument();

      // Delete first endpoint
      const deleteButton = screen.getByTestId('endpoint-delete-0-btn');

      await act(async () => {
        fireEvent.click(deleteButton);
      });

      // httpClient should be removed, jmsQueue should remain
      await waitFor(() => {
        expect(screen.queryByText('httpClient')).not.toBeInTheDocument();
        expect(screen.getByText('jmsQueue')).toBeInTheDocument();
      });

      // onPropertyChange should be called with the updated array
      expect(onPropertyChange).toHaveBeenCalled();
    });

    it('should handle deleting all endpoints', async () => {
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

      await renderField({ endpoints: testModel.endpoints }, testModel, onPropertyChange);

      expect(screen.getByText('httpClient')).toBeInTheDocument();

      const deleteButton = screen.getByTestId('endpoint-delete-0-btn');

      await act(async () => {
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        expect(screen.queryByText('httpClient')).not.toBeInTheDocument();
      });

      // Table should still be present but empty
      const table = screen.getByRole('grid', { name: 'endpoint-table' });
      expect(table).toBeInTheDocument();
    });
  });

  describe('endpoint types', () => {
    it('should display complex endpoint types correctly', async () => {
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

      await renderField({ endpoints: testModel.endpoints }, testModel);

      expect(screen.getByText('http.client')).toBeInTheDocument();
    });

    it('should handle endpoints with explicit type property', async () => {
      const testModel: Test = {
        name: 'test',
        actions: [],
        endpoints: [
          {
            name: 'customEndpoint',
            type: 'custom.type',
          },
        ],
      };

      await renderField({ endpoints: testModel.endpoints }, testModel);

      expect(screen.getByText('customEndpoint')).toBeInTheDocument();
      expect(screen.getByText('custom.type')).toBeInTheDocument();
    });
  });

  describe('multiple endpoints', () => {
    it('should render multiple endpoints with correct indices', async () => {
      const testModel: Test = {
        name: 'test',
        actions: [],
        endpoints: [
          {
            http: {
              client: {
                name: 'endpoint1',
                requestUrl: 'http://localhost:8080',
              },
            },
          },
          {
            jms: {
              asynchronous: {
                name: 'endpoint2',
                connectionFactory: 'jmsConnectionFactory',
                destination: 'queue1',
              },
            },
          },
          {
            direct: {
              asynchronous: {
                name: 'endpoint3',
                queue: 'queue3',
              },
            },
          },
        ],
      };

      await renderField({ endpoints: testModel.endpoints }, testModel);

      // All endpoints should be visible
      expect(screen.getByText('endpoint1')).toBeInTheDocument();
      expect(screen.getByText('endpoint2')).toBeInTheDocument();
      expect(screen.getByText('endpoint3')).toBeInTheDocument();

      // Each should have edit and delete buttons
      expect(screen.getByTestId('endpoint-edit-0-btn')).toBeInTheDocument();
      expect(screen.getByTestId('endpoint-edit-1-btn')).toBeInTheDocument();
      expect(screen.getByTestId('endpoint-edit-2-btn')).toBeInTheDocument();
      expect(screen.getByTestId('endpoint-delete-0-btn')).toBeInTheDocument();
      expect(screen.getByTestId('endpoint-delete-1-btn')).toBeInTheDocument();
      expect(screen.getByTestId('endpoint-delete-2-btn')).toBeInTheDocument();
    });
  });

  describe('handle create or edit', () => {
    describe('validation logic', () => {
      it('should return early when type parameter is empty', async () => {
        const onPropertyChange = jest.fn();
        const testModel: Test = {
          name: 'test',
          actions: [],
          endpoints: [],
        };

        await renderField({ endpoints: [] }, testModel, onPropertyChange);

        // Click the add button to open modal
        const addButton = screen.getByTestId('create-new-endpoint-btn');
        await act(async () => {
          fireEvent.click(addButton);
        });

        await waitFor(() => {
          expect(screen.getByTestId('EndpointModal')).toBeInTheDocument();
        });

        // The confirm button should be disabled when no type is selected
        const confirmButton = screen.getByTestId('endpoint-modal-confirm-btn');
        expect(confirmButton).toBeDisabled();

        // onChange should not be called
        expect(onPropertyChange).not.toHaveBeenCalled();
      });

      it('should return early when model is undefined', async () => {
        const onPropertyChange = jest.fn();
        const testModel: Test = {
          name: 'test',
          actions: [],
          endpoints: [],
        };

        await renderField({ endpoints: [] }, testModel, onPropertyChange);

        // Click the add button
        const addButton = screen.getByTestId('create-new-endpoint-btn');
        await act(async () => {
          fireEvent.click(addButton);
        });

        await waitFor(() => {
          expect(screen.getByTestId('EndpointModal')).toBeInTheDocument();
        });

        // The confirm button should be disabled when model is undefined
        const confirmButton = screen.getByTestId('endpoint-modal-confirm-btn');
        expect(confirmButton).toBeDisabled();

        // onChange should not be called
        expect(onPropertyChange).not.toHaveBeenCalled();
      });
    });

    describe('create operation', () => {
      it('should open modal in Create mode when Add button is clicked', async () => {
        const testModel: Test = {
          name: 'test',
          actions: [],
          endpoints: [],
        };

        await renderField({ endpoints: [] }, testModel);

        const addButton = screen.getByTestId('create-new-endpoint-btn');
        await act(async () => {
          fireEvent.click(addButton);
        });

        await waitFor(() => {
          expect(screen.getByTestId('EndpointModal')).toBeInTheDocument();
          expect(screen.getByText('Create endpoint')).toBeInTheDocument();
        });
      });
    });

    describe('update operation', () => {
      it('should close modal on cancel', async () => {
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

        await renderField({ endpoints: testModel.endpoints }, testModel);

        const editButton = screen.getByTestId('endpoint-edit-0-btn');
        await act(async () => {
          fireEvent.click(editButton);
        });

        await waitFor(() => {
          expect(screen.getByTestId('EndpointModal')).toBeInTheDocument();
        });

        // Cancel to close modal
        const cancelButton = screen.getByTestId('endpoint-modal-cancel-btn');
        await act(async () => {
          fireEvent.click(cancelButton);
        });

        await waitFor(() => {
          expect(screen.queryByTestId('EndpointModal')).not.toBeInTheDocument();
        });
      });
    });
  });
});
