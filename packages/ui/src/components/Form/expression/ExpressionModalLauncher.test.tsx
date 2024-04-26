import { ExpressionModalLauncher } from './ExpressionModalLauncher';
import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import * as catalogIndex from '@kaoto-next/camel-catalog/index.json';
import { CamelCatalogService, CatalogKind, ICamelLanguageDefinition } from '../../../models';
import { ExpressionService } from './expression.service';

describe('ExpressionModalLauncher', () => {
  let languageCatalog: Record<string, ICamelLanguageDefinition>;
  beforeAll(async () => {
    languageCatalog = await import('@kaoto-next/camel-catalog/' + catalogIndex.catalogs.languages.file);
    /* eslint-disable  @typescript-eslint/no-explicit-any */
    delete (languageCatalog as any).default;
    CamelCatalogService.setCatalogKey(
      CatalogKind.Language,
      languageCatalog as unknown as Record<string, ICamelLanguageDefinition>,
    );
  });

  it('should render', () => {
    render(
      <ExpressionModalLauncher
        name="test"
        title="test"
        language={undefined}
        model={{}}
        onCancel={jest.fn()}
        onChange={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );
  });

  it('should render with a modal closed, open by click, then close by cancel button', () => {
    render(
      <ExpressionModalLauncher
        name="expression"
        model={{}}
        onCancel={jest.fn()}
        onChange={jest.fn()}
        onConfirm={jest.fn()}
      ></ExpressionModalLauncher>,
    );
    const link = screen.getByRole('button', { name: 'Configure Expression' });
    expect(link).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => {
      fireEvent.click(link);
    });
    expect(screen.queryByRole('dialog')).toBeInTheDocument();
    const cancelBtn = screen.getAllByRole('button').filter((button) => button.textContent === 'Cancel');
    expect(cancelBtn).toHaveLength(1);
    act(() => {
      fireEvent.click(cancelBtn[0]);
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('should render with parameters filled with passed in model, emit onChange with apply button', () => {
    const model = { expression: '${body}', resultType: 'string' };
    const language = ExpressionService.getDefinitionFromModelName(
      languageCatalog as unknown as Record<string, ICamelLanguageDefinition>,
      'simple',
    );
    const mockOnChange = jest.fn();
    const mockOnConfirm = jest.fn();
    const mockOnCancel = jest.fn();
    render(
      <ExpressionModalLauncher
        name="expression"
        language={language}
        model={model}
        onCancel={mockOnCancel}
        onChange={mockOnChange}
        onConfirm={mockOnConfirm}
      ></ExpressionModalLauncher>,
    );
    const link = screen.getByRole('button', { name: 'Configure Expression' });
    act(() => {
      fireEvent.click(link);
    });

    const expressionInput = screen
      .getAllByRole('textbox')
      .filter((textbox) => textbox.getAttribute('name') === 'expression');
    expect(expressionInput).toHaveLength(1);
    expect(expressionInput[0].textContent).toEqual('${body}');
    expect(mockOnChange.mock.calls).toHaveLength(0);
    expect(mockOnConfirm.mock.calls).toHaveLength(0);
    act(() => {
      fireEvent.input(expressionInput[0], { target: { value: '${header.foo}' } });
    });
    expect(mockOnChange.mock.calls).toHaveLength(1);
    expect(mockOnConfirm.mock.calls).toHaveLength(0);

    const applyBtn = screen.getAllByRole('button').filter((button) => button.textContent === 'Apply');
    expect(applyBtn).toHaveLength(1);
    act(() => {
      fireEvent.click(applyBtn[0]);
    });
    expect(mockOnChange.mock.calls).toHaveLength(1);
    expect(mockOnConfirm.mock.calls).toHaveLength(1);
  });

  it('should render expression preview for bean method', () => {
    const model = { ref: '#myBean', method: 'doSomething' };
    const language = ExpressionService.getDefinitionFromModelName(
      languageCatalog as unknown as Record<string, ICamelLanguageDefinition>,
      'method',
    );
    const mockOnChange = jest.fn();
    const mockOnConfirm = jest.fn();
    const mockOnCancel = jest.fn();
    render(
      <ExpressionModalLauncher
        name="expression"
        language={language}
        model={model}
        onCancel={mockOnCancel}
        onChange={mockOnChange}
        onConfirm={mockOnConfirm}
      ></ExpressionModalLauncher>,
    );
    const previewInput = screen.getByTestId('expression-preview-input');
    expect(previewInput.getAttribute('value')).toEqual('Bean Method: #myBean.doSomething()');
  });

  it('should render expression preview for tokenize', () => {
    const model = { token: ',' };
    const language = ExpressionService.getDefinitionFromModelName(
      languageCatalog as unknown as Record<string, ICamelLanguageDefinition>,
      'tokenize',
    );
    const mockOnChange = jest.fn();
    const mockOnConfirm = jest.fn();
    const mockOnCancel = jest.fn();
    render(
      <ExpressionModalLauncher
        name="expression"
        language={language}
        model={model}
        onCancel={mockOnCancel}
        onChange={mockOnChange}
        onConfirm={mockOnConfirm}
      ></ExpressionModalLauncher>,
    );
    const previewInput = screen.getByTestId('expression-preview-input');
    expect(previewInput.getAttribute('value')).toEqual('Tokenize: (token=[,])');
  });
});

it('should close the modal when the close button is clicked', () => {
  render(
    <ExpressionModalLauncher
      name="test"
      title="test"
      language={undefined}
      model={{}}
      onCancel={jest.fn()}
      onChange={jest.fn()}
      onConfirm={jest.fn()}
    />,
  );
  const link = screen.getByRole('button', { name: 'Configure Expression' });
  act(() => {
    fireEvent.click(link);
  });
  const closeButton = screen.getByLabelText('Close');
  act(() => {
    fireEvent.click(closeButton);
  });
  expect(screen.queryByRole('dialog')).toBeNull();
});
