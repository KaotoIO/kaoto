import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import {
  FormComponentFactoryProvider,
  ModelContextProvider,
  SchemaDefinitionsProvider,
  SchemaProvider,
} from '@kaoto/forms';
import { KaotoFormPageObject } from '@kaoto/forms/testing';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { DynamicCatalog } from '../../../../../../dynamic-catalog/dynamic-catalog';
import { DynamicCatalogRegistry } from '../../../../../../dynamic-catalog/dynamic-catalog-registry';
import { CamelLanguageProvider } from '../../../../../../dynamic-catalog/providers/camel-components.provider';
import { CatalogKind } from '../../../../../../models';
import { setHeaderExpressionSchema } from '../../../../../../stubs/expression-definition-schema';
import { getFirstCatalogMap } from '../../../../../../stubs/test-load-catalog';
import { ROOT_PATH } from '../../../../../../utils';
import { ExpressionService } from './expression.service';
import { ExpressionField } from './ExpressionField';

/**
 * Renders the component inside `await act(async () => ...)` so that the
 * microtask queue drains and the internal <Suspense> boundary (wrapping the
 * `use(promise)` call for language names) resolves before the first assertion.
 * Plain `render()` uses a synchronous act internally and exits before the
 * already-settled promise microtask fires, leaving the component suspended.
 * The eslint rule cannot detect Suspense inside the tree, so we suppress it.
 */
// eslint-disable-next-line testing-library/no-unnecessary-act
const renderWithSuspense = async (ui: React.ReactElement) => act(async () => render(ui));

describe('ExpressionField', () => {
  beforeEach(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    DynamicCatalogRegistry.get().setCatalog(
      CatalogKind.Language,
      new DynamicCatalog(new CamelLanguageProvider(catalogsMap.languageCatalog)),
    );
  });

  afterEach(() => {
    DynamicCatalogRegistry.get().clearRegistry();
  });

  it('renders empty expression field with schema', async () => {
    const { container } = await renderWithSuspense(
      <ModelContextProvider model={{ id: 'setHeader-1361' }} onPropertyChange={vi.fn()}>
        <SchemaProvider schema={setHeaderExpressionSchema}>
          <ExpressionField propName={ROOT_PATH} required />
        </SchemaProvider>
      </ModelContextProvider>,
    );

    await waitFor(() => {
      expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument();
    });

    expect(container).toMatchSnapshot();
  });

  it('renders expression field with selection', async () => {
    const { container } = await renderWithSuspense(
      <FormComponentFactoryProvider>
        <ModelContextProvider
          model={{
            id: 'setHeader-1891',
            expression: {
              simple: {},
            },
          }}
          onPropertyChange={vi.fn()}
        >
          <SchemaDefinitionsProvider schema={setHeaderExpressionSchema} omitFields={[]}>
            <SchemaProvider schema={setHeaderExpressionSchema}>
              <ExpressionField propName={ROOT_PATH} required />
            </SchemaProvider>
          </SchemaDefinitionsProvider>
        </ModelContextProvider>
      </FormComponentFactoryProvider>,
    );

    await waitFor(() => {
      expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument();
    });

    expect(container).toMatchSnapshot();
  });

  it('should be able to change the selection', async () => {
    await renderWithSuspense(
      <FormComponentFactoryProvider>
        <ModelContextProvider
          model={{
            id: 'setHeader-1891',
            expression: {
              simple: {},
            },
          }}
          onPropertyChange={vi.fn()}
        >
          <SchemaDefinitionsProvider schema={setHeaderExpressionSchema} omitFields={[]}>
            <SchemaProvider schema={setHeaderExpressionSchema}>
              <ExpressionField propName={ROOT_PATH} required />
            </SchemaProvider>
          </SchemaDefinitionsProvider>
        </ModelContextProvider>
      </FormComponentFactoryProvider>,
    );

    const formPageObject = new KaotoFormPageObject(screen, act);
    await screen.findByTestId(`${ROOT_PATH}__expression-list-typeahead-select-input`);
    await formPageObject.toggleExpressionFieldForProperty(ROOT_PATH);
    await formPageObject.selectTypeaheadItem('constant');

    const expressionField = formPageObject.getFieldByDisplayName('Expression');
    expect(expressionField).toBeInTheDocument();
  });

  it('onExpressionChange should handle empty string values', async () => {
    const onPropertyChangeSpy = vi.fn();
    const EXPRESSION_STRING = 'Test';

    await renderWithSuspense(
      <FormComponentFactoryProvider>
        <ModelContextProvider
          model={{
            id: 'setHeader-1891',
            expression: {
              simple: {
                expression: EXPRESSION_STRING,
              },
            },
          }}
          onPropertyChange={onPropertyChangeSpy}
        >
          <SchemaDefinitionsProvider schema={setHeaderExpressionSchema} omitFields={[]}>
            <SchemaProvider schema={setHeaderExpressionSchema}>
              <ExpressionField propName={ROOT_PATH} required />
            </SchemaProvider>
          </SchemaDefinitionsProvider>
        </ModelContextProvider>
      </FormComponentFactoryProvider>,
    );

    const formPageObject = new KaotoFormPageObject(screen, act);
    await waitFor(() => formPageObject.getFieldByDisplayName('Expression'));
    await formPageObject.inputText('Expression', '');

    expect(onPropertyChangeSpy).toHaveBeenCalled();
    const lastCall = onPropertyChangeSpy.mock.calls[onPropertyChangeSpy.mock.calls.length - 1];
    expect(lastCall[1].simple.expression).toBeUndefined();
  });

  it('should call onPropertyChange with the preserved expression after selection change', async () => {
    const onPropertyChangeSpy = vi.fn();
    const EXPRESSION_STRING = 'Test';

    await renderWithSuspense(
      <FormComponentFactoryProvider>
        <ModelContextProvider
          model={{
            id: 'setHeader-1891',
            expression: {
              simple: {
                expression: EXPRESSION_STRING,
              },
            },
          }}
          onPropertyChange={onPropertyChangeSpy}
        >
          <SchemaDefinitionsProvider schema={setHeaderExpressionSchema} omitFields={[]}>
            <SchemaProvider schema={setHeaderExpressionSchema}>
              <ExpressionField propName={ROOT_PATH} required />
            </SchemaProvider>
          </SchemaDefinitionsProvider>
        </ModelContextProvider>
      </FormComponentFactoryProvider>,
    );

    const formPageObject = new KaotoFormPageObject(screen, act);
    await screen.findByTestId(`${ROOT_PATH}__expression-list-typeahead-select-input`);
    await formPageObject.toggleExpressionFieldForProperty(ROOT_PATH);
    await formPageObject.selectTypeaheadItem('constant');

    expect(onPropertyChangeSpy).toHaveBeenCalled();
    const lastCall = onPropertyChangeSpy.mock.calls[onPropertyChangeSpy.mock.calls.length - 1];
    expect(lastCall[1].constant.expression).toBe(EXPRESSION_STRING);
  });

  it('should clear the expression when using the clear button', async () => {
    const onPropertyChangeSpy = vi.fn();

    await renderWithSuspense(
      <ModelContextProvider
        model={{
          id: 'setHeader-1891',
          expression: {
            simple: {},
          },
        }}
        onPropertyChange={onPropertyChangeSpy}
      >
        <SchemaProvider schema={setHeaderExpressionSchema}>
          <ExpressionField propName={ROOT_PATH} required />
        </SchemaProvider>
      </ModelContextProvider>,
    );

    const clearButton = await screen.findByTestId(`#__expression-list__clear`);
    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      fireEvent.click(clearButton);
    });

    expect(onPropertyChangeSpy).toHaveBeenCalledTimes(1);
    expect(onPropertyChangeSpy).toHaveBeenCalledWith(ROOT_PATH, { id: 'setHeader-1891' });
  });

  it('should update the model with `undefined` when the model is empty after clearing the expression', async () => {
    const onPropertyChangeSpy = vi.fn();

    const { findByTestId } = await renderWithSuspense(
      <ModelContextProvider
        model={{
          expression: {
            simple: {},
          },
        }}
        onPropertyChange={onPropertyChangeSpy}
      >
        <SchemaProvider schema={setHeaderExpressionSchema}>
          <ExpressionField propName={ROOT_PATH} required />
        </SchemaProvider>
      </ModelContextProvider>,
    );

    const clearButton = await findByTestId(`#__expression-list__clear`);

    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      fireEvent.click(clearButton);
    });

    expect(onPropertyChangeSpy).toHaveBeenCalledTimes(1);
    expect(onPropertyChangeSpy).toHaveBeenCalledWith(ROOT_PATH, undefined);
  });

  it('should show the error boundary fallback when getLanguageNames rejects', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(ExpressionService, 'getLanguageNames').mockRejectedValue(new Error('catalog unavailable'));

    await renderWithSuspense(
      <ModelContextProvider model={{ id: 'setHeader-1361' }} onPropertyChange={vi.fn()}>
        <SchemaProvider schema={setHeaderExpressionSchema}>
          <ExpressionField propName={ROOT_PATH} required />
        </SchemaProvider>
      </ModelContextProvider>,
    );

    expect(await screen.findByText('Expression editor is unavailable')).toBeInTheDocument();
    const expandableButton = await screen.findByLabelText('Show more');
    expect(expandableButton).toBeInTheDocument();

    fireEvent.click(expandableButton);
    expect(await screen.findByText('catalog unavailable')).toBeInTheDocument();

    vi.restoreAllMocks();
  });
});
