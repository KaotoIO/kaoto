import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { BeanFactory, CatalogLibrary } from '@kaoto/camel-catalog/types';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { CamelRouteResource } from '../../models/camel/camel-route-resource';
import { BeansEntityHandler } from '../../models/visualization/metadata/beans-entity-handler';
import { EntitiesContext, EntitiesContextResult, EntitiesProvider } from '../../providers/entities.provider';
import { KaotoResourceContext } from '../../providers/kaoto-resource.provider';
import { TestProvidersWrapper } from '../../stubs';
import { createMockEntitiesContext } from '../../stubs/create-mock-entities-context';
import { getFirstCatalogMap, setupDynamicCatalogRegistry } from '../../stubs/test-load-catalog';
import { BeansPage } from './BeansPage';

describe('BeansPage', () => {
  beforeAll(async () => {
    setupDynamicCatalogRegistry(await getFirstCatalogMap(catalogLibrary as CatalogLibrary));
  });

  const createContext = (beans: BeanFactory[]) => createMockEntitiesContext(new CamelRouteResource([{ beans }]));
  const view = (context: EntitiesContextResult | null) => (
    <EntitiesContext.Provider value={context}>
      <BeansPage />
    </EntitiesContext.Provider>
  );

  it.each([false, true])(
    'keeps bean details visible and current after source edits (created locally: %s)',
    async (createdLocally) => {
      const bean = { name: 'myBean', type: 'org.example.MyBean', properties: { message: 'before' } };
      const original = await createContext(createdLocally ? [] : [bean]);
      const updated = await createContext([{ ...bean, properties: { message: 'after' } }]);
      const { Provider } = await TestProvidersWrapper();
      // Resolve the catalog before observing a synchronous source refresh.
      // eslint-disable-next-line testing-library/no-unnecessary-act
      const { rerender } = await act(async () => render(view(original), { wrapper: Provider }));

      if (createdLocally) {
        fireEvent.click(screen.getAllByTestId('metadata-add-Beans-btn')[0]);
        fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: bean.name } });
        fireEvent.change(screen.getByRole('textbox', { name: 'Type' }), { target: { value: bean.type } });
        fireEvent.click(screen.getByTestId('#.properties__add'));
        fireEvent.change(screen.getByPlaceholderText('Write a key'), { target: { value: 'message' } });
        fireEvent.change(screen.getByPlaceholderText('Write a value'), { target: { value: 'before' } });
      } else {
        fireEvent.click(screen.getByTestId('metadata-row-0'));
      }
      const input = screen.getByDisplayValue('before');
      input.focus();

      rerender(view(updated));

      expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument();
      expect(input).toBeVisible();
      expect(input).toHaveFocus();
      expect(input).toHaveValue('after');
      expect(screen.getByRole('textbox', { name: 'Name' })).toBeEnabled();
      expect(updated.updateSourceCodeFromEntities).not.toHaveBeenCalled();
      fireEvent.change(input, { target: { value: 'edited' } });
      await waitFor(() => {
        expect(new BeansEntityHandler(updated.camelResource).getBeansModel()).toMatchObject([
          { name: 'myBean', properties: { message: 'edited' } },
        ]);
      });
      expect(new BeansEntityHandler(original.camelResource).getBeansModel()).toMatchObject([
        { name: 'myBean', properties: { message: 'before' } },
      ]);
      expect(updated.updateSourceCodeFromEntities).toHaveBeenCalledTimes(1);
    },
  );

  it('loads the bean form when a supported resource becomes available', async () => {
    const { Provider } = await TestProvidersWrapper();
    const { rerender } = render(view(null), { wrapper: Provider });
    expect(screen.getByText('Not applicable')).toBeInTheDocument();
    const context = await createContext([{ name: 'myBean', type: 'org.example.MyBean' }]);

    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      rerender(view(context));
    });

    fireEvent.click(screen.getByTestId('metadata-row-0'));
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('myBean');
  });

  it('retains the current bean while a source replacement is initializing', async () => {
    const bean = { name: 'myBean', type: 'org.example.MyBean', properties: { message: 'before' } };
    const original = new CamelRouteResource([{ beans: [bean] }]);
    const updated = new CamelRouteResource([{ beans: [{ ...bean, properties: { message: 'after' } }] }]);
    let finishInitialization!: () => void;
    const pending = new Promise<void>((resolve) => {
      finishInitialization = resolve;
    });
    const initialize = updated.initialize.bind(updated);
    vi.spyOn(updated, 'initialize').mockImplementation(async () => {
      await pending;
      await initialize();
    });
    const { Provider } = await TestProvidersWrapper();
    const page = (resource: CamelRouteResource) => (
      <KaotoResourceContext.Provider value={{ kaotoResource: resource }}>
        <EntitiesProvider>
          <BeansPage />
        </EntitiesProvider>
      </KaotoResourceContext.Provider>
    );
    // eslint-disable-next-line testing-library/no-unnecessary-act
    const { rerender } = await act(async () => render(page(original), { wrapper: Provider }));
    fireEvent.click(screen.getByTestId('metadata-row-0'));
    const input = screen.getByDisplayValue('before');

    rerender(page(updated));

    expect(input).toBeVisible();
    expect(input).toHaveValue('before');
    // Inert protects all controls without changing their appearance during source refreshes.
    expect(input.closest('[inert]')).not.toBeNull();
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeEnabled();
    expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument();
    await act(async () => {
      finishInitialization();
    });
    expect(screen.getByDisplayValue('after')).toBe(input);

    expect(input.closest('[inert]')).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeEnabled();
  });
});
