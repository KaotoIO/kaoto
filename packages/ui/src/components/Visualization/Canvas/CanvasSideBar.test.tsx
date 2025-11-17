import { CanvasFormTabsProvider } from '@kaoto/forms';
import { act, fireEvent, render } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import { CamelRouteResource } from '../../../models/camel';
import { EntityType } from '../../../models/camel/entities';
import { mockRandomValues } from '../../../stubs';
import { TestProvidersWrapper } from '../../../stubs/TestProvidersWrapper';
import { CanvasNode } from './canvas.models';
import { CanvasSideBar } from './CanvasSideBar';
import { FlowService } from './flow.service';

describe('CanvasSideBar', () => {
  let selectedNode: CanvasNode;
  let Provider: FunctionComponent<PropsWithChildren>;

  beforeAll(() => {
    mockRandomValues();
    const camelResource = new CamelRouteResource();
    camelResource.addNewEntity(EntityType.Route);
    const visualEntity = camelResource.getVisualEntities()[0];
    selectedNode = FlowService.getFlowDiagram('test', visualEntity.toVizNode()).nodes[0];
    Provider = TestProvidersWrapper({ camelResource }).Provider;
  });

  it('does not render anything if there is no selectedNode', () => {
    const wrapper = render(
      <CanvasFormTabsProvider>
        <CanvasSideBar selectedNode={undefined} onClose={() => {}} />
      </CanvasFormTabsProvider>,
    );

    expect(wrapper.container).toBeEmptyDOMElement();
  });

  it('displays selected node information', () => {
    const wrapper = render(
      <Provider>
        <CanvasFormTabsProvider>
          <CanvasSideBar selectedNode={selectedNode} onClose={() => {}} />
        </CanvasFormTabsProvider>
      </Provider>,
    );

    expect(wrapper.asFragment()).toMatchSnapshot();
  });

  it('should propagate onClose callback', () => {
    const onCloseSpy = jest.fn();

    const wrapper = render(
      <Provider>
        <CanvasFormTabsProvider>
          <CanvasSideBar selectedNode={selectedNode} onClose={onCloseSpy} />
        </CanvasFormTabsProvider>
      </Provider>,
    );

    act(() => {
      const closeButton = wrapper.getByTestId('close-side-bar');
      fireEvent.click(closeButton);
    });

    expect(onCloseSpy).toHaveBeenCalledTimes(1);
  });
});
