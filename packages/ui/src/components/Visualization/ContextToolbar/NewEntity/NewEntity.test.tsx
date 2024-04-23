import * as catalogIndex from '@kaoto/camel-catalog/index.json';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { CamelCatalogService, CatalogKind, ICamelProcessorDefinition, KaotoSchemaDefinition } from '../../../../models';
import { SourceSchemaType, sourceSchemaConfig } from '../../../../models/camel';
import { TestProvidersWrapper } from '../../../../stubs';
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
    const entitiesCatalog = await import('@kaoto/camel-catalog/' + catalogIndex.catalogs.entities.file);
    /* eslint-disable  @typescript-eslint/no-explicit-any */
    delete (entitiesCatalog as any).default;
    CamelCatalogService.setCatalogKey(
      CatalogKind.Entity,
      entitiesCatalog as unknown as Record<string, ICamelProcessorDefinition>,
    );
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
});
