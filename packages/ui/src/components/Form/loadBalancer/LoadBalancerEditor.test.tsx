import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { CatalogKind, ICamelLoadBalancerDefinition, KaotoSchemaDefinition } from '../../../models';
import { IVisualizationNode, VisualComponentSchema } from '../../../models/visualization/base-visual-entity';
import { CamelCatalogService } from '../../../models/visualization/flows';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { MetadataEditor } from '../../MetadataEditor';
import { CanvasNode } from '../../Visualization/Canvas/canvas.models';
import { LoadBalancerEditor } from './LoadBalancerEditor';

describe('LoadBalancerEditor', () => {
  let mockNode: CanvasNode;
  let loadbalancerCatalog: Record<string, ICamelLoadBalancerDefinition>;
  beforeEach(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    loadbalancerCatalog = catalogsMap.loadbalancerCatalog;
    CamelCatalogService.setCatalogKey(CatalogKind.Loadbalancer, loadbalancerCatalog);

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
          getComponentSchema: () => {
            return { ...visualComponentSchema };
          },
          updateModel: (_value: unknown) => {},
        } as IVisualizationNode,
      },
    };
  });

  it('should render', async () => {
    render(<LoadBalancerEditor selectedNode={mockNode} />);
    const buttons = screen.getAllByRole('button', { name: 'Menu toggle' });
    await act(async () => {
      fireEvent.click(buttons[0]);
    });
    const failover = screen.getByTestId('loadbalancer-dropdownitem-failoverLoadBalancer');
    await act(async () => {
      fireEvent.click(failover.getElementsByTagName('button')[0]);
    });
    const form = screen.getByTestId('metadata-editor-form-loadbalancer');
    expect(form.innerHTML).toContain('Maximum Failover Attempts');
  });

  it('should filter candidates with a text input', async () => {
    render(<LoadBalancerEditor selectedNode={mockNode} />);
    const buttons = screen.getAllByRole('button', { name: 'Menu toggle' });
    await act(async () => {
      fireEvent.click(buttons[0]);
    });
    let dropdownItems = screen.queryAllByTestId(/loadbalancer-dropdownitem-.*/);
    expect(dropdownItems.length).toBeGreaterThan(6);
    const inputElement = screen.getAllByRole('combobox')[0];
    await act(async () => {
      fireEvent.change(inputElement, { target: { value: 'round' } });
    });
    dropdownItems = screen.getAllByTestId(/loadbalancer-dropdownitem-.*/);
    expect(dropdownItems).toHaveLength(1);
  });

  it('should clear filter and close the dropdown with close button', async () => {
    render(<LoadBalancerEditor selectedNode={mockNode} />);
    const buttons = screen.getAllByRole('button', { name: 'Menu toggle' });
    await act(async () => {
      fireEvent.click(buttons[0]);
    });
    let inputElement = screen.getAllByRole('combobox')[0];
    await act(async () => {
      fireEvent.change(inputElement, { target: { value: 'round' } });
    });
    let dropdownItems = screen.getAllByTestId(/loadbalancer-dropdownitem-.*/);
    expect(dropdownItems).toHaveLength(1);
    const clearButton = screen.getByLabelText('Clear input value');
    await act(async () => {
      fireEvent.click(clearButton);
    });
    dropdownItems = screen.queryAllByTestId(/loadbalancer-dropdownitem-.*/);
    expect(dropdownItems.length).toBeGreaterThan(6);
    inputElement = screen.getAllByRole('combobox')[0];
    expect(inputElement).toHaveValue('');
  });

  it('should render for all loadbalancers without an error', () => {
    Object.entries(loadbalancerCatalog).forEach(([name, loadbalancer]) => {
      try {
        if (name === 'default') return;
        expect(loadbalancer).toBeDefined();
        /* eslint-disable  @typescript-eslint/no-explicit-any */
        const schema = (loadbalancer as any).propertiesSchema;
        render(
          <MetadataEditor
            data-testid="loadbalancer-editor"
            name={'loadbalancer'}
            schema={schema}
            metadata={{}}
            onChangeModel={() => {}}
          />,
        );
      } catch (e) {
        /* eslint-disable  @typescript-eslint/no-explicit-any */
        throw new Error(`Error rendering ${name} loadbalancer: ${(e as any).message}`);
      }
    });
  });
});
