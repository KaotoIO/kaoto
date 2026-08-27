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
import { CamelCatalogService, CatalogKind } from '../../../../../../models';
import { setHeaderExpressionSchema } from '../../../../../../stubs/expression-definition-schema';
import { getFirstCatalogMap } from '../../../../../../stubs/test-load-catalog';
import { ROOT_PATH } from '../../../../../../utils';
import { ExpressionService } from './expression.service';
import { ExpressionField } from './ExpressionField';

describe('ExpressionField', () => {
  beforeEach(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Language, catalogsMap.languageCatalog);
    DynamicCatalogRegistry.get().setCatalog(
      CatalogKind.Language,
      new DynamicCatalog(new CamelLanguageProvider(catalogsMap.languageCatalog)),
    );
  });

  afterEach(() => {
    DynamicCatalogRegistry.get().clearRegistry();
  });

  it('renders empty expression field with schema', async () => {
    const { container } = render(
      <ModelContextProvider model={{ id: 'setHeader-1361' }} onPropertyChange={vi.fn()}>
        <SchemaProvider schema={setHeaderExpressionSchema}>
          <ExpressionField propName={ROOT_PATH} required />
        </SchemaProvider>
      </ModelContextProvider>,
    );

    // Wait for the async parseExpressionModel effect to resolve
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });

    expect(container).toMatchSnapshot();
  });

  it('renders expression field with selection', async () => {
    const { container } = render(
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

    // Wait for the async parseExpressionModel effect to resolve
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });

    expect(container).toMatchSnapshot();
  });

  it('should be able to change the selection', async () => {
    render(
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
    // Wait for the async parseExpressionModel effect to populate the expression field
    await screen.findByTestId(`${ROOT_PATH}__expression-list-typeahead-select-input`);
    await formPageObject.toggleExpressionFieldForProperty(ROOT_PATH);
    await formPageObject.selectTypeaheadItem('csimple');

    const expressionField = formPageObject.getFieldByDisplayName('Expression');
    expect(expressionField).toBeInTheDocument();
  });

  it('onExpressionChange should handle empty string values', async () => {
    const onPropertyChangeSpy = vi.fn();
    const EXPRESSION_STRING = 'Test';

    render(
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
    // Wait for the async parseExpressionModel effect to populate the expression field
    await waitFor(() => formPageObject.getFieldByDisplayName('Expression'));
    await formPageObject.inputText('Expression', '');

    expect(onPropertyChangeSpy).toHaveBeenCalled();
    const lastCall = onPropertyChangeSpy.mock.calls[onPropertyChangeSpy.mock.calls.length - 1];
    expect(lastCall[1].simple.expression).toBeUndefined();
  });

  it('should set an intentionally empty expression when the Empty checkbox is checked', async () => {
    const onPropertyChangeSpy = vi.fn();

    render(
      <FormComponentFactoryProvider>
        <ModelContextProvider
          model={{
            id: 'setHeader-1891',
            expression: {
              csimple: {},
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

    await screen.findByTestId(`${ROOT_PATH}__expression-list-typeahead-select-input`);
    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      fireEvent.click(screen.getByTestId(`${ROOT_PATH}__expression-empty-checkbox`));
    });

    expect(onPropertyChangeSpy).toHaveBeenCalled();
    const lastCall = onPropertyChangeSpy.mock.calls[onPropertyChangeSpy.mock.calls.length - 1];
    expect(lastCall[1].csimple.expression).toBe('');
    expect(screen.getByLabelText(/^Expression/)).toBeDisabled();
  });

  it('should derive the Empty checkbox state from the model and restore editing when unchecked', async () => {
    const onPropertyChangeSpy = vi.fn();

    render(
      <FormComponentFactoryProvider>
        <ModelContextProvider
          model={{
            id: 'setHeader-1891',
            expression: {
              csimple: {
                expression: '',
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

    await screen.findByTestId(`${ROOT_PATH}__expression-list-typeahead-select-input`);
    const emptyCheckbox = screen.getByTestId(`${ROOT_PATH}__expression-empty-checkbox`) as HTMLInputElement;
    expect(emptyCheckbox.checked).toBe(true);
    expect(screen.getByLabelText(/^Expression/)).toBeDisabled();

    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      fireEvent.click(emptyCheckbox);
    });

    expect(onPropertyChangeSpy).toHaveBeenCalled();
    const lastCall = onPropertyChangeSpy.mock.calls[onPropertyChangeSpy.mock.calls.length - 1];
    expect(lastCall[1].csimple.expression).toBeUndefined();
    expect(screen.getByLabelText(/^Expression/)).not.toBeDisabled();
  });

  it('should call onPropertyChange with the preserved expression after selection change', async () => {
    const onPropertyChangeSpy = vi.fn();
    const EXPRESSION_STRING = 'Test';

    render(
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
    // Wait for the async parseExpressionModel effect to populate the expression field
    await screen.findByTestId(`${ROOT_PATH}__expression-list-typeahead-select-input`);
    await formPageObject.toggleExpressionFieldForProperty(ROOT_PATH);
    await formPageObject.selectTypeaheadItem('csimple');

    expect(onPropertyChangeSpy).toHaveBeenCalled();
    const lastCall = onPropertyChangeSpy.mock.calls[onPropertyChangeSpy.mock.calls.length - 1];
    expect(lastCall[1].csimple.expression).toBe(EXPRESSION_STRING);
  });

  it('should clear the expression when using the clear button', async () => {
    const onPropertyChangeSpy = vi.fn();

    render(
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

    // Wait for the async parseExpressionModel effect to populate the expression list
    const clearButton = await screen.findByTestId(`#__expression-list__clear`);
    // Use act to flush the async onExpressionChange handler
    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      fireEvent.click(clearButton);
    });

    expect(onPropertyChangeSpy).toHaveBeenCalledTimes(1);
    expect(onPropertyChangeSpy).toHaveBeenCalledWith(ROOT_PATH, { id: 'setHeader-1891' });
  });

  it('should update the model with `undefined` when the model is empty after clearing the expression', async () => {
    const onPropertyChangeSpy = vi.fn();

    const { findByTestId } = render(
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

    // Wait for the async parseExpressionModel effect to populate the expression list
    const clearButton = await findByTestId(`#__expression-list__clear`);

    // Use act to flush the async onExpressionChange handler
    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      fireEvent.click(clearButton);
    });

    expect(onPropertyChangeSpy).toHaveBeenCalledTimes(1);
    expect(onPropertyChangeSpy).toHaveBeenCalledWith(ROOT_PATH, undefined);
  });

  it('should show the error boundary fallback when parseExpressionModel rejects', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(ExpressionService, 'parseExpressionModel').mockRejectedValue(new Error('catalog unavailable'));

    render(
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
