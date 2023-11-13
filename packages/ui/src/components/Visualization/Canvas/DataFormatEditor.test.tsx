import * as yamlDslSchema from '@kaoto-next/camel-catalog/camelYamlDsl.json';
import * as dataformatCatalog from '@kaoto-next/camel-catalog/camel-catalog-aggregate-dataformats.json';
import { fireEvent, render, screen } from '@testing-library/react';
import { CamelCatalogService } from '../../../models/visualization/flows';
import { CatalogKind, ICamelDataformatDefinition } from '../../../models';
import { CanvasNode } from './canvas.models';
import { JSONSchemaType } from 'ajv';
import { IVisualizationNode, VisualComponentSchema } from '../../../models/visualization/base-visual-entity';
import { useSchemasStore } from '../../../store';
import { act } from 'react-dom/test-utils';
import { DataFormatEditor } from './DataFormatEditor';

describe('DataFormatEditor', () => {
  let mockNode: CanvasNode;
  beforeAll(() => {
    /* eslint-disable  @typescript-eslint/no-explicit-any */
    delete (yamlDslSchema as any).default;
    delete (dataformatCatalog as any).default;
    CamelCatalogService.setCatalogKey(
      CatalogKind.Dataformat,
      dataformatCatalog as unknown as Record<string, ICamelDataformatDefinition>,
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
    render(<DataFormatEditor selectedNode={mockNode} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]);
    const json = screen.getByTestId('dataformat-dropdownitem-json');
    fireEvent.click(json.getElementsByTagName('button')[0]);
    const form = screen.getByTestId('metadata-editor-form-dataformat');
    expect(form.innerHTML).toContain('Allow Unmarshall Type');
  });
});
