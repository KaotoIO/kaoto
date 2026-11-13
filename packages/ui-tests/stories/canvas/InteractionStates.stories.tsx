import { SuggestionRegistryProvider } from '@kaoto/forms';
import {
  buildDesignerCanvasModel,
  CamelRouteVisualEntity,
  Canvas,
  CatalogLoaderProvider,
  CatalogSchemaLoader,
  CatalogTilesProvider,
  ControllerService,
  EntitiesProvider,
  KaotoResourceProvider,
  RuntimeProvider,
  SchemasLoaderProvider,
  SourceCodeSync,
  useVisibleVizNodes,
  VisibleFlowsProvider,
} from '@kaoto/kaoto/testing';
import { VisualizationProvider } from '@patternfly/react-topology';
import { Meta, StoryFn, StoryObj } from '@storybook/react';
import { useMemo } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

/** One disabled step (processor + disabled badges) and one choice, collapsed in the collapsed-group stories. */
const route = new CamelRouteVisualEntity({
  route: {
    id: 'interaction-states',
    from: {
      uri: 'timer:tick',
      steps: [
        { log: { id: 'log-step', message: '${body}', disabled: true } },
        {
          choice: {
            id: 'choice-step',
            when: [{ expression: { simple: { expression: '${body}' } }, steps: [{ log: { message: 'when' } }] }],
            otherwise: { steps: [{ log: { message: 'otherwise' } }] },
          },
        },
      ],
    },
  },
});

const CanvasFromEntity: StoryFn = () => {
  const entities = useMemo(() => [route], []);
  const visibleFlows = useMemo(() => ({ [route.id]: true }), []);
  const { vizNodes, isResolving } = useVisibleVizNodes(entities, visibleFlows);
  const { nodes, edges } = useMemo(() => buildDesignerCanvasModel(vizNodes), [vizNodes]);

  return (
    <Canvas
      nodes={nodes}
      edges={edges}
      entitiesCount={1}
      visibleEntitiesCount={vizNodes.length}
      isModelResolving={isResolving}
    />
  );
};

const ContextDecorator = (Story: StoryFn) => {
  const controller = useMemo(() => ControllerService.createController(), []);

  return (
    <SourceCodeSync>
      <KaotoResourceProvider>
        <RuntimeProvider
          catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}
          runtimeCatalogName=""
          testingCatalogName=""
        >
          <SchemasLoaderProvider>
            <CatalogLoaderProvider>
              <EntitiesProvider>
                <CatalogTilesProvider>
                  <VisibleFlowsProvider>
                    <SuggestionRegistryProvider>
                      <VisualizationProvider controller={controller}>
                        <Story />
                      </VisualizationProvider>
                    </SuggestionRegistryProvider>
                  </VisibleFlowsProvider>
                </CatalogTilesProvider>
              </EntitiesProvider>
            </CatalogLoaderProvider>
          </SchemasLoaderProvider>
        </RuntimeProvider>
      </KaotoResourceProvider>
    </SourceCodeSync>
  );
};

export default {
  title: 'Canvas/Interaction states',
  component: Canvas,
  decorators: [ContextDecorator],
} as Meta<typeof Canvas>;

type Story = StoryObj<typeof Canvas>;

// Catalog loading and canvas layout can exceed the default query timeout in CI.
const TIMEOUT = { timeout: 15000 };

const COLLAPSED_ID = 'custom-node__route.from.steps.1.choice';
const EXPANDED_ID = 'custom-group__route.from.steps.1.choice';

const findStep = async (canvasElement: HTMLElement) => {
  const step = await within(canvasElement).findByTestId('custom-node__route.from.steps.0.log', undefined, TIMEOUT);
  return step as unknown as SVGGElement;
};

const toggleCollapse = async (canvasElement: HTMLElement, group: HTMLElement) => {
  await userEvent.hover(group);
  const body = within(canvasElement.ownerDocument.body);
  await userEvent.click(await body.findByTestId('choice|step-toolbar-button-collapse', undefined, TIMEOUT));
  await userEvent.unhover(group);
};

/**
 * Collapses the choice through its hover toolbar, like a user does, and returns the collapsed node.
 * An already collapsed choice (restored collapse state) is used as is.
 */
const findCollapsedGroup = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);
  await findStep(canvasElement);
  if (!canvas.queryByTestId(COLLAPSED_ID)) {
    await toggleCollapse(canvasElement, await canvas.findByTestId(EXPANDED_ID, undefined, TIMEOUT));
  }
  return (await canvas.findByTestId(COLLAPSED_ID, undefined, TIMEOUT)) as unknown as SVGGElement;
};

/** Returns the expanded choice, expanding it through its hover toolbar when a collapse state was restored. */
const findExpandedGroup = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);
  await findStep(canvasElement);
  const collapsed = canvas.queryByTestId(COLLAPSED_ID);
  if (collapsed) {
    await toggleCollapse(canvasElement, collapsed);
  }
  return (await canvas.findByTestId(EXPANDED_ID, undefined, TIMEOUT)) as unknown as SVGGElement;
};

const hover = async (node: SVGGElement) => {
  await userEvent.hover(node);
  // The toolbar opens after the 200 ms hover delay.
  await waitFor(() => expect(node).toHaveAttribute('data-toolbar-open', 'true'), { timeout: 2000 });
};

const select = async (node: SVGGElement) => {
  await userEvent.click(node);
  await waitFor(() => expect(node).toHaveAttribute('data-selected', 'true'));
};

/** The hover toolbar closes after the pointer leaves, so snapshots do not catch it half open. */
const waitForToolbarClosed = async (node: SVGGElement) => {
  await waitFor(() => expect(node).toHaveAttribute('data-toolbar-open', 'false'), { timeout: 2000 });
};

/** Clicking selects a node without giving it keyboard focus. */
const expectSelectedWithoutFocus = async (node: SVGGElement) => {
  await expect(node.ownerDocument.activeElement).not.toBe(node);
  await waitForToolbarClosed(node);
};

/** Keyboard focus, as arrow-key navigation does. */
const focus = async (node: SVGGElement) => {
  node.focus();
  await expect(node.ownerDocument.activeElement).toBe(node);
};

const expectIndicator = async (node: SVGGElement, block = 'custom-node') => {
  await expect(node.querySelector(`rect.${block}__indicator`)).toBeInTheDocument();
};

export const StepDefault: Story = {
  render: CanvasFromEntity,
  play: async ({ canvasElement }) => {
    const step = await findStep(canvasElement);
    await expectIndicator(step);
    await expect(step).toHaveAttribute('data-disabled', 'true');
    await expect(step).toHaveAttribute('data-selected', 'false');
    await expect(step).toHaveAttribute('data-toolbar-open', 'false');
  },
};

export const StepHover: Story = {
  render: CanvasFromEntity,
  play: async ({ canvasElement }) => {
    const step = await findStep(canvasElement);
    await hover(step);
    await expect(step).toHaveAttribute('data-selected', 'false');
  },
};

export const StepSelected: Story = {
  render: CanvasFromEntity,
  play: async ({ canvasElement }) => {
    const step = await findStep(canvasElement);
    await select(step);
    await userEvent.unhover(step);
    await expectSelectedWithoutFocus(step);
  },
};

export const StepFocused: Story = {
  render: CanvasFromEntity,
  play: async ({ canvasElement }) => {
    const step = await findStep(canvasElement);
    await focus(step);
    await expect(step).toHaveAttribute('data-selected', 'false');
  },
};

export const StepSelectedFocused: Story = {
  render: CanvasFromEntity,
  play: async ({ canvasElement }) => {
    const step = await findStep(canvasElement);
    await select(step);
    await userEvent.unhover(step);
    await focus(step);
    await expect(step).toHaveAttribute('data-selected', 'true');
  },
};

export const CollapsedGroupDefault: Story = {
  render: CanvasFromEntity,
  play: async ({ canvasElement }) => {
    const group = await findCollapsedGroup(canvasElement);
    await waitForToolbarClosed(group);
    await expectIndicator(group);
    await expect(group).toHaveAttribute('data-selected', 'false');
  },
};

export const CollapsedGroupHover: Story = {
  render: CanvasFromEntity,
  play: async ({ canvasElement }) => {
    const group = await findCollapsedGroup(canvasElement);
    await hover(group);
  },
};

export const CollapsedGroupSelected: Story = {
  render: CanvasFromEntity,
  play: async ({ canvasElement }) => {
    const group = await findCollapsedGroup(canvasElement);
    await select(group);
    await userEvent.unhover(group);
    await expectSelectedWithoutFocus(group);
  },
};

export const CollapsedGroupFocused: Story = {
  render: CanvasFromEntity,
  play: async ({ canvasElement }) => {
    const group = await findCollapsedGroup(canvasElement);
    await focus(group);
    await expect(group).toHaveAttribute('data-selected', 'false');
  },
};

export const CollapsedGroupSelectedFocused: Story = {
  render: CanvasFromEntity,
  play: async ({ canvasElement }) => {
    const group = await findCollapsedGroup(canvasElement);
    await select(group);
    await userEvent.unhover(group);
    await focus(group);
    await expect(group).toHaveAttribute('data-selected', 'true');
  },
};

export const ExpandedGroupDefault: Story = {
  render: CanvasFromEntity,
  play: async ({ canvasElement }) => {
    const group = await findExpandedGroup(canvasElement);
    await waitForToolbarClosed(group);
    await expectIndicator(group, 'custom-group');
    await expect(group).toHaveAttribute('data-selected', 'false');
  },
};

export const ExpandedGroupHover: Story = {
  render: CanvasFromEntity,
  play: async ({ canvasElement }) => {
    const group = await findExpandedGroup(canvasElement);
    await hover(group);
  },
};

export const ExpandedGroupSelected: Story = {
  render: CanvasFromEntity,
  play: async ({ canvasElement }) => {
    const group = await findExpandedGroup(canvasElement);
    await select(group);
    await userEvent.unhover(group);
    await expectSelectedWithoutFocus(group);
  },
};

export const ExpandedGroupFocused: Story = {
  render: CanvasFromEntity,
  play: async ({ canvasElement }) => {
    const group = await findExpandedGroup(canvasElement);
    await focus(group);
    await expect(group).toHaveAttribute('data-selected', 'false');
  },
};

export const ExpandedGroupSelectedFocused: Story = {
  render: CanvasFromEntity,
  play: async ({ canvasElement }) => {
    const group = await findExpandedGroup(canvasElement);
    await select(group);
    await userEvent.unhover(group);
    await focus(group);
    await expect(group).toHaveAttribute('data-selected', 'true');
  },
};
