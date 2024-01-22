import * as catalogIndex from '@kaoto-next/camel-catalog/index.json';
import { fireEvent, render, screen } from '@testing-library/react';
import { CamelCatalogService } from '../../../models/visualization/flows';
import { CatalogKind, ICamelDataformatDefinition } from '../../../models';
import { CanvasNode } from './canvas.models';
import { JSONSchemaType } from 'ajv';
import { IVisualizationNode, VisualComponentSchema } from '../../../models/visualization/base-visual-entity';
import { DataFormatEditor } from './DataFormatEditor';
import { MetadataEditor } from '../../MetadataEditor';

describe('DataFormatEditor', () => {
  let mockNode: CanvasNode;
  let dataformatCatalog: Record<string, ICamelDataformatDefinition>;
  beforeAll(async () => {
    dataformatCatalog = await import('@kaoto-next/camel-catalog/' + catalogIndex.catalogs.dataformats.file);
    /* eslint-disable  @typescript-eslint/no-explicit-any */
    delete (dataformatCatalog as any).default;
    CamelCatalogService.setCatalogKey(
      CatalogKind.Dataformat,
      dataformatCatalog as unknown as Record<string, ICamelDataformatDefinition>,
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

  it('should render', () => {
    render(<DataFormatEditor selectedNode={mockNode} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]);
    const json = screen.getByTestId('dataformat-dropdownitem-json');
    fireEvent.click(json.getElementsByTagName('button')[0]);
    const form = screen.getByTestId('metadata-editor-form-dataformat');
    expect(form.innerHTML).toContain('Allow Unmarshall Type');
  });

  it('should render for all dataformats without an error', () => {
    Object.entries(dataformatCatalog).forEach(([name, dataformat]) => {
      try {
        if (name === 'default') return;
        expect(dataformat).toBeDefined();
        /* eslint-disable  @typescript-eslint/no-explicit-any */
        const schema = (dataformat as any).propertiesSchema;
        render(
          <MetadataEditor
            data-testid="dataformat-editor"
            name={'dataformat'}
            schema={schema}
            metadata={{}}
            onChangeModel={() => {}}
          />,
        );
      } catch (e) {
        /* eslint-disable  @typescript-eslint/no-explicit-any */
        throw new Error(`Error rendering ${name} dataformat: ${(e as any).message}`);
      }
    });
  });
});
