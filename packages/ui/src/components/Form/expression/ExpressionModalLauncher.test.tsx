import { ExpressionModalLauncher } from './ExpressionModalLauncher';
import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import * as languageCatalog from '@kaoto-next/camel-catalog/camel-catalog-aggregate-languages.json';
import { CamelCatalogService, CatalogKind, ICamelLanguageDefinition } from '../../../models';
import { ExpressionService } from './expression.service';

describe('ExpressionModalLauncher', () => {
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  delete (languageCatalog as any).default;
  CamelCatalogService.setCatalogKey(
    CatalogKind.Language,
    languageCatalog as unknown as Record<string, ICamelLanguageDefinition>,
  );

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
    screen.debug(screen.getByRole('dialog'));
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
      .filter((textbox) => textbox.getAttribute('label') === 'Expression');
    expect(expressionInput).toHaveLength(1);
    expect(expressionInput[0].getAttribute('value')).toEqual('${body}');
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
