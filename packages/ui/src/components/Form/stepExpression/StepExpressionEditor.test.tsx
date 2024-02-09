import * as catalogIndex from '@kaoto-next/camel-catalog/index.json';
import { fireEvent, render, screen } from '@testing-library/react';
import { StepExpressionEditor } from './StepExpressionEditor';
import { CamelCatalogService } from '../../../models/visualization/flows';
import { CatalogKind, ICamelLanguageDefinition } from '../../../models';
import { CanvasNode } from '../../Visualization/Canvas/canvas.models';
import { JSONSchemaType } from 'ajv';
import { IVisualizationNode, VisualComponentSchema } from '../../../models/visualization/base-visual-entity';
import { MetadataEditor } from '../../MetadataEditor';
import { SchemaService } from '../schema.service';
import { act } from 'react-dom/test-utils';

describe('StepExpressionEditor', () => {
  let mockNode: CanvasNode;
  let languageCatalog: Record<string, ICamelLanguageDefinition>;
  beforeAll(async () => {
    languageCatalog = await import('@kaoto-next/camel-catalog/' + catalogIndex.catalogs.languages.file);
    /* eslint-disable  @typescript-eslint/no-explicit-any */
    delete (languageCatalog as any).default;
    CamelCatalogService.setCatalogKey(
      CatalogKind.Language,
      languageCatalog as unknown as Record<string, ICamelLanguageDefinition>,
    );

    const visualComponentSchema: VisualComponentSchema = {
      title: 'My Node',
      schema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
          },
        },
      } as unknown as JSONSchemaType<unknown>,
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

  it('should render', async () => {
    render(<StepExpressionEditor selectedNode={mockNode} />);
    const launcherButton = screen.getAllByRole('button', { name: 'Configure Expression' });
    await act(async () => {
      fireEvent.click(launcherButton[0]);
    });
    const dropdownButton = screen
      .getAllByRole('button')
      .filter((button) => button.innerHTML.includes(SchemaService.DROPDOWN_PLACEHOLDER));
    await act(async () => {
      fireEvent.click(dropdownButton[0]);
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
