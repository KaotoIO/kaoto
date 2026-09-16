import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary, RouteDefinition } from '@kaoto/camel-catalog/types';
import { CanvasFormTabsContext, KaotoForm, KeyValue } from '@kaoto/forms';
import { KaotoFormPageObject } from '@kaoto/forms/testing';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { JSONSchema4 } from 'json-schema';
import { useState } from 'react';

import {
  CamelCatalogService,
  CamelRouteVisualEntity,
  CatalogKind,
  ICamelComponentDefinition,
  ICamelProcessorDefinition,
  IKameletDefinition,
} from '../../../../models';
import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { TestProvidersWrapper } from '../../../../stubs';
import { createMockEntitiesContext } from '../../../../stubs/create-mock-entities-context';
import { getFirstCatalogMap, setupDynamicCatalogRegistry } from '../../../../stubs/test-load-catalog';
import { ROOT_PATH } from '../../../../utils';
import { CanvasFormBody } from './CanvasFormBody';

describe('CanvasFormBody', () => {
  let componentCatalogMap: Record<string, ICamelComponentDefinition>;
  let patternCatalogMap: Record<string, ICamelProcessorDefinition>;
  let kameletCatalogMap: Record<string, IKameletDefinition>;

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    componentCatalogMap = catalogsMap.componentCatalogMap;
    patternCatalogMap = catalogsMap.patternCatalogMap;
    kameletCatalogMap = catalogsMap.kameletsCatalogMap;

    CamelCatalogService.setCatalogKey(CatalogKind.Component, componentCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Pattern, patternCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Kamelet, kameletCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Processor, catalogsMap.modelCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Language, catalogsMap.languageCatalog);
    CamelCatalogService.setCatalogKey(CatalogKind.Dataformat, catalogsMap.dataformatCatalog);
    CamelCatalogService.setCatalogKey(CatalogKind.Loadbalancer, catalogsMap.loadbalancerCatalog);
    CamelCatalogService.setCatalogKey(CatalogKind.Entity, catalogsMap.entitiesCatalog);

    setupDynamicCatalogRegistry(catalogsMap);
  });

  const createSetBodyNode = async (definition: Record<string, unknown>) => {
    const entity = new CamelRouteVisualEntity({
      route: {
        id: 'route',
        from: { uri: 'timer:test', steps: [{ setBody: definition }] },
      },
    });
    const root = await entity.toVizNode();
    const node = root.getChildren()![1];
    await node.fetchSchema();
    return node;
  };

  it('keeps AMQP endpoint fields visible while the source resource is replaced', async () => {
    const createContext = async (destinationName: string) => {
      const resource = new CamelRouteResource([
        {
          route: {
            id: 'route',
            from: {
              uri: 'timer:test',
              steps: [{ to: { uri: 'amqp', parameters: { destinationName, connectionFactory: '#factory' } } }],
            },
          },
        },
        { beans: [{ name: `factory-${destinationName}`, type: 'org.apache.qpid.jms.JmsConnectionFactory' }] },
      ]);
      const context = await createMockEntitiesContext(resource);
      const root = await context.visualEntities[0].toVizNode();
      return { context, node: root.getChildren()![1] };
    };
    const original = await createContext('before');
    const updated = await createContext('after');
    const { Provider } = await TestProvidersWrapper();
    const view = ({ context, node }: typeof original) => (
      <EntitiesContext.Provider value={context}>
        <CanvasFormTabsContext.Provider value={{ selectedTab: 'All', setSelectedTab: vi.fn() }}>
          <CanvasFormBody vizNode={node} />
        </CanvasFormTabsContext.Provider>
      </EntitiesContext.Provider>
    );
    // Resolve catalog-backed fields before observing a synchronous source refresh.
    // eslint-disable-next-line testing-library/no-unnecessary-act
    const { rerender } = await act(async () => render(view(original), { wrapper: Provider }));
    const destination = screen.getByRole('textbox', { name: 'Destination Name' });
    const connectionFactory = screen.getByRole('textbox', { name: 'Connection Factory' });
    connectionFactory.focus();

    rerender(view(updated));

    expect(screen.queryAllByLabelText('Loading')).toHaveLength(0);
    expect(connectionFactory).toBeVisible();
    expect(connectionFactory).toHaveFocus();
    expect(destination).toHaveValue('after');
    expect(updated.context.updateSourceCodeFromEntities).not.toHaveBeenCalled();
    fireEvent.click(connectionFactory);
    expect(await screen.findByRole('option', { name: 'option #factory-after' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'option #factory-before' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Connection Factory toggle' }));
    fireEvent.change(destination, { target: { value: 'edited' } });
    await waitFor(() => {
      expect(updated.node.data.definition).toMatchObject({ parameters: { destinationName: 'edited' } });
    });
    expect(original.node.data.definition).toMatchObject({ parameters: { destinationName: 'before' } });
  });

  it('updates a setBody expression from source without replacing its input', async () => {
    const originalNode = await createSetBodyNode({ simple: { expression: '${body}' } });
    const updatedNode = await createSetBodyNode({ simple: { expression: '${body.name}' } });
    const { Provider, updateSourceCodeFromEntitiesSpy } = await TestProvidersWrapper();
    // ExpressionField suspends while resolving its language catalog.
    // eslint-disable-next-line testing-library/no-unnecessary-act
    const { rerender } = await act(async () =>
      render(<CanvasFormBody vizNode={originalNode} />, { wrapper: Provider }),
    );
    const input = await screen.findByDisplayValue('${body}');
    input.focus();

    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      rerender(<CanvasFormBody vizNode={updatedNode} />);
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('${body.name}')).toBe(input);
    });
    expect(input).toHaveFocus();
    expect(updateSourceCodeFromEntitiesSpy).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '${body.updated}' } });
    await waitFor(() => {
      expect(updatedNode.data.definition).toMatchObject({ simple: { expression: '${body.updated}' } });
    });
    expect(originalNode.data.definition).toMatchObject({ simple: { expression: '${body}' } });
    expect(updateSourceCodeFromEntitiesSpy).toHaveBeenCalledTimes(1);
  });

  it('refreshes the expression language from source and edits the new language', async () => {
    const originalNode = await createSetBodyNode({ simple: '${body}' });
    const updatedNode = await createSetBodyNode({ expression: { constant: { expression: 'after' } } });
    const { Provider, updateSourceCodeFromEntitiesSpy } = await TestProvidersWrapper();
    // eslint-disable-next-line testing-library/no-unnecessary-act
    const { rerender } = await act(async () =>
      render(<CanvasFormBody vizNode={originalNode} />, { wrapper: Provider }),
    );
    await screen.findByDisplayValue('${body}');

    rerender(<CanvasFormBody vizNode={updatedNode} />);

    const input = await screen.findByDisplayValue('after');
    expect(screen.getByDisplayValue('Constant')).toBeInTheDocument();
    expect(updateSourceCodeFromEntitiesSpy).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'edited' } });
    await waitFor(() => {
      expect(updatedNode.data.definition).toMatchObject({ constant: { expression: 'edited' } });
    });

    // Clearing and selecting locally must still work after an external language change.
    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => fireEvent.click(screen.getByTestId('#__expression-list__clear')));
    await waitFor(() => {
      expect(screen.queryByDisplayValue('edited')).not.toBeInTheDocument();
    });
    const formPageObject = new KaotoFormPageObject(screen, act);
    await formPageObject.toggleExpressionFieldForProperty(ROOT_PATH);
    await formPageObject.selectTypeaheadItem('simple');
    await formPageObject.inputText('Expression', '${body.again}');
    expect(updatedNode.data.definition).toMatchObject({ simple: { expression: '${body.again}' } });
  });

  it('refreshes string values and RAW status without emitting a source change', () => {
    const schema: JSONSchema4 = {
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string', title: 'Name' } },
    };
    const onChange = vi.fn();
    const { rerender } = render(<KaotoForm schema={schema} model={{ name: 'before' }} onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: 'Name' });

    rerender(<KaotoForm schema={schema} model={{ name: 'RAW(after)' }} onChange={onChange} />);

    expect(input).toHaveValue('RAW(after)');
    expect(screen.getByText('raw')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'edited' } });
    expect(onChange).toHaveBeenLastCalledWith({ name: 'edited' });
    expect(screen.queryByText('raw')).not.toBeInTheDocument();

    rerender(<KaotoForm schema={schema} model={{ name: 'from-source' }} onChange={onChange} />);
    expect(input).toHaveValue('from-source');
    rerender(<KaotoForm schema={schema} model={{ name: 'edited' }} onChange={onChange} />);
    expect(input).toHaveValue('edited');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('refreshes map values while keeping local duplicate-key drafts editable', () => {
    const schema: JSONSchema4 = {
      type: 'object',
      required: ['parameters'],
      properties: { parameters: { type: 'object', title: 'Parameters' } },
    };
    const onChange = vi.fn();
    const { rerender } = render(
      <KaotoForm schema={schema} model={{ parameters: { first: 'before', second: 'kept' } }} onChange={onChange} />,
    );
    const input = screen.getByDisplayValue('before');

    rerender(
      <KaotoForm schema={schema} model={{ parameters: { first: 'after', second: 'kept' } }} onChange={onChange} />,
    );

    expect(input).toHaveValue('after');
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(screen.getByDisplayValue('second'), { target: { value: 'first' } });
    expect(screen.getAllByDisplayValue('first')).toHaveLength(2);
    fireEvent.change(screen.getAllByDisplayValue('first')[1], { target: { value: 'renamed' } });
    expect(onChange).toHaveBeenLastCalledWith({ parameters: { first: 'after', renamed: 'kept' } });

    rerender(
      <KaotoForm
        schema={schema}
        model={{ parameters: { first: 'from-source', renamed: 'kept' } }}
        onChange={onChange}
      />,
    );
    expect(input).toHaveValue('from-source');
    rerender(
      <KaotoForm schema={schema} model={{ parameters: { first: 'after', renamed: 'kept' } }} onChange={onChange} />,
    );
    expect(input).toHaveValue('after');
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('preserves numeric drafts while accepting external number changes', () => {
    const schema: JSONSchema4 = {
      type: 'object',
      required: ['amount'],
      properties: { amount: { type: 'number', title: 'Amount' } },
    };
    const onChange = vi.fn();
    const { rerender } = render(<KaotoForm schema={schema} model={{ amount: 1 }} onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: 'Amount' });
    fireEvent.change(input, { target: { value: '2.' } });
    fireEvent.change(input, { target: { value: '2.0' } });
    expect(input).toHaveValue('2.0');
    fireEvent.change(input, { target: { value: '2.05' } });
    expect(onChange).toHaveBeenLastCalledWith({ amount: 2.05 });

    rerender(<KaotoForm schema={schema} model={{ amount: 3 }} onChange={onChange} />);
    expect(input).toHaveValue('3');
    rerender(<KaotoForm schema={schema} model={{ amount: Number.NaN }} onChange={onChange} />);
    // PatternFly displays NaN as empty; the form must remain mounted and editable.
    expect(input).toHaveValue('');
    fireEvent.change(input, { target: { value: '4' } });
    expect(onChange).toHaveBeenLastCalledWith({ amount: 4 });
  });

  it('keeps duplicate-key drafts when the parent reconstructs the emitted map', () => {
    const ControlledMap = () => {
      const [model, setModel] = useState<Record<string, string>>({ first: 'one', second: 'two' });
      return (
        <KeyValue
          propName="parameters"
          initialModel={model}
          onChange={(next) => {
            setModel({ ...next });
          }}
        />
      );
    };
    render(<ControlledMap />);
    fireEvent.change(screen.getByDisplayValue('second'), { target: { value: 'first' } });
    expect(screen.getAllByDisplayValue('first')).toHaveLength(2);
    fireEvent.change(screen.getAllByDisplayValue('first')[1], { target: { value: 'renamed' } });
    expect(screen.getByDisplayValue('one')).toBeInTheDocument();
    expect(screen.getByDisplayValue('two')).toBeInTheDocument();
  });

  it('notifies both form callbacks when a parent immediately applies a property edit', () => {
    const schema: JSONSchema4 = {
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string', title: 'Name' } },
    };
    const onChange = vi.fn();
    const ControlledForm = () => {
      const [model, setModel] = useState({ name: 'before' });
      return (
        <KaotoForm
          schema={schema}
          model={model}
          onChange={onChange}
          onChangeProp={(_path, value) => {
            setModel({ name: String(value) });
          }}
        />
      );
    };
    render(<ControlledForm />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'edited' } });
    expect(onChange).toHaveBeenCalledExactlyOnceWith({ name: 'edited' });
  });

  describe('should persists changes from both expression editor and main form', () => {
    beforeEach(async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('expression => main form', async () => {
      const camelRoute = {
        from: {
          uri: 'timer',
          parameters: {
            timerName: 'tutorial',
          },
          steps: [
            {
              setHeader: {
                name: 'foo',
              },
            },
          ],
        },
      } as RouteDefinition;
      const entity = new CamelRouteVisualEntity(camelRoute);
      const rootNode: IVisualizationNode = await entity.toVizNode();
      const setHeaderNode = rootNode.getChildren()![1];
      await setHeaderNode.fetchSchema();

      const { Provider } = await TestProvidersWrapper();

      render(
        <EntitiesContext.Provider value={null}>
          <Provider>
            <CanvasFormTabsContext.Provider
              value={{
                selectedTab: 'All',
                setSelectedTab: vi.fn(),
              }}
            >
              <CanvasFormBody vizNode={setHeaderNode} />
            </CanvasFormTabsContext.Provider>
          </Provider>
        </EntitiesContext.Provider>,
      );

      await screen.findByRole('button', { name: 'All' });
      const formPageObject = new KaotoFormPageObject(screen, act);
      await formPageObject.showAllFields();
      await formPageObject.toggleExpressionFieldForProperty(ROOT_PATH);
      await formPageObject.selectTypeaheadItem('simple');
      await formPageObject.inputText('Expression', '${header.foo}');

      expect((camelRoute.from.steps[0].setHeader!.simple as { expression: string }).expression).toBe('${header.foo}');
      expect(camelRoute.from.steps[0].setHeader!.name).toBe('foo');

      await formPageObject.inputText('Name', 'bar');

      expect((camelRoute.from.steps[0].setHeader!.simple as { expression: string }).expression).toBe('${header.foo}');
      expect(camelRoute.from.steps[0].setHeader!.name).toBe('bar');
    });

    it('main form => expression', async () => {
      const camelRoute = {
        from: {
          uri: 'timer',
          parameters: {
            timerName: 'tutorial',
          },
          steps: [
            {
              setHeader: {
                name: 'foo',
              },
            },
          ],
        },
      } as RouteDefinition;
      const entity = new CamelRouteVisualEntity(camelRoute);
      const rootNode: IVisualizationNode = await entity.toVizNode();
      const setHeaderNode = rootNode.getChildren()![1];
      await setHeaderNode.fetchSchema();

      const { Provider } = await TestProvidersWrapper();

      render(
        <EntitiesContext.Provider value={null}>
          <Provider>
            <CanvasFormTabsContext.Provider
              value={{
                selectedTab: 'All',
                setSelectedTab: vi.fn(),
              }}
            >
              <CanvasFormBody vizNode={setHeaderNode} />
            </CanvasFormTabsContext.Provider>
          </Provider>
        </EntitiesContext.Provider>,
      );

      await screen.findByRole('button', { name: 'All' });
      const formPageObject = new KaotoFormPageObject(screen, act);
      await formPageObject.showAllFields();
      await formPageObject.inputText('Name', 'bar');

      expect(camelRoute.from.steps[0].setHeader!.simple).toBeUndefined();
      expect(camelRoute.from.steps[0].setHeader!.name).toBe('bar');

      await formPageObject.toggleExpressionFieldForProperty(ROOT_PATH);
      await formPageObject.selectTypeaheadItem('simple');
      await formPageObject.inputText('Expression', '${header.foo}');

      expect((camelRoute.from.steps[0].setHeader!.simple as { expression: string }).expression).toBe('${header.foo}');
      expect(camelRoute.from.steps[0].setHeader!.name).toBe('bar');
    });
  });

  describe('should persists changes from both dataformat editor and main form', () => {
    beforeEach(async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('dataformat => main form', async () => {
      const camelRoute = {
        from: {
          uri: 'timer',
          parameters: {
            timerName: 'tutorial',
          },
          steps: [
            {
              marshal: {
                id: 'ms',
              },
            },
          ],
        },
      } as RouteDefinition;
      const entity = new CamelRouteVisualEntity(camelRoute);
      const rootNode: IVisualizationNode = await entity.toVizNode();
      const marshalNode = rootNode.getChildren()![1];
      await marshalNode.fetchSchema();

      const { Provider } = await TestProvidersWrapper();

      render(
        <EntitiesContext.Provider value={null}>
          <Provider>
            <CanvasFormTabsContext.Provider
              value={{
                selectedTab: 'All',
                setSelectedTab: vi.fn(),
              }}
            >
              <CanvasFormBody vizNode={marshalNode} />
            </CanvasFormTabsContext.Provider>
          </Provider>
        </EntitiesContext.Provider>,
      );

      await screen.findByRole('button', { name: 'All' });
      const formPageObject = new KaotoFormPageObject(screen, act);
      await formPageObject.showAllFields();
      await formPageObject.toggleOneOfFieldForProperty(ROOT_PATH);
      await formPageObject.selectTypeaheadItem('avro');

      await formPageObject.inputText('Id', 'avro-id', { index: 1 });

      expect((camelRoute.from.steps[0].marshal!.avro as { id: string }).id).toBe('avro-id');
      expect(camelRoute.from.steps[0].marshal!.id).toBe('ms');

      await formPageObject.inputText('Id', 'modified', { index: 0 });
      expect(camelRoute.from.steps[0].marshal!.id).toBe('modified');
    });

    it('main form => dataformat', async () => {
      const camelRoute = {
        from: {
          uri: 'timer',
          parameters: {
            timerName: 'tutorial',
          },
          steps: [
            {
              marshal: {
                id: 'ms',
              },
            },
          ],
        },
      } as RouteDefinition;
      const entity = new CamelRouteVisualEntity(camelRoute);
      const rootNode: IVisualizationNode = await entity.toVizNode();
      const marshalNode = rootNode.getChildren()![1];
      await marshalNode.fetchSchema();

      const { Provider } = await TestProvidersWrapper();

      render(
        <EntitiesContext.Provider value={null}>
          <Provider>
            <CanvasFormTabsContext.Provider
              value={{
                selectedTab: 'All',
                setSelectedTab: vi.fn(),
              }}
            >
              <CanvasFormBody vizNode={marshalNode} />
            </CanvasFormTabsContext.Provider>
          </Provider>
        </EntitiesContext.Provider>,
      );

      await screen.findByRole('button', { name: 'All' });
      const formPageObject = new KaotoFormPageObject(screen, act);
      await formPageObject.showAllFields();
      await formPageObject.inputText('Id', 'modified', { index: 0 });
      expect(camelRoute.from.steps[0].marshal!.id).toBe('modified');

      await formPageObject.toggleOneOfFieldForProperty(ROOT_PATH);
      await formPageObject.selectTypeaheadItem('avro');
      await formPageObject.inputText('Id', 'avro-id', { index: 1 });

      expect((camelRoute.from.steps[0].marshal!.avro as { id: string }).id).toBe('avro-id');
      expect(camelRoute.from.steps[0].marshal!.id).toBe('modified');
    });
  });

  describe('should persists changes from both loadbalancer editor and main form', () => {
    beforeEach(async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('loadbalancer => main form', async () => {
      const camelRoute = {
        from: {
          uri: 'timer',
          parameters: {
            timerName: 'tutorial',
          },
          steps: [
            {
              loadBalance: {
                id: 'lb',
              },
            },
          ],
        },
      } as RouteDefinition;
      const entity = new CamelRouteVisualEntity(camelRoute);
      const rootNode: IVisualizationNode = await entity.toVizNode();
      const loadBalanceNode = rootNode.getChildren()![1];
      await loadBalanceNode.fetchSchema();

      const { Provider } = await TestProvidersWrapper();

      render(
        <EntitiesContext.Provider value={null}>
          <Provider>
            <CanvasFormTabsContext.Provider
              value={{
                selectedTab: 'All',
                setSelectedTab: vi.fn(),
              }}
            >
              <CanvasFormBody vizNode={loadBalanceNode} />
            </CanvasFormTabsContext.Provider>
          </Provider>
        </EntitiesContext.Provider>,
      );

      await screen.findByRole('button', { name: 'All' });
      const formPageObject = new KaotoFormPageObject(screen, act);
      await formPageObject.showAllFields();
      await formPageObject.toggleOneOfFieldForProperty(ROOT_PATH);
      await formPageObject.selectTypeaheadItem('weighted load balancer');

      await formPageObject.inputText('Distribution Ratio', '3.5');
      expect(
        (camelRoute.from.steps[0].loadBalance!.weightedLoadBalancer as { distributionRatio: string }).distributionRatio,
      ).toBe('3.5');
      expect(camelRoute.from.steps[0].loadBalance!.id).toBe('lb');

      await formPageObject.inputText('Id', 'modified', { index: 0 });
      expect(
        (camelRoute.from.steps[0].loadBalance!.weightedLoadBalancer as { distributionRatio: string }).distributionRatio,
      ).toBe('3.5');
      expect(camelRoute.from.steps[0].loadBalance!.id).toBe('modified');
    });

    it('main form => loadbalancer', async () => {
      const camelRoute = {
        from: {
          uri: 'timer',
          parameters: {
            timerName: 'tutorial',
          },
          steps: [
            {
              loadBalance: {
                id: 'lb',
              },
            },
          ],
        },
      } as RouteDefinition;
      const entity = new CamelRouteVisualEntity(camelRoute);
      const rootNode: IVisualizationNode = await entity.toVizNode();
      const loadBalanceNode = rootNode.getChildren()![1];
      await loadBalanceNode.fetchSchema();

      const { Provider } = await TestProvidersWrapper();

      render(
        <EntitiesContext.Provider value={null}>
          <Provider>
            <CanvasFormTabsContext.Provider
              value={{
                selectedTab: 'All',
                setSelectedTab: vi.fn(),
              }}
            >
              <CanvasFormBody vizNode={loadBalanceNode} />
            </CanvasFormTabsContext.Provider>
          </Provider>
        </EntitiesContext.Provider>,
      );

      await screen.findByRole('button', { name: 'All' });
      const formPageObject = new KaotoFormPageObject(screen, act);
      await formPageObject.showAllFields();
      await formPageObject.inputText('Id', 'modified', { index: 0 });
      expect(camelRoute.from.steps[0].loadBalance!.id).toBe('modified');

      await formPageObject.toggleOneOfFieldForProperty(ROOT_PATH);
      await formPageObject.selectTypeaheadItem('weighted load balancer');

      await formPageObject.inputText('Distribution Ratio', '3.5');
      expect(
        (camelRoute.from.steps[0].loadBalance!.weightedLoadBalancer as { distributionRatio: string }).distributionRatio,
      ).toBe('3.5');
      expect(camelRoute.from.steps[0].loadBalance!.id).toBe('modified');
    });
  });

  it('should show suggestions', async () => {
    const { Provider, camelResource } = await TestProvidersWrapper();
    const vizNode = await camelResource.getVisualEntities()[0].toVizNode();
    vizNode.data.schema = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          title: 'Name',
        },
      },
    };
    vizNode.data.definition = { name: 'test-component' };

    const wrapper = render(
      <Provider>
        <CanvasFormTabsContext.Provider
          value={{
            selectedTab: 'All',
            setSelectedTab: vi.fn(),
          }}
        >
          <CanvasFormBody vizNode={vizNode} />
        </CanvasFormTabsContext.Provider>
      </Provider>,
    );

    const formPageObject = new KaotoFormPageObject(screen, act);
    await waitFor(() => {
      expect(formPageObject.getFieldByDisplayName('Name')).not.toBeNull();
    });
    const inputField = formPageObject.getFieldByDisplayName('Name')!;

    fireEvent.focus(inputField);
    fireEvent.keyDown(inputField, { ctrlKey: true, code: 'Space' });

    await waitFor(() => {
      expect(wrapper.getByTestId('suggestions-menu')).toBeInTheDocument();
    });
  });
});
