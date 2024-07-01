import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { CamelCatalogService, CatalogKind, ICamelLanguageDefinition } from '../../../models';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { SchemaService } from '../schema.service';
import { ExpressionEditor } from './ExpressionEditor';
import { ExpressionService } from './expression.service';

describe('ExpressionEditor', () => {
  const onChangeMock = jest.fn();
  /* eslint-disable  @typescript-eslint/no-explicit-any */

  let languageCatalog: Record<string, ICamelLanguageDefinition>;
  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    languageCatalog = catalogsMap.languageCatalog;
    CamelCatalogService.setCatalogKey(CatalogKind.Language, languageCatalog);
    onChangeMock.mockClear();
  });

  it('render empty simple if language is not specified', () => {
    render(<ExpressionEditor expressionModel={{}} onChangeExpressionModel={onChangeMock}></ExpressionEditor>);
    const dropdown = screen
      .getAllByTestId('typeahead-select-input')
      .filter((input) => input.innerHTML.includes(SchemaService.DROPDOWN_PLACEHOLDER));
    expect(dropdown).toHaveLength(1);
  });

  it('render model parameter and emit onChange when something is changed', () => {
    const language = ExpressionService.getDefinitionFromModelName(
      languageCatalog as unknown as Record<string, ICamelLanguageDefinition>,
      'jq',
    );
    const model = { expression: '.field3', resultType: 'string' };
    render(
      <ExpressionEditor
        language={language}
        expressionModel={model}
        onChangeExpressionModel={onChangeMock}
      ></ExpressionEditor>,
    );
    const dropdown = screen.getAllByTestId('typeahead-select-input').filter((input) => input.innerHTML.includes('JQ'));
    expect(dropdown).toHaveLength(1);
    const resultTypeInput = screen
      .getAllByTestId('create-typeahead-select-input')
      .filter((input) => input.innerHTML.includes('string'));
    expect(resultTypeInput).toHaveLength(1);
    const sourceInput = screen.getAllByRole('textbox').filter((textbox) => textbox.getAttribute('label') === 'Source');
    expect(sourceInput).toHaveLength(1);
    expect(sourceInput[0].getAttribute('value')).toEqual('');
    expect(onChangeMock.mock.calls).toHaveLength(0);
    act(() => {
      fireEvent.input(sourceInput[0], { target: { value: 'foo' } });
    });
    expect(onChangeMock.mock.calls).toHaveLength(1);
    expect(onChangeMock.mock.calls[0][1]).toEqual({ expression: '.field3', resultType: 'string', source: 'foo' });
  });

  it('clear the input value in case the clear button is clicked', async () => {
    const language = ExpressionService.getDefinitionFromModelName(
      languageCatalog as unknown as Record<string, ICamelLanguageDefinition>,
      'jq',
    );
    render(
      <ExpressionEditor
        language={language}
        expressionModel={{}}
        onChangeExpressionModel={onChangeMock}
      ></ExpressionEditor>,
    );
    const inputElement = screen.getAllByRole('combobox')[0];
    await act(async () => {
      fireEvent.change(inputElement, { target: { value: 'JQ' } });
    });
    expect(inputElement).toHaveValue('JQ');

    const clearButton = screen.getByLabelText('Clear input value');
    await act(async () => {
      fireEvent.click(clearButton);
    });
    expect(inputElement).toHaveValue('');
  });

  it('find bean method with a word bean', async () => {
    const language = ExpressionService.getDefinitionFromModelName(
      languageCatalog as unknown as Record<string, ICamelLanguageDefinition>,
      'method',
    );
    render(
      <ExpressionEditor
        language={language}
        expressionModel={{}}
        onChangeExpressionModel={onChangeMock}
      ></ExpressionEditor>,
    );
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
});
