import { CatalogLibrary, CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { act, fireEvent, render } from '@testing-library/react';

import { KaotoSchemaDefinition } from '../../../../models';
import { CamelRouteResource, sourceSchemaConfig, SourceSchemaType } from '../../../../models/camel';
import { CamelRouteVisualEntity } from '../../../../models/visualization/flows';
import { VisibleFlowsProvider } from '../../../../providers';
import { EntitiesContext, EntitiesContextResult } from '../../../../providers/entities.provider';
import { IRuntimeContext, RuntimeContext } from '../../../../providers/runtime.provider';
import { SourceCodeApiContext } from '../../../../providers/source-code.provider';
import { NewFlow } from './NewFlow';

describe('NewFlow.tsx', () => {
  const config = sourceSchemaConfig;
  config.config[SourceSchemaType.Integration].schema = {
    schema: { name: 'Integration', description: 'desc' } as KaotoSchemaDefinition['schema'],
  } as KaotoSchemaDefinition;
  config.config[SourceSchemaType.Pipe].schema = {
    schema: { name: 'Pipe', description: 'desc' } as KaotoSchemaDefinition['schema'],
  } as KaotoSchemaDefinition;
  config.config[SourceSchemaType.Kamelet].schema = {
    schema: { name: 'Kamelet', description: 'desc' } as KaotoSchemaDefinition['schema'],
  } as KaotoSchemaDefinition;
  config.config[SourceSchemaType.KameletBinding].schema = {
    name: 'kameletBinding',
    schema: { description: 'desc' },
  } as KaotoSchemaDefinition;
  config.config[SourceSchemaType.Route].schema = {
    schema: { name: 'route', description: 'desc' } as KaotoSchemaDefinition['schema'],
  } as KaotoSchemaDefinition;
  config.config[SourceSchemaType.Test].schema = {
    schema: { name: 'Test', description: 'desc' } as KaotoSchemaDefinition['schema'],
  } as KaotoSchemaDefinition;

  const mockCamelCatalog: CatalogLibraryEntry = {
    name: 'Camel Main',
    runtime: 'Main',
    version: '4.0.0',
    fileName: 'camel-catalog-4.0.0.json',
  } as CatalogLibraryEntry;

  const mockCitrusCatalog: CatalogLibraryEntry = {
    name: 'Citrus',
    runtime: 'Citrus',
    version: '4.0.0',
    fileName: 'citrus-catalog-4.0.0.json',
  } as CatalogLibraryEntry;

  const mockCatalogLibrary: CatalogLibrary = {
    definitions: [mockCamelCatalog, mockCitrusCatalog],
  } as CatalogLibrary;

  const renderWithContext = (
    runtimeContextValue?: Partial<IRuntimeContext>,
    sourceSchemaType: SourceSchemaType = SourceSchemaType.Integration,
  ) => {
    const mockSetSelectedCatalog = jest.fn();
    const defaultRuntimeContext: IRuntimeContext = {
      basePath: '',
      selectedCatalog: mockCamelCatalog,
      catalogLibrary: mockCatalogLibrary,
      setSelectedCatalog: mockSetSelectedCatalog,
    };

    const mergedRuntimeContext = { ...defaultRuntimeContext, ...runtimeContextValue };

    return {
      ...render(
        <RuntimeContext.Provider value={mergedRuntimeContext}>
          <SourceCodeApiContext.Provider
            value={{
              setCodeAndNotify: jest.fn(),
            }}
          >
            <EntitiesContext.Provider
              value={
                {
                  currentSchemaType: sourceSchemaType,
                  visualEntities: visualEntities,
                  camelResource: new CamelRouteResource(),
                } as unknown as EntitiesContextResult
              }
            >
              <VisibleFlowsProvider>
                <NewFlow />
              </VisibleFlowsProvider>
            </EntitiesContext.Provider>
          </SourceCodeApiContext.Provider>
        </RuntimeContext.Provider>,
      ),
      mockSetSelectedCatalog,
    };
  };

  const visualEntities = [{ id: 'entity1' } as CamelRouteVisualEntity, { id: 'entity2' } as CamelRouteVisualEntity];

  it('should render all of the types', async () => {
    const wrapper = renderWithContext();
    const trigger = await wrapper.findByTestId('viz-dsl-list-dropdown');

    /** Open Select */
    act(() => {
      fireEvent.click(trigger);
    });

    for (const name of ['Pipe', 'Camel Route']) {
      const element = await wrapper.findByText(name);
      expect(element).toBeInTheDocument();
    }
  });

  it('should warn the user when adding a different type of flow', async () => {
    const wrapper = renderWithContext();
    const trigger = await wrapper.findByTestId('viz-dsl-list-dropdown');

    /** Open Select */
    act(() => {
      fireEvent.click(trigger);
    });

    /** Select an option */
    act(() => {
      const element = wrapper.getByText('Pipe');
      fireEvent.click(element);
    });

    const modal = await wrapper.findByTestId('confirmation-modal');
    expect(modal).toBeInTheDocument();
  });

  it('should update catalog when switching to Citrus test', async () => {
    const mockSetSelectedCatalog = jest.fn();
    const { findByTestId, getByText } = renderWithContext(
      {
        selectedCatalog: mockCamelCatalog,
        catalogLibrary: mockCatalogLibrary,
        setSelectedCatalog: mockSetSelectedCatalog,
      },
      SourceSchemaType.Route,
    );

    const trigger = await findByTestId('viz-dsl-list-dropdown');

    /** Open Select */
    act(() => {
      fireEvent.click(trigger);
    });

    /** Select Citrus Test option */
    act(() => {
      const element = getByText('Test');
      fireEvent.click(element);
    });

    /** Confirm the modal */
    const confirmButton = await findByTestId('confirmation-modal-confirm');
    act(() => {
      fireEvent.click(confirmButton);
    });

    /** Verify catalog was updated to Citrus */
    expect(mockSetSelectedCatalog).toHaveBeenCalledWith(mockCitrusCatalog);
  });

  it('should not update catalog when switching between Camel flow types', async () => {
    const mockSetSelectedCatalog = jest.fn();
    const { findByTestId, getByText } = renderWithContext(
      {
        selectedCatalog: mockCamelCatalog,
        catalogLibrary: mockCatalogLibrary,
        setSelectedCatalog: mockSetSelectedCatalog,
      },
      SourceSchemaType.Route,
    );

    const trigger = await findByTestId('viz-dsl-list-dropdown');

    /** Open Select */
    act(() => {
      fireEvent.click(trigger);
    });

    /** Select Pipe option (another Camel type) */
    act(() => {
      const element = getByText('Pipe');
      fireEvent.click(element);
    });

    /** Confirm the modal */
    const confirmButton = await findByTestId('confirmation-modal-confirm');
    act(() => {
      fireEvent.click(confirmButton);
    });

    /** Verify catalog was NOT updated since both are Camel types */
    expect(mockSetSelectedCatalog).not.toHaveBeenCalled();
  });
});
