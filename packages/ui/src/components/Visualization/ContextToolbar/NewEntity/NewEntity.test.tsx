import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { CamelCatalogService, CatalogKind, KaotoSchemaDefinition } from '../../../../models';
import { CamelRouteResource, SerializerType, SourceSchemaType, sourceSchemaConfig } from '../../../../models/camel';
import { TestProvidersWrapper } from '../../../../stubs';
import { camelRouteJson } from '../../../../stubs/camel-route';
import { getFirstCatalogMap } from '../../../../stubs/test-load-catalog';
import { NewEntity } from './NewEntity';

const config = sourceSchemaConfig;
config.config[SourceSchemaType.Pipe].schema = {
  name: 'Pipe',
  schema: { name: 'Pipe', description: 'desc' } as KaotoSchemaDefinition['schema'],
} as KaotoSchemaDefinition;
config.config[SourceSchemaType.Kamelet].schema = {
  name: 'Kamelet',
  schema: { name: 'Kamelet', description: 'desc' } as KaotoSchemaDefinition['schema'],
} as KaotoSchemaDefinition;
config.config[SourceSchemaType.Route].schema = {
  name: 'route',
  schema: { name: 'route', description: 'desc' } as KaotoSchemaDefinition['schema'],
} as KaotoSchemaDefinition;

describe('NewEntity', () => {
  beforeEach(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Entity, catalogsMap.entitiesCatalog);
  });

  it('component renders', () => {
    const { Provider } = TestProvidersWrapper();
    const wrapper = render(
      <Provider>
        <NewEntity />
      </Provider>,
    );

    const toggle = wrapper.queryByTestId('new-entity-list-dropdown');
    expect(toggle).toBeInTheDocument();
  });

  it('should call `updateEntitiesFromCamelResource` when selecting an item', async () => {
    const { Provider, updateEntitiesFromCamelResourceSpy } = TestProvidersWrapper();
    const wrapper = render(
      <Provider>
        <NewEntity />
      </Provider>,
    );

    /** Click on toggle */
    const toggle = await wrapper.findByTestId('new-entity-list-dropdown');
    act(() => {
      fireEvent.click(toggle);
    });

    /** Click on first element */
    const element = await wrapper.findAllByRole('menuitem');
    act(() => {
      fireEvent.click(element[0]);
    });

    await waitFor(async () => {
      expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalled();
    });
  });

  it('should toggle list of DSLs', async () => {
    const { Provider } = TestProvidersWrapper();
    const wrapper = render(
      <Provider>
        <NewEntity />
      </Provider>,
    );

    const toggle = await wrapper.findByTestId('new-entity-list-dropdown');

    /** Click on toggle */
    act(() => {
      fireEvent.click(toggle);
    });

    const element = await wrapper.findByText('Route');
    expect(element).toBeInTheDocument();

    /** Close Select */
    act(() => {
      fireEvent.click(toggle);
    });

    await waitFor(async () => {
      expect(element).not.toBeInTheDocument();
    });
  });

  it('should close Select when pressing ESC', async () => {
    const { Provider } = TestProvidersWrapper();
    const wrapper = render(
      <Provider>
        <NewEntity />
      </Provider>,
    );

    const toggle = await wrapper.findByTestId('new-entity-list-dropdown');

    /** Open Select */
    act(() => {
      fireEvent.click(toggle);
    });

    const menu = await wrapper.findByRole('menu');

    expect(menu).toBeInTheDocument();

    /** Press Escape key to close the menu */
    act(() => {
      fireEvent.focus(menu);
      fireEvent.keyDown(menu, { key: 'Escape', code: 'Escape', charCode: 27 });
    });

    await waitFor(async () => {
      /** The close panel is an async process */
      expect(menu).not.toBeInTheDocument();
    });
  });

  describe('YAML-only entity filtering', () => {
    it('should show all entities including YAML-only ones for YAML serializer', async () => {
      const { Provider, camelResource } = TestProvidersWrapper();
      camelResource.setSerializer(SerializerType.YAML);

      const wrapper = render(
        <Provider>
          <NewEntity />
        </Provider>,
      );

      const toggle = await wrapper.findByTestId('new-entity-list-dropdown');

      /** Click on toggle */
      act(() => {
        fireEvent.click(toggle);
      });

      // Should see Configuration submenu with YAML-only entities
      const configurationMenu = await wrapper.findByText('Configuration');
      expect(configurationMenu).toBeInTheDocument();

      // Should see Error Handling submenu with YAML-only entities
      const errorHandlingMenu = await wrapper.findByText('Error Handling');
      expect(errorHandlingMenu).toBeInTheDocument();

      // With YAML serializer, we should have access to YAML-only entities
      // This tests the filtering logic without complex DOM interactions
      const entityList = camelResource.getCanvasEntityList();
      expect(entityList.groups['Configuration']).toBeDefined();
      expect(entityList.groups['Error Handling']).toBeDefined();
      expect(entityList.groups['Configuration']).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'intercept' }),
          expect.objectContaining({ name: 'interceptFrom' }),
          expect.objectContaining({ name: 'onCompletion' }),
        ]),
      );
    });

    it('should filter out YAML-only entities for XML serializer', async () => {
      const { Provider, camelResource } = TestProvidersWrapper();
      camelResource.setSerializer(SerializerType.XML);

      const wrapper = render(
        <Provider>
          <NewEntity />
        </Provider>,
      );

      const toggle = await wrapper.findByTestId('new-entity-list-dropdown');

      /** Click on toggle */
      act(() => {
        fireEvent.click(toggle);
      });

      // Should still see Configuration submenu but with fewer items
      const configurationMenu = await wrapper.findByText('Configuration');
      expect(configurationMenu).toBeInTheDocument();

      // Should NOT see Error Handling submenu since YAML-only entities are filtered
      await waitFor(async () => {
        expect(wrapper.queryByText('Error Handling')).not.toBeInTheDocument();
      });

      // With XML serializer, we should NOT have access to YAML-only entities
      const entityList = camelResource.getCanvasEntityList();
      expect(entityList.groups['Configuration']).toBeDefined();
      expect(entityList.groups['Error Handling']).not.toBeDefined();

      // Configuration group should only have non-YAML-only entities
      const configurationEntities = entityList.groups['Configuration'];
      const entityNames = configurationEntities.map((e) => e.name);
      expect(entityNames).toContain('routeConfiguration');
      expect(entityNames).not.toContain('intercept');
      expect(entityNames).not.toContain('interceptFrom');
      expect(entityNames).not.toContain('onCompletion');
    });
  });

  describe('entity grouping', () => {
    it('should display entities in proper groups', async () => {
      const { Provider } = TestProvidersWrapper();

      const wrapper = render(
        <Provider>
          <NewEntity />
        </Provider>,
      );

      const toggle = await wrapper.findByTestId('new-entity-list-dropdown');

      /** Click on toggle */
      act(() => {
        fireEvent.click(toggle);
      });

      // Should see Route as a common (non-grouped) entity
      const routeMenuItem = await wrapper.findByText('Route');
      expect(routeMenuItem).toBeInTheDocument();

      // Should see grouped entities
      expect(wrapper.queryByText('Configuration')).toBeInTheDocument();
      expect(wrapper.queryByText('Rest')).toBeInTheDocument();
    });

    it('should allow selecting entities from submenus', async () => {
      const { Provider, updateEntitiesFromCamelResourceSpy } = TestProvidersWrapper();

      const wrapper = render(
        <Provider>
          <NewEntity />
        </Provider>,
      );

      const toggle = await wrapper.findByTestId('new-entity-list-dropdown');

      /** Click on toggle */
      act(() => {
        fireEvent.click(toggle);
      });

      const configurationMenu = await wrapper.findByText('Configuration');
      const menuItem = configurationMenu.closest('[role="menuitem"]');

      // Hover over Configuration to open submenu
      if (menuItem) {
        act(() => {
          fireEvent.mouseEnter(menuItem);
        });

        // Click on RouteConfiguration in submenu
        const routeConfigItem = await wrapper.findByText('RouteConfiguration');
        act(() => {
          fireEvent.click(routeConfigItem);
        });

        await waitFor(async () => {
          expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalled();
        });
      }
    });

    it('should handle empty groups gracefully', async () => {
      const mockResource = new CamelRouteResource([camelRouteJson]);

      // Mock empty groups scenario
      const originalGetCanvasEntityList = mockResource.getCanvasEntityList;
      mockResource.getCanvasEntityList = jest.fn().mockReturnValue({
        common: [{ name: 'route', title: 'Route', description: 'Route description' }],
        groups: {},
      });

      const { Provider } = TestProvidersWrapper({ camelResource: mockResource });

      const wrapper = render(
        <Provider>
          <NewEntity />
        </Provider>,
      );

      const toggle = await wrapper.findByTestId('new-entity-list-dropdown');

      /** Click on toggle */
      act(() => {
        fireEvent.click(toggle);
      });

      // Should still render the common entities
      const routeMenuItem = await wrapper.findByText('Route');
      expect(routeMenuItem).toBeInTheDocument();

      // Should not crash with empty groups
      expect(wrapper.container).toBeInTheDocument();

      // Restore original method
      mockResource.getCanvasEntityList = originalGetCanvasEntityList;
    });
  });
});
