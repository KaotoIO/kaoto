import * as yamlDslSchema from '@kaoto-next/camel-catalog/camelYamlDsl.json';
import * as languageCatalog from '@kaoto-next/camel-catalog/camel-catalog-aggregate-languages.json';
import { fireEvent, render, screen } from '@testing-library/react';
import { ExpressionEditor } from './ExpressionEditor';
import { CamelCatalogService } from '../../../models/visualization/flows';
import { CatalogKind, ICamelLanguageDefinition } from '../../../models';
import { CanvasNode } from './canvas.models';
import { JSONSchemaType } from 'ajv';
import { IVisualizationNode, VisualComponentSchema } from '../../../models/visualization/base-visual-entity';
import { useSchemasStore } from '../../../store';
import { act } from 'react-dom/test-utils';
import { MetadataEditor } from '../../MetadataEditor';

describe('ExpressionEditor', () => {
  let mockNode: CanvasNode;
  beforeAll(() => {
    /* eslint-disable  @typescript-eslint/no-explicit-any */
    delete (yamlDslSchema as any).default;
    delete (languageCatalog as any).default;
    CamelCatalogService.setCatalogKey(
      CatalogKind.Language,
      languageCatalog as unknown as Record<string, ICamelLanguageDefinition>,
    );

    act(() => {
      useSchemasStore.setState({
        schemas: {
          camelYamlDsl: {
            name: 'camelYamlDsl',
            tags: ['camel'],
            version: '1.0.0',
            uri: '',
            schema: yamlDslSchema as unknown as Record<string, unknown>,
          },
        },
      });
    });

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

  it('should render', () => {
    render(<ExpressionEditor selectedNode={mockNode} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]);
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
