import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { CatalogKind, ICamelDataformatDefinition, KaotoSchemaDefinition } from '../../../models';
import { IVisualizationNode, VisualComponentSchema } from '../../../models/visualization/base-visual-entity';
import { CamelCatalogService } from '../../../models/visualization/flows';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { MetadataEditor } from '../../MetadataEditor';
import { CanvasNode } from '../../Visualization/Canvas/canvas.models';
import { DataFormatEditor } from './DataFormatEditor';

describe('DataFormatEditor', () => {
  let mockNode: CanvasNode;
  let dataformatCatalog: Record<string, ICamelDataformatDefinition>;
  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    dataformatCatalog = catalogsMap.dataformatCatalog;
    CamelCatalogService.setCatalogKey(CatalogKind.Dataformat, catalogsMap.dataformatCatalog);

    const visualComponentSchema: VisualComponentSchema = {
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
    render(<DataFormatEditor selectedNode={mockNode} formMode="Modified" />);
    const buttons = screen.queryAllByRole('button', { name: 'Typeahead menu toggle' });
    expect(buttons).toHaveLength(0);
  });

  it('should render with only the user updated fields', () => {
    const visualComponentSchema: VisualComponentSchema = {
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
        asn1: {
          id: 'test',
        },
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
    render(<DataFormatEditor selectedNode={mockNode} formMode="Modified" />);
    const buttons = screen.queryAllByRole('button', { name: 'Typeahead menu toggle' });
    expect(buttons).toHaveLength(1);

    const inputElement = screen.getAllByRole('combobox')[0];
    expect(inputElement).toHaveValue('ASN.1 File');

    const inputIdModifiedTabElement = screen
      .queryAllByRole('textbox')
      .filter((textbox) => textbox.getAttribute('label') === 'Id');
    expect(inputIdModifiedTabElement).toHaveLength(1);
  });

  it('should render with only the Required fields', () => {
    const visualComponentSchema: VisualComponentSchema = {
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
        beanio: {},
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
    render(<DataFormatEditor selectedNode={mockNode} formMode="Required" />);
    const buttons = screen.queryAllByRole('button', { name: 'Typeahead menu toggle' });
    expect(buttons).toHaveLength(1);

    const inputElement = screen.getAllByRole('combobox')[0];
    expect(inputElement).toHaveValue('BeanIO');

    const inputMappingElement = screen
      .queryAllByRole('textbox')
      .filter((textbox) => textbox.getAttribute('label') === 'Mapping');
    expect(inputMappingElement).toHaveLength(1);

    const inputStreamNameElement = screen
      .queryAllByRole('textbox')
      .filter((textbox) => textbox.getAttribute('label') === 'Stream Name');
    expect(inputStreamNameElement).toHaveLength(1);
  });

  it('should render', async () => {
    render(<DataFormatEditor selectedNode={mockNode} formMode="All" />);
    const buttons = screen.getAllByRole('button', { name: 'Typeahead menu toggle' });
    await act(async () => {
      fireEvent.click(buttons[0]);
    });
    const json = screen.getByTestId('dataformat-dropdownitem-json');
    fireEvent.click(json.getElementsByTagName('button')[0]);
    const form = screen.getByTestId('metadata-editor-form-dataformat');
    expect(form.innerHTML).toContain('Allow Unmarshall Type');
  });

  it('should filter candidates with a text input', async () => {
    render(<DataFormatEditor selectedNode={mockNode} formMode="All" />);
    const buttons = screen.getAllByRole('button', { name: 'Typeahead menu toggle' });
    await act(async () => {
      fireEvent.click(buttons[0]);
    });
    let dropdownItems = screen.queryAllByTestId(/dataformat-dropdownitem-.*/);
    expect(dropdownItems.length).toBeGreaterThan(40);
    const inputElement = screen.getAllByRole('combobox')[0];
    await act(async () => {
      fireEvent.change(inputElement, { target: { value: 'json' } });
    });
    dropdownItems = screen.getAllByTestId(/dataformat-dropdownitem-.*/);
    expect(dropdownItems).toHaveLength(4);
  });

  it('should clear filter and close the dropdown with close button', async () => {
    render(<DataFormatEditor selectedNode={mockNode} formMode="All" />);
    const buttons = screen.getAllByRole('button', { name: 'Typeahead menu toggle' });
    await act(async () => {
      fireEvent.click(buttons[0]);
    });
    let inputElement = screen.getAllByRole('combobox')[0];
    await act(async () => {
      fireEvent.change(inputElement, { target: { value: 'json' } });
    });
    let dropdownItems = screen.getAllByTestId(/dataformat-dropdownitem-.*/);
    expect(dropdownItems).toHaveLength(4);
    const clearButton = screen.getByLabelText('Clear input value');
    await act(async () => {
      fireEvent.click(clearButton);
    });
    dropdownItems = screen.getAllByTestId(/dataformat-dropdownitem-.*/);
    expect(dropdownItems.length).toBeGreaterThan(40);
    inputElement = screen.getAllByRole('combobox')[0];
    expect(inputElement).toHaveValue('');
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
