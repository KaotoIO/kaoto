import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { ExpressionField } from './ExpressionField';
import { SchemaProvider } from '../../providers/SchemaProvider';
import { ROOT_PATH } from '../../../../../../utils';
import { CamelCatalogService, CatalogKind } from '../../../../../../models';
import { getFirstCatalogMap } from '../../../../../../stubs/test-load-catalog';
import { ModelContextProvider } from '../../providers/ModelProvider';
import { SchemaDefinitionsProvider } from '../../providers/SchemaDefinitionsProvider';
import { FormComponentFactoryProvider } from '../../providers/FormComponentFactoryProvider';
import { KaotoFormPageObject } from '../../testing/KaotoFormPageObject';
import { setHeaderExpressionSchema } from '../../../../../../stubs/expression-definition-schema';

describe('ExpressionField', () => {
  beforeEach(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Language, catalogsMap.languageCatalog);
  });

  it('renders empty expression field with schema', () => {
    const { container } = render(
      <ModelContextProvider model={{ id: 'setHeader-1361' }} onPropertyChange={jest.fn()}>
        <SchemaProvider schema={setHeaderExpressionSchema}>
          <ExpressionField propName={ROOT_PATH} required={true} />
        </SchemaProvider>
      </ModelContextProvider>,
    );

    expect(container).toMatchSnapshot();
  });

  it('renders expression field with selection', () => {
    const { container } = render(
      <FormComponentFactoryProvider>
        <ModelContextProvider
          model={{
            id: 'setHeader-1891',
            expression: {
              simple: {},
            },
          }}
          onPropertyChange={jest.fn()}
        >
          <SchemaDefinitionsProvider schema={setHeaderExpressionSchema} omitFields={[]}>
            <SchemaProvider schema={setHeaderExpressionSchema}>
              <ExpressionField propName={ROOT_PATH} required={true} />
            </SchemaProvider>
          </SchemaDefinitionsProvider>
        </ModelContextProvider>
      </FormComponentFactoryProvider>,
    );

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
          onPropertyChange={jest.fn()}
        >
          <SchemaDefinitionsProvider schema={setHeaderExpressionSchema} omitFields={[]}>
            <SchemaProvider schema={setHeaderExpressionSchema}>
              <ExpressionField propName={ROOT_PATH} required={true} />
            </SchemaProvider>
          </SchemaDefinitionsProvider>
        </ModelContextProvider>
      </FormComponentFactoryProvider>,
    );

    const formPageObject = new KaotoFormPageObject(screen, act);
    await formPageObject.toggleExpressionFieldForProperty(ROOT_PATH);
    await formPageObject.selectTypeaheadItem('csimple');

    const expressionField = formPageObject.getFieldByDisplayName('Expression');
    expect(expressionField).toBeInTheDocument();
  });

  it('should clear the expression when using the clear button', async () => {
    const onPropertyChangeSpy = jest.fn();

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
          <ExpressionField propName={ROOT_PATH} required={true} />
        </SchemaProvider>
      </ModelContextProvider>,
    );

    const clearButton = screen.getByTestId(`#__expression-list__clear`);
    await act(async () => {
      fireEvent.click(clearButton);
    });

    expect(onPropertyChangeSpy).toHaveBeenCalledTimes(1);
    expect(onPropertyChangeSpy).toHaveBeenCalledWith(ROOT_PATH, { id: 'setHeader-1891' });
  });

  it('should update the model with `undefined` when the model is empty after clearing the expression', async () => {
    const onPropertyChangeSpy = jest.fn();

    const wrapper = render(
      <ModelContextProvider
        model={{
          expression: {
            simple: {},
          },
        }}
        onPropertyChange={onPropertyChangeSpy}
      >
        <SchemaProvider schema={setHeaderExpressionSchema}>
          <ExpressionField propName={ROOT_PATH} required={true} />
        </SchemaProvider>
      </ModelContextProvider>,
    );

    const clearButton = wrapper.getByTestId(`#__expression-list__clear`);

    await act(async () => {
      fireEvent.click(clearButton);
    });

    expect(onPropertyChangeSpy).toHaveBeenCalledTimes(1);
    expect(onPropertyChangeSpy).toHaveBeenCalledWith(ROOT_PATH, undefined);
  });
});
