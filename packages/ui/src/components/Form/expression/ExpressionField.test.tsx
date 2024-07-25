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
  it('should render', async () => {
    const fieldProperties = {
      value: { simple: { expression: '${body}', resultType: 'string' } },
      onChange: mockOnChange,
    };
    render(
      <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
        <AutoForm schema={schemaBridge!} model={{}}>
          <ExpressionField name="expression" {...fieldProperties}></ExpressionField>
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
});
