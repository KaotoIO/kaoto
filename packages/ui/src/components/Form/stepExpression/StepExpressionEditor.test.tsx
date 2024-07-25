import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { CatalogKind, ICamelLanguageDefinition, KaotoSchemaDefinition } from '../../../models';
import { IVisualizationNode, VisualComponentSchema } from '../../../models/visualization/base-visual-entity';
import { CamelCatalogService } from '../../../models/visualization/flows';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { FormTabsModes } from '../../Visualization/Canvas';
import { CanvasNode } from '../../Visualization/Canvas/canvas.models';
import { SchemaService } from '../schema.service';
import { StepExpressionEditor } from './StepExpressionEditor';

describe('StepExpressionEditor', () => {
  let mockNode: CanvasNode;
  let languageCatalog: Record<string, ICamelLanguageDefinition>;
  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    languageCatalog = catalogsMap.languageCatalog;
    CamelCatalogService.setCatalogKey(CatalogKind.Language, languageCatalog);

    const visualComponentSchema: VisualComponentSchema = {
      title: 'My Node',
      schema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
          },
        },
      } as unknown as KaotoSchemaDefinition['schema'],
      definition: {
        name: 'my node',
      },
    };

    mockNode = {
      id: '1',
      type: 'node',
      data: {
        vizNode: {
          getComponentSchema: () => visualComponentSchema,
          updateModel: (_value: unknown) => {},
        } as IVisualizationNode,
      },
    };
  });

  it('should not render', () => {
    render(<StepExpressionEditor selectedNode={mockNode} formMode={FormTabsModes.USER_MODIFIED} />);
    const launcherButton = screen.queryAllByRole('button', { name: 'Configure Expression' });
    expect(launcherButton).toHaveLength(0);
  });

  it('should render', async () => {
    render(<StepExpressionEditor selectedNode={mockNode} formMode={FormTabsModes.ALL_FIELDS} />);
    const dropdown = screen
      .getAllByTestId('typeahead-select-input')
      .filter((input) => input.innerHTML.includes(SchemaService.DROPDOWN_PLACEHOLDER));
    await act(async () => {
      fireEvent.click(dropdown[0]);
    });
    const jsonpath = screen.getByTestId('expression-dropdownitem-jsonpath');
    fireEvent.click(jsonpath.getElementsByTagName('button')[0]);
    const form = screen.getByTestId('metadata-editor-form-expression');
    expect(form.innerHTML).toContain('Suppress Exceptions');
  });
});
