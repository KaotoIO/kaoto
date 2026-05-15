import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { SuggestionRegistryProvider } from '@kaoto/forms';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { CatalogModalContext } from '../../../../../../dynamic-catalog/catalog-modal.provider';
import { CatalogKind, KaotoSchemaDefinition } from '../../../../../../models';
import { CamelCatalogService } from '../../../../../../models/visualization/flows';
import { getFirstCitrusCatalogMap } from '../../../../../../stubs/test-load-catalog';
import { EndpointModalProps, NewEndpointModal } from './NewEndpointModal';

describe('NewEndpointModal', () => {
  let endpointsSchema: KaotoSchemaDefinition['schema'];
  let defaultProps: EndpointModalProps;
  let mockOnConfirm: jest.Mock;
  let mockOnCancel: jest.Mock;
  let mockGetNewComponent: jest.Mock;

  beforeAll(async () => {
    const catalogsMap = await getFirstCitrusCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.TestEndpoint, catalogsMap.endpointsCatalogMap);

    const endpointsCatalog = catalogsMap.endpointsCatalogMap ?? {};
    const endpoints: KaotoSchemaDefinition['schema'][] = [];
    for (const endpointKey in endpointsCatalog) {
      const endpointDefinition = endpointsCatalog[endpointKey];
      const schema = endpointsCatalog[endpointKey].propertiesSchema as KaotoSchemaDefinition['schema'];
      if (schema) {
        schema.name = endpointKey;
        schema.title = endpointDefinition.title;
        endpoints.push(schema);
      }
    }

    const sortedEndpoints = [...endpoints];
    sortedEndpoints.sort((a, b) => a.name?.localeCompare(b.name));

    endpointsSchema = {
      oneOf: sortedEndpoints,
    };
  });

  beforeEach(() => {
    mockOnConfirm = jest.fn();
    mockOnCancel = jest.fn();
    mockGetNewComponent = jest.fn();

    defaultProps = {
      mode: 'Create',
      endpointsSchema,
      onConfirm: mockOnConfirm,
      onCancel: mockOnCancel,
    };
  });

  it('should render without crashing', async () => {
    mockGetNewComponent.mockResolvedValue({ name: 'http-client' });

    render(
      <CatalogModalContext.Provider value={{ getNewComponent: mockGetNewComponent, checkCompatibility: jest.fn() }}>
        <NewEndpointModal {...defaultProps} />
      </CatalogModalContext.Provider>,
      { wrapper: SuggestionRegistryProvider },
    );

    await waitFor(() => {
      expect(screen.getByTestId('NewEndpointModal')).toBeInTheDocument();
    });
  });

  it('should not render anything if there is no schema', () => {
    render(
      <CatalogModalContext.Provider value={{ getNewComponent: mockGetNewComponent, checkCompatibility: jest.fn() }}>
        <NewEndpointModal {...defaultProps} endpointsSchema={undefined} />
      </CatalogModalContext.Provider>,
      { wrapper: SuggestionRegistryProvider },
    );

    expect(screen.queryByTestId('NewEndpointModal')).not.toBeInTheDocument();
  });

  it('should display correct title for Create mode', async () => {
    mockGetNewComponent.mockResolvedValue({ name: 'http-client' });

    render(
      <CatalogModalContext.Provider value={{ getNewComponent: mockGetNewComponent, checkCompatibility: jest.fn() }}>
        <NewEndpointModal {...defaultProps} mode="Create" />
      </CatalogModalContext.Provider>,
      { wrapper: SuggestionRegistryProvider },
    );

    await waitFor(() => {
      expect(screen.getByText('Create endpoint')).toBeInTheDocument();
    });
  });

  it('should display correct title for Update mode', async () => {
    const endpoint = { name: 'testEndpoint' };
    mockGetNewComponent.mockResolvedValue({ name: 'http-client' });

    render(
      <CatalogModalContext.Provider value={{ getNewComponent: mockGetNewComponent, checkCompatibility: jest.fn() }}>
        <NewEndpointModal {...defaultProps} mode="Update" endpoint={endpoint} type="http-client" />
      </CatalogModalContext.Provider>,
      { wrapper: SuggestionRegistryProvider },
    );

    await waitFor(() => {
      expect(screen.getByText('Update endpoint')).toBeInTheDocument();
    });
  });

  it('should call onCancel when cancel button is clicked', async () => {
    mockGetNewComponent.mockResolvedValue({ name: 'http-client' });

    render(
      <CatalogModalContext.Provider value={{ getNewComponent: mockGetNewComponent, checkCompatibility: jest.fn() }}>
        <NewEndpointModal {...defaultProps} />
      </CatalogModalContext.Provider>,
      { wrapper: SuggestionRegistryProvider },
    );

    await waitFor(() => {
      expect(screen.getByTestId('endpoint-modal-cancel-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('endpoint-modal-cancel-btn'));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should call onConfirm when confirm button is clicked with valid data', async () => {
    const endpoint = { name: 'testEndpoint', url: 'http://localhost:8080' };
    mockGetNewComponent.mockResolvedValue({ name: 'http-client' });

    render(
      <CatalogModalContext.Provider value={{ getNewComponent: mockGetNewComponent, checkCompatibility: jest.fn() }}>
        <NewEndpointModal {...defaultProps} endpoint={endpoint} type="http-client" />
      </CatalogModalContext.Provider>,
      { wrapper: SuggestionRegistryProvider },
    );

    await waitFor(() => {
      expect(screen.getByTestId('endpoint-modal-confirm-btn')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('endpoint-modal-confirm-btn'));
    });

    expect(mockOnConfirm).toHaveBeenCalledWith('http-client', endpoint);
  });

  it('should disable confirm button when endpoint model is undefined', async () => {
    mockGetNewComponent.mockResolvedValue(undefined);

    render(
      <CatalogModalContext.Provider value={{ getNewComponent: mockGetNewComponent, checkCompatibility: jest.fn() }}>
        <NewEndpointModal {...defaultProps} />
      </CatalogModalContext.Provider>,
      { wrapper: SuggestionRegistryProvider },
    );

    await waitFor(() => {
      const confirmButton = screen.queryByTestId('endpoint-modal-confirm-btn');
      expect(confirmButton).toBeDisabled();
    });
  });

  it('should NOT call onConfirm when confirm button is clicked without endpoint type', async () => {
    mockGetNewComponent.mockResolvedValue(undefined);

    render(
      <CatalogModalContext.Provider value={{ getNewComponent: mockGetNewComponent, checkCompatibility: jest.fn() }}>
        <NewEndpointModal {...defaultProps} endpoint={{}} />
      </CatalogModalContext.Provider>,
      { wrapper: SuggestionRegistryProvider },
    );

    const confirmButton = screen.getByTestId('endpoint-modal-confirm-btn');
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('should open catalog modal to select endpoint type when endpoint is not provided', async () => {
    mockGetNewComponent.mockResolvedValue({ name: 'jms-queue' });

    render(
      <CatalogModalContext.Provider value={{ getNewComponent: mockGetNewComponent, checkCompatibility: jest.fn() }}>
        <NewEndpointModal {...defaultProps} />
      </CatalogModalContext.Provider>,
      { wrapper: SuggestionRegistryProvider },
    );

    await waitFor(() => {
      expect(mockGetNewComponent).toHaveBeenCalled();
    });

    // Verify the filter function passed to getNewComponent
    const filterFunction = mockGetNewComponent.mock.calls[0][0];
    expect(filterFunction({ type: CatalogKind.TestEndpoint })).toBe(true);
    expect(filterFunction({ type: CatalogKind.Component })).toBe(false);
  });

  it('should handle endpoint with simple properties', async () => {
    const endpoint = {
      name: 'testEndpoint',
      url: 'http://localhost:8080',
    };
    mockGetNewComponent.mockResolvedValue({ name: 'http-client' });

    render(
      <CatalogModalContext.Provider value={{ getNewComponent: mockGetNewComponent, checkCompatibility: jest.fn() }}>
        <NewEndpointModal {...defaultProps} endpoint={endpoint} type="http-client" />
      </CatalogModalContext.Provider>,
      { wrapper: SuggestionRegistryProvider },
    );

    await waitFor(() => {
      expect(screen.getByTestId('endpoint-modal-confirm-btn')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('endpoint-modal-confirm-btn'));
    });

    expect(mockOnConfirm).toHaveBeenCalledWith(
      'http-client',
      expect.objectContaining({
        name: 'testEndpoint',
        url: 'http://localhost:8080',
      }),
    );
  });

  it('should show description text', async () => {
    mockGetNewComponent.mockResolvedValue({ name: 'http-client' });

    render(
      <CatalogModalContext.Provider value={{ getNewComponent: mockGetNewComponent, checkCompatibility: jest.fn() }}>
        <NewEndpointModal {...defaultProps} />
      </CatalogModalContext.Provider>,
      { wrapper: SuggestionRegistryProvider },
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          'Send and receive test actions may reference this endpoint by its name when sending and receiving messages during the test.',
        ),
      ).toBeInTheDocument();
    });
  });

  it('should use provided endpoint and type when both are given', async () => {
    const endpoint = { name: 'existingEndpoint', url: 'http://test.com' };

    render(
      <CatalogModalContext.Provider value={{ getNewComponent: mockGetNewComponent, checkCompatibility: jest.fn() }}>
        <NewEndpointModal {...defaultProps} endpoint={endpoint} type="http-client" />
      </CatalogModalContext.Provider>,
      { wrapper: SuggestionRegistryProvider },
    );

    await waitFor(() => {
      expect(screen.getByTestId('NewEndpointModal')).toBeInTheDocument();
    });

    // Should not call getNewComponent when endpoint and type are provided
    expect(mockGetNewComponent).not.toHaveBeenCalled();
  });
});
