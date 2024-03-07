import * as catalogIndex from '@kaoto-next/camel-catalog/index.json';
import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { CamelCatalogService, CatalogKind, ICamelLanguageDefinition } from '../../../models';
import { SchemaService } from '../schema.service';
import { ExpressionEditor } from './ExpressionEditor';
import { ExpressionService } from './expression.service';

describe('ExpressionEditor', () => {
  const onChangeMock = jest.fn();
  /* eslint-disable  @typescript-eslint/no-explicit-any */

  let languageCatalog: Record<string, ICamelLanguageDefinition>;
  beforeAll(async () => {
    languageCatalog = await import('@kaoto-next/camel-catalog/' + catalogIndex.catalogs.languages.file);
    delete (languageCatalog as any).default;
    CamelCatalogService.setCatalogKey(
      CatalogKind.Language,
      languageCatalog as unknown as Record<string, ICamelLanguageDefinition>,
    );
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
      .getAllByRole('textbox')
      .filter((textbox) => textbox.getAttribute('label') === 'Result Type');
    expect(resultTypeInput).toHaveLength(1);
    expect(resultTypeInput[0].getAttribute('value')).toEqual('string');
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
    const inputElement = screen.getByRole('combobox');
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
});
