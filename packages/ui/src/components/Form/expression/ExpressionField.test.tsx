import { AutoField } from '@kaoto-next/uniforms-patternfly';
import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { AutoForm } from 'uniforms';
import { CamelCatalogService, CatalogKind } from '../../../models';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { CustomAutoFieldDetector } from '../CustomAutoField';
import { SchemaService } from '../schema.service';
import { ExpressionField } from './ExpressionField';

const mockSchema = {
  title: 'Expression',
  description: 'Expressionn Configuration',
  type: 'object',
  additionalProperties: false,
  properties: {
    expression: {
      type: 'object',
      $comment: 'expression',
    },
  },
};
const schemaService = new SchemaService();
const schemaBridge = schemaService.getSchemaBridge(mockSchema);

const mockOnChange = jest.fn();

beforeAll(async () => {
  const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
  const languageCatalog = catalogsMap.languageCatalog;
  CamelCatalogService.setCatalogKey(CatalogKind.Language, languageCatalog);

  mockOnChange.mockClear();
});

describe('ExpressionField', () => {
  it('should render with a modal closed, open by click, then close by cancel button', () => {
    render(
      <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
        <AutoForm schema={schemaBridge!} model={{ expression: {} }}>
          <ExpressionField name="expression"></ExpressionField>
        </AutoForm>
      </AutoField.componentDetectorContext.Provider>,
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
    const fieldProperties = {
      value: { simple: { expression: '${body}', resultType: 'string' } },
      onChange: mockOnChange,
      field: {
        type: 'object',
        title: 'expression field title',
        $comment: 'expression',
      },
    };
    render(
      <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
        <AutoForm schema={schemaBridge!} model={{}}>
          <ExpressionField name="expression" {...fieldProperties}></ExpressionField>
        </AutoForm>
      </AutoField.componentDetectorContext.Provider>,
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
    act(() => {
      fireEvent.input(expressionInput[0], { target: { value: '${header.foo}' } });
    });

    const applyBtn = screen.getAllByRole('button').filter((button) => button.textContent === 'Apply');
    expect(applyBtn).toHaveLength(1);
    expect(mockOnChange.mock.calls).toHaveLength(0);
    act(() => {
      fireEvent.click(applyBtn[0]);
    });
    expect(mockOnChange.mock.calls).toHaveLength(1);
  });
});
