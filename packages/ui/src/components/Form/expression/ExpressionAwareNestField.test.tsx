import { AutoField } from '@kaoto-next/uniforms-patternfly';
import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { AutoForm } from 'uniforms';
import { CamelCatalogService, CatalogKind } from '../../../models';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { CustomAutoFieldDetector } from '../CustomAutoField';
import { SchemaService } from '../schema.service';
import { ExpressionAwareNestField } from './ExpressionAwareNestField';

describe('ExpressionAwareNestField', () => {
  const mockSchema = {
    title: 'setHeaders',
    description: 'setHeaders',
    type: 'object',
    additionalProperties: false,
    properties: {
      headers: {
        type: 'array',
        items: {
          type: 'object',
          $comment: 'expression',
          properties: {
            other: {
              type: 'string',
            },
          },
        },
      },
    },
  };
  const schemaService = new SchemaService();
  const schemaBridge = schemaService.getSchemaBridge(mockSchema);

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Language, catalogsMap.languageCatalog);
  });

  it('should render', async () => {
    render(
      <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
        <AutoForm schema={schemaBridge!} model={{ headers: [{ expression: {} }] }}>
          <ExpressionAwareNestField name={'headers.$'}></ExpressionAwareNestField>
        </AutoForm>
      </AutoField.componentDetectorContext.Provider>,
    );
    const buttons = screen.getAllByRole('button', { name: 'Typeahead menu toggle' });
    await act(async () => {
      fireEvent.click(buttons[0]);
    });
    const json = screen.getByTestId('expression-dropdownitem-datasonnet');
    fireEvent.click(json.getElementsByTagName('button')[0]);
    const form = screen.getByTestId('metadata-editor-form-expression');
    expect(form.innerHTML).toContain('Output Media Type');
  });

  it('should render with parameters filled with passed in model, emit onChange with apply button', () => {
    const mockOnChange = jest.fn();
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
          <ExpressionAwareNestField name="headers.$" {...fieldProperties}></ExpressionAwareNestField>
        </AutoForm>
      </AutoField.componentDetectorContext.Provider>,
    );
    const idInput = screen.getAllByRole('textbox').filter((textbox) => textbox.getAttribute('label') === 'Id');
    expect(idInput).toHaveLength(1);
    expect(idInput[0].getAttribute('value')).toEqual('');
    expect(mockOnChange.mock.calls).toHaveLength(0);
    act(() => {
      fireEvent.input(idInput[0], { target: { value: 'foo' } });
    });
    expect(mockOnChange.mock.calls).toHaveLength(1);
  });
});
