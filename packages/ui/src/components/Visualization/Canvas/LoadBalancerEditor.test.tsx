import * as loadbalancerCatalog from '@kaoto-next/camel-catalog/camel-catalog-aggregate-loadbalancers.json';
import { fireEvent, render, screen } from '@testing-library/react';
import { CamelCatalogService } from '../../../models/visualization/flows';
import { CatalogKind, ICamelLoadBalancerDefinition } from '../../../models';
import { CanvasNode } from './canvas.models';
import { JSONSchemaType } from 'ajv';
import { IVisualizationNode, VisualComponentSchema } from '../../../models/visualization/base-visual-entity';
import { LoadBalancerEditor } from './LoadBalancerEditor';
import { MetadataEditor } from '../../MetadataEditor';

describe('LoadBalancerEditor', () => {
  let mockNode: CanvasNode;
  beforeAll(() => {
    /* eslint-disable  @typescript-eslint/no-explicit-any */
    delete (loadbalancerCatalog as any).default;
    CamelCatalogService.setCatalogKey(
      CatalogKind.Loadbalancer,
      loadbalancerCatalog as unknown as Record<string, ICamelLoadBalancerDefinition>,
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
    render(<LoadBalancerEditor selectedNode={mockNode} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]);
    const sticky = screen.getByTestId('loadbalancer-dropdownitem-sticky');
    fireEvent.click(sticky.getElementsByTagName('button')[0]);
    const form = screen.getByTestId('metadata-editor-form-loadbalancer');
    expect(form.innerHTML).toContain('The correlation expression');
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
