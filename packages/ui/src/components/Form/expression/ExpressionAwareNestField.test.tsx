import { SchemaService } from '../schema.service';
import * as languageCatalog from '@kaoto-next/camel-catalog/camel-catalog-aggregate-languages.json';
import { CamelCatalogService, CatalogKind, ICamelLanguageDefinition } from '../../../models';
import { AutoField } from '@kaoto-next/uniforms-patternfly';
import { AutoForm } from 'uniforms';
import { CustomAutoFieldDetector } from '../CustomAutoField';
import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
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

  /* eslint-disable  @typescript-eslint/no-explicit-any */
  delete (languageCatalog as any).default;
  CamelCatalogService.setCatalogKey(
    CatalogKind.Language,
    languageCatalog as unknown as Record<string, ICamelLanguageDefinition>,
  );

  it('should render with a modal closed, open by click, then close by cancel button', () => {
    render(
      <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
        <AutoForm schema={schemaBridge!} model={{ headers: [{ expression: {} }] }}>
          <ExpressionAwareNestField name={'headers.$'}></ExpressionAwareNestField>
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
    const link = screen.getByRole('button', { name: 'Configure Expression' });
    act(() => {
      fireEvent.click(link);
    });

    const expressionInput = screen
      .getAllByRole('textbox')
      .filter((textbox) => textbox.getAttribute('label') === 'Expression');
    expect(expressionInput).toHaveLength(1);
    expect(expressionInput[0].getAttribute('value')).toEqual('${body}');
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
