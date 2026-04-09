import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';

import { CamelRouteVisualEntity, createVisualizationNode, IVisualizationNode } from '../../models';
import { TestProvidersWrapper } from '../../stubs';
import { GroupAutoStartupSwitch } from './GroupAutoStartupSwitch';

describe('GroupAutoStartupSwitch', () => {
  it('should return null when vizNode is undefined', () => {
    const { Provider } = TestProvidersWrapper();
    const { container } = render(
      <Provider>
        <GroupAutoStartupSwitch />
      </Provider>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('should return null when entity is undefined', () => {
    const vizNode = createVisualizationNode('test-node', {
      name: 'route',
      path: 'route',
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    });

    const { Provider } = TestProvidersWrapper();
    const { container } = render(
      <Provider>
        <GroupAutoStartupSwitch vizNode={vizNode} />
      </Provider>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render switch as checked when autoStartup is enabled (undefined)', () => {
    const entity = new CamelRouteVisualEntity({
      route: { from: { uri: 'direct:test', steps: [] } },
    });

    const vizNode = createVisualizationNode('route-1', {
      name: 'route',
      path: 'route',
      entity,
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    }) as IVisualizationNode;

    const { Provider } = TestProvidersWrapper();

    render(
      <Provider>
        <GroupAutoStartupSwitch vizNode={vizNode} />
      </Provider>,
    );

    const switchElement = screen.getByRole('switch', { name: 'Auto Startup' });
    expect(switchElement).toBeInTheDocument();
    expect(switchElement).toBeChecked();

    const containerDiv = screen.getByTitle('Auto Startup Enabled');
    expect(containerDiv).toBeInTheDocument();
  });

  it('should render switch as unchecked when autoStartup is false', () => {
    const entity = new CamelRouteVisualEntity({
      route: { from: { uri: 'direct:test', steps: [] }, autoStartup: false },
    });

    const vizNode = createVisualizationNode('route-1', {
      name: 'route',
      path: 'route',
      entity,
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    }) as IVisualizationNode;

    const { Provider } = TestProvidersWrapper();

    render(
      <Provider>
        <GroupAutoStartupSwitch vizNode={vizNode} />
      </Provider>,
    );

    const switchElement = screen.getByRole('switch', { name: 'Auto Startup' });
    expect(switchElement).toBeInTheDocument();
    expect(switchElement).not.toBeChecked();

    const containerDiv = screen.getByTitle('Auto Startup Disabled');
    expect(containerDiv).toBeInTheDocument();
  });

  it('should toggle autoStartup from undefined to false', async () => {
    const user = userEvent.setup();
    const entity = new CamelRouteVisualEntity({
      route: { from: { uri: 'direct:test', steps: [] } },
    });

    const vizNode = createVisualizationNode('route-1', {
      name: 'route',
      path: 'route',
      entity,
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    }) as IVisualizationNode;

    const updateModelSpy = jest.spyOn(vizNode, 'updateModel');
    const { Provider, updateEntitiesFromCamelResourceSpy } = TestProvidersWrapper();

    render(
      <Provider>
        <GroupAutoStartupSwitch vizNode={vizNode} />
      </Provider>,
    );

    const switchElement = screen.getByRole('switch', { name: 'Auto Startup' });
    expect(switchElement).toBeChecked();

    await act(async () => {
      await user.click(switchElement);
    });

    expect(updateModelSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        autoStartup: false,
      }),
    );
    expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalled();
  });

  it('should toggle autoStartup from false to undefined (remove property)', async () => {
    const user = userEvent.setup();
    const entity = new CamelRouteVisualEntity({
      route: { from: { uri: 'direct:test', steps: [] }, autoStartup: false },
    });

    const vizNode = createVisualizationNode('route-1', {
      name: 'route',
      path: 'route',
      entity,
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    }) as IVisualizationNode;

    const updateModelSpy = jest.spyOn(vizNode, 'updateModel');
    const { Provider, updateEntitiesFromCamelResourceSpy } = TestProvidersWrapper();

    render(
      <Provider>
        <GroupAutoStartupSwitch vizNode={vizNode} />
      </Provider>,
    );

    const switchElement = screen.getByRole('switch', { name: 'Auto Startup' });
    expect(switchElement).not.toBeChecked();

    await act(async () => {
      await user.click(switchElement);
    });

    const callArg = updateModelSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(callArg).not.toHaveProperty('autoStartup');
    expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalled();
  });

  it('should not toggle when autoStartup is a string value', async () => {
    const user = userEvent.setup();
    const entity = new CamelRouteVisualEntity({
      route: { from: { uri: 'direct:test', steps: [] }, autoStartup: 'true' as unknown as boolean },
    });

    const vizNode = createVisualizationNode('route-1', {
      name: 'route',
      path: 'route',
      entity,
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    }) as IVisualizationNode;

    const updateModelSpy = jest.spyOn(vizNode, 'updateModel');
    const { Provider, updateEntitiesFromCamelResourceSpy } = TestProvidersWrapper();

    render(
      <Provider>
        <GroupAutoStartupSwitch vizNode={vizNode} />
      </Provider>,
    );

    const switchElement = screen.getByRole('switch', { name: 'Auto Startup' });
    expect(switchElement).toBeChecked();

    await act(async () => {
      await user.click(switchElement);
    });

    expect(updateModelSpy).not.toHaveBeenCalled();
    expect(updateEntitiesFromCamelResourceSpy).not.toHaveBeenCalled();
  });

  it('should not toggle when autoStartup is a placeholder', async () => {
    const user = userEvent.setup();
    const entity = new CamelRouteVisualEntity({
      route: { from: { uri: 'direct:test', steps: [] }, autoStartup: '{{autoStartup}}' as unknown as boolean },
    });

    const vizNode = createVisualizationNode('route-1', {
      name: 'route',
      path: 'route',
      entity,
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    }) as IVisualizationNode;

    const updateModelSpy = jest.spyOn(vizNode, 'updateModel');
    const { Provider, updateEntitiesFromCamelResourceSpy } = TestProvidersWrapper();

    render(
      <Provider>
        <GroupAutoStartupSwitch vizNode={vizNode} />
      </Provider>,
    );

    const switchElement = screen.getByRole('switch', { name: 'Auto Startup' });
    expect(switchElement).toBeChecked();

    await act(async () => {
      await user.click(switchElement);
    });

    expect(updateModelSpy).not.toHaveBeenCalled();
    expect(updateEntitiesFromCamelResourceSpy).not.toHaveBeenCalled();
  });

  it('should preserve other route properties when toggling', async () => {
    const user = userEvent.setup();
    const entity = new CamelRouteVisualEntity({
      route: {
        id: 'my-route',
        description: 'Test route',
        from: { uri: 'direct:test', steps: [] },
        autoStartup: true,
      },
    });

    const vizNode = createVisualizationNode('route-1', {
      name: 'route',
      path: 'route',
      entity,
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    }) as IVisualizationNode;

    const updateModelSpy = jest.spyOn(vizNode, 'updateModel');
    const { Provider } = TestProvidersWrapper();

    render(
      <Provider>
        <GroupAutoStartupSwitch vizNode={vizNode} />
      </Provider>,
    );

    const switchElement = screen.getByRole('switch', { name: 'Auto Startup' });

    await act(async () => {
      await user.click(switchElement);
    });

    expect(updateModelSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'my-route',
        description: 'Test route',
        from: { uri: 'direct:test', steps: [] },
        autoStartup: false,
      }),
    );
  });
});
