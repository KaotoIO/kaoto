import { ExpressionEditor } from './ExpressionEditor';
import { fireEvent, render, screen } from '@testing-library/react';
import { CamelCatalogService, CatalogKind, ICamelLanguageDefinition } from '../../../models';
import * as catalogIndex from '@kaoto-next/camel-catalog/index.json';
import { ExpressionService } from './expression.service';
import { act } from 'react-dom/test-utils';

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
    const dropdown = screen.getAllByRole('button').filter((button) => button.textContent === 'Simple');
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
    const dropdown = screen.getAllByRole('button').filter((button) => button.textContent === 'JQ');
    expect(dropdown).toHaveLength(1);
    const resultTypeInput = screen
      .getAllByRole('textbox')
      .filter((textbox) => textbox.getAttribute('label') === 'Result Type');
    expect(resultTypeInput).toHaveLength(1);
    expect(resultTypeInput[0].getAttribute('value')).toEqual('string');
    const headerNameInput = screen
      .getAllByRole('textbox')
      .filter((textbox) => textbox.getAttribute('label') === 'Header Name');
    expect(headerNameInput).toHaveLength(1);
    expect(headerNameInput[0].getAttribute('value')).toEqual('');
    expect(onChangeMock.mock.calls).toHaveLength(0);
    act(() => {
      fireEvent.input(headerNameInput[0], { target: { value: 'foo' } });
    });
    expect(onChangeMock.mock.calls).toHaveLength(1);
    expect(onChangeMock.mock.calls[0][1]).toEqual({ expression: '.field3', resultType: 'string', headerName: 'foo' });
  });
});
