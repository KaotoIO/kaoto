import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { SchemaService } from '../schema.service';
import { CamelCatalogService, CatalogKind, ICamelLanguageDefinition } from '../../../models';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { MetadataEditor } from '../../MetadataEditor';
import { ExpressionEditor } from './ExpressionEditor';

describe('ExpressionEditor', () => {
  const onChangeMock = jest.fn();
  let languageCatalog: Record<string, ICamelLanguageDefinition>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    languageCatalog = catalogsMap.languageCatalog;
    CamelCatalogService.setCatalogKey(CatalogKind.Language, catalogsMap.languageCatalog);
    onChangeMock.mockClear();
  });

  it('render empty simple if language is not specified', () => {
    render(<ExpressionEditor expressionModel={{}} onChangeExpressionModel={onChangeMock}></ExpressionEditor>);
    const dropdown = screen
      .getAllByTestId('typeahead-select-input')
      .filter((input) => input.innerHTML.includes(SchemaService.DROPDOWN_PLACEHOLDER));
    expect(dropdown).toHaveLength(1);
  });

  it('should render', async () => {
    const expressionModel = {};

    render(<ExpressionEditor expressionModel={expressionModel} onChangeExpressionModel={onChangeMock} />);
    const buttons = screen.getAllByRole('button', { name: 'Typeahead menu toggle' });
    await act(async () => {
      fireEvent.click(buttons[0]);
    });
    const json = screen.getByTestId('expression-dropdownitem-datasonnet');
    fireEvent.click(json.getElementsByTagName('button')[0]);
    const form = screen.getByTestId('metadata-editor-form-expression');
    expect(form.innerHTML).toContain('Output Media Type');
  });

  it('render model parameter and emit onChange when something is changed', () => {
    const model = {
      expression: {
        jq: {},
      },
    };
    render(<ExpressionEditor expressionModel={model} onChangeExpressionModel={onChangeMock} />);
    const sourceInput = screen.getAllByRole('textbox').filter((textbox) => textbox.getAttribute('label') === 'Source');
    expect(sourceInput).toHaveLength(1);
    expect(sourceInput[0].getAttribute('value')).toEqual('');
    expect(onChangeMock.mock.calls).toHaveLength(0);
    act(() => {
      fireEvent.input(sourceInput[0], { target: { value: 'foo' } });
    });
    expect(onChangeMock.mock.calls).toHaveLength(1);
    expect(onChangeMock.mock.calls[0][0]).toEqual({ expression: { jq: { source: 'foo' } } });
  });
  it('find bean method with a word bean', async () => {
    render(<ExpressionEditor expressionModel={{}} onChangeExpressionModel={onChangeMock}></ExpressionEditor>);
    const inputElement = screen.getAllByRole('combobox')[0];
    await act(async () => {
      fireEvent.change(inputElement, { target: { value: 'b' } });
    });
    const dropdownItems = screen.getAllByTestId(/expression-dropdownitem-.*/);
    expect(dropdownItems).toHaveLength(6);
    await act(async () => {
      fireEvent.change(inputElement, { target: { value: 'bean' } });
    });
    const dropdownItems2 = screen.getAllByTestId(/expression-dropdownitem-.*/);
    expect(dropdownItems2).toHaveLength(1);
  });

  it('should filter candidates with a text input', async () => {
    const expressionModel = {};

    render(<ExpressionEditor expressionModel={expressionModel} onChangeExpressionModel={onChangeMock} />);
    const buttons = screen.getAllByRole('button', { name: 'Typeahead menu toggle' });
    await act(async () => {
      fireEvent.click(buttons[0]);
    });

    let dropdownItems = screen.queryAllByTestId(/expression-dropdownitem-.*/);
    expect(dropdownItems.length).toBeGreaterThan(25);
    const inputElement = screen.getAllByRole('combobox')[0];
    await act(async () => {
      fireEvent.change(inputElement, { target: { value: 'simple' } });
    });

    dropdownItems = screen.getAllByTestId(/expression-dropdownitem-.*/);
    expect(dropdownItems).toHaveLength(2);
  });

  it('should clear filter and close the dropdown with close button', async () => {
    const expressionModel = {};

    render(<ExpressionEditor expressionModel={expressionModel} onChangeExpressionModel={onChangeMock} />);
    const buttons = screen.getAllByRole('button', { name: 'Typeahead menu toggle' });
    await act(async () => {
      fireEvent.click(buttons[0]);
    });
    let inputElement = screen.getAllByRole('combobox')[0];
    await act(async () => {
      fireEvent.change(inputElement, { target: { value: 'simple' } });
    });
    let dropdownItems = screen.getAllByTestId(/expression-dropdownitem-.*/);
    expect(dropdownItems).toHaveLength(2);
    const clearButton = screen.getByLabelText('Clear input value');
    await act(async () => {
      fireEvent.click(clearButton);
    });
    dropdownItems = screen.getAllByTestId(/expression-dropdownitem-.*/);
    expect(dropdownItems.length).toBeGreaterThan(25);
    inputElement = screen.getAllByRole('combobox')[0];
    expect(inputElement).toHaveValue('');
  });

  it('should render for all expressions without an error', () => {
    Object.entries(languageCatalog).forEach(([name, expression]) => {
      try {
        if (name === 'default') return;
        expect(expression).toBeDefined();
        /* eslint-disable  @typescript-eslint/no-explicit-any */
        const schema = (expression as any).propertiesSchema;
        render(
          <MetadataEditor
            data-testid="expression-editor"
            name={'expression'}
            schema={schema}
            metadata={{}}
            onChangeModel={() => {}}
          />,
        );
      } catch (e) {
        /* eslint-disable  @typescript-eslint/no-explicit-any */
        throw new Error(`Error rendering ${name} expression: ${(e as any).message}`);
      }
    });
  });
});
