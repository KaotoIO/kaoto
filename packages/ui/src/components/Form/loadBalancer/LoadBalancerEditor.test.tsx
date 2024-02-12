import * as catalogIndex from '@kaoto-next/camel-catalog/index.json';
import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { CatalogKind, ICamelLoadBalancerDefinition, KaotoSchemaDefinition } from '../../../models';
import { IVisualizationNode, VisualComponentSchema } from '../../../models/visualization/base-visual-entity';
import { CamelCatalogService } from '../../../models/visualization/flows';
import { MetadataEditor } from '../../MetadataEditor';
import { CanvasNode } from '../../Visualization/Canvas/canvas.models';
import { LoadBalancerEditor } from './LoadBalancerEditor';

describe('LoadBalancerEditor', () => {
  let mockNode: CanvasNode;
  let loadbalancerCatalog: Record<string, ICamelLoadBalancerDefinition>;
  beforeAll(async () => {
    loadbalancerCatalog = await import('@kaoto-next/camel-catalog/' + catalogIndex.catalogs.loadbalancers.file);
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

  it('should render', async () => {
    render(<LoadBalancerEditor selectedNode={mockNode} />);
    const launchExpressionModalBtn = screen.getAllByRole('button')[1];
    await act(async () => {
      fireEvent.click(launchExpressionModalBtn);
    });
    expect(screen.getByTestId('loadbalancer-dropdown')).toBeTruthy();
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
