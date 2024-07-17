import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { CatalogKind, ICamelLanguageDefinition, KaotoSchemaDefinition } from '../../../models';
import { IVisualizationNode, VisualComponentSchema } from '../../../models/visualization/base-visual-entity';
import { CamelCatalogService } from '../../../models/visualization/flows';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { MetadataEditor } from '../../MetadataEditor';
import { CanvasNode } from '../../Visualization/Canvas/canvas.models';
import { SchemaService } from '../schema.service';
import { StepExpressionEditor } from './StepExpressionEditor';
import { FormTabsModes } from '../../Visualization/Canvas/canvasformtabs.modes';

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
    const launcherButton = screen.getAllByRole('button', { name: 'Configure Expression' });
    await act(async () => {
      fireEvent.click(launcherButton[0]);
    });
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

  it('should render for all languages without an error', () => {
    Object.entries(languageCatalog).forEach(([name, language]) => {
      try {
        if (name === 'default') return;
        expect(language).toBeDefined();
        /* eslint-disable  @typescript-eslint/no-explicit-any */
        const schema = (language as any).propertiesSchema;
        render(
          <MetadataEditor
            data-testid="expression-editor"
            name={'expression'}
            schema={schema}
            metadata={{}}
            onChangeModel={() => {}}
          />,
        );
      } catch (e) {
        /* eslint-disable  @typescript-eslint/no-explicit-any */
        throw new Error(`Error rendering ${name} language: ${(e as any).message}`);
      }
    });
  });
});
