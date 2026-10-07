import { CatalogKind } from '@kaoto/editor-api';
import type { MockInstance } from 'vitest';

import { EntityType } from '../../../entities';
import { KaotoSchemaDefinition } from '../../../kaoto-schema';
import { BaseVisualEntity, IVisualizationNode, IVisualizationNodeData } from '../../base-visual-entity';
import { createVisualizationNode } from '../../visualization-node';
import { NodeEnrichmentService } from './node-enrichment.service';
import { NodeIconResolver } from './resolvers/icon-resolver/node-icon-resolver';
import { NodeTitleResolver } from './resolvers/title-resolver/node-title-resolver';
import { NodeTooltipResolver } from './resolvers/tooltip-resolver/node-tooltip-resolver';
import { ProcessorIconTooltipResolver } from './resolvers/tooltip-resolver/processor-icon-tooltip-resolver';

describe('NodeEnrichmentService', () => {
  let mockGetIcon: MockInstance<typeof NodeIconResolver.getIcon>;
  let mockGetEntityTooltip: MockInstance<typeof NodeTooltipResolver.getEntityTooltip>;
  let mockGetKameletTooltip: MockInstance<typeof NodeTooltipResolver.getKameletTooltip>;
  let mockGetComponentTooltip: MockInstance<typeof NodeTooltipResolver.getComponentTooltip>;
  let mockGetProcessorTooltip: MockInstance<typeof NodeTooltipResolver.getProcessorTooltip>;
  let mockGetTestActionTooltip: MockInstance<typeof NodeTooltipResolver.getTestActionTooltip>;
  let mockGetProcessorIconTooltip: MockInstance<typeof ProcessorIconTooltipResolver.getProcessorIconTooltip>;
  let mockGetEntityTitle: MockInstance<typeof NodeTitleResolver.getEntityTitle>;
  let mockGetKameletTitle: MockInstance<typeof NodeTitleResolver.getKameletTitle>;
  let mockGetComponentTitle: MockInstance<typeof NodeTitleResolver.getComponentTitle>;
  let mockGetProcessorTitle: MockInstance<typeof NodeTitleResolver.getProcessorTitle>;
  let mockGetTestActionTitle: MockInstance<typeof NodeTitleResolver.getTestActionTitle>;

  /**
   * Makes the catalog resolvers return the given values, whatever the catalog kind they are asked for
   */
  const resolveCatalogData = ({
    icon,
    tooltip,
    processorIconTooltip,
    title,
  }: {
    icon: string;
    tooltip: string;
    processorIconTooltip: string;
    title: string;
  }) => {
    mockGetIcon.mockResolvedValue(icon);
    [
      mockGetEntityTooltip,
      mockGetKameletTooltip,
      mockGetComponentTooltip,
      mockGetProcessorTooltip,
      mockGetTestActionTooltip,
    ].forEach((mock) => mock.mockResolvedValue(tooltip));
    mockGetProcessorIconTooltip.mockResolvedValue(processorIconTooltip);
    [
      mockGetEntityTitle,
      mockGetKameletTitle,
      mockGetComponentTitle,
      mockGetProcessorTitle,
      mockGetTestActionTitle,
    ].forEach((mock) => mock.mockResolvedValue(title));
  };

  let consoleWarnSpy: MockInstance;

  beforeEach(() => {
    mockGetIcon = vi.spyOn(NodeIconResolver, 'getIcon').mockResolvedValue('');
    mockGetEntityTooltip = vi.spyOn(NodeTooltipResolver, 'getEntityTooltip').mockResolvedValue('');
    mockGetKameletTooltip = vi.spyOn(NodeTooltipResolver, 'getKameletTooltip').mockResolvedValue('');
    mockGetComponentTooltip = vi.spyOn(NodeTooltipResolver, 'getComponentTooltip').mockResolvedValue('');
    mockGetProcessorTooltip = vi.spyOn(NodeTooltipResolver, 'getProcessorTooltip').mockResolvedValue('');
    mockGetTestActionTooltip = vi.spyOn(NodeTooltipResolver, 'getTestActionTooltip').mockResolvedValue('');
    mockGetProcessorIconTooltip = vi
      .spyOn(ProcessorIconTooltipResolver, 'getProcessorIconTooltip')
      .mockResolvedValue(undefined);
    mockGetEntityTitle = vi.spyOn(NodeTitleResolver, 'getEntityTitle').mockResolvedValue('');
    mockGetKameletTitle = vi.spyOn(NodeTitleResolver, 'getKameletTitle').mockResolvedValue('');
    mockGetComponentTitle = vi.spyOn(NodeTitleResolver, 'getComponentTitle').mockResolvedValue('');
    mockGetProcessorTitle = vi.spyOn(NodeTitleResolver, 'getProcessorTitle').mockResolvedValue('');
    mockGetTestActionTitle = vi.spyOn(NodeTitleResolver, 'getTestActionTitle').mockResolvedValue('');
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  const createMockVizNode = (
    fetchSchemaImpl?: () => Promise<KaotoSchemaDefinition['schema'] | undefined>,
    fetchNodeDefinitionImpl?: () => Promise<unknown>,
  ): IVisualizationNode<IVisualizationNodeData> => {
    const data = {
      name: 'log',
      description: 'Logs messages',
      primaryNodeId: { catalogKind: CatalogKind.Pattern, name: 'from' },
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
    } as unknown as IVisualizationNodeData;
    const vizNode = createVisualizationNode('test-node', data);

    if (fetchSchemaImpl) {
      vizNode.fetchSchema = vi.fn(fetchSchemaImpl);
    }
    if (fetchNodeDefinitionImpl) {
      vizNode.fetchNodeDefinition = vi.fn(fetchNodeDefinitionImpl);
    }

    return vizNode;
  };

  const enrichNode = async (vizNode: IVisualizationNode): Promise<void> => {
    await NodeEnrichmentService.enrichVisualizationTree(vizNode);
  };

  it('should enrich node with all catalog data on success', async () => {
    const mockSchema: KaotoSchemaDefinition['schema'] = {
      type: 'object' as const,
      properties: {
        message: { type: 'string' as const },
      },
    };

    resolveCatalogData({
      icon: 'log-icon.svg',
      tooltip: 'Logs messages to the console',
      processorIconTooltip: 'From: Consumes messages from an endpoint',
      title: 'Log EIP',
    });

    const vizNode = createMockVizNode(async () => mockSchema);
    vizNode.data.secondaryNodeId = { catalogKind: CatalogKind.Component, name: 'log' };
    await enrichNode(vizNode);

    expect(vizNode.data.iconUrl).toBe('log-icon.svg');
    expect(vizNode.data.iconAlt).toBe('component icon');
    expect(vizNode.data.description).toBe('log: Logs messages to the console');
    expect(vizNode.data.processorIconTooltip).toBe('From: Consumes messages from an endpoint');
    expect(vizNode.data.title).toBe('Log EIP');
    expect(vizNode.data.schema).toBe(mockSchema);
  });

  it('should handle all fetches failing gracefully', async () => {
    mockGetIcon.mockRejectedValue(new Error('Icon service down'));
    mockGetComponentTooltip.mockRejectedValue(new Error('Tooltip service down'));
    mockGetProcessorIconTooltip.mockRejectedValue(new Error('Processor service down'));
    mockGetComponentTitle.mockRejectedValue(new Error('Title service down'));

    const vizNode = createMockVizNode(
      async () => {
        throw new Error('Schema service down');
      },
      async () => {
        throw new Error('Definition service down');
      },
    );
    vizNode.data.secondaryNodeId = { catalogKind: CatalogKind.Component, name: 'log' };
    await enrichNode(vizNode);

    expect(vizNode.data.iconUrl).toBe('');
    expect(vizNode.data.iconAlt).toBeUndefined();
    expect(vizNode.data.description).toBe('Logs messages');
    expect(vizNode.data.processorIconTooltip).toBeUndefined();
    expect(vizNode.data.title).toBe('');
    expect(vizNode.data.schema).toBeUndefined();
    expect(consoleWarnSpy).toHaveBeenCalledTimes(6);
  });

  it('should handle partial failures and still enrich successfully fetched data', async () => {
    const mockSchema: KaotoSchemaDefinition['schema'] = {
      type: 'object' as const,
      properties: {
        message: { type: 'string' as const },
      },
    };

    mockGetIcon.mockRejectedValue(new Error('Icon failed'));
    mockGetComponentTooltip.mockResolvedValue('Logs messages to the console');
    mockGetProcessorIconTooltip.mockRejectedValue(new Error('Processor tooltip failed'));
    mockGetComponentTitle.mockResolvedValue('Log EIP');

    const vizNode = createMockVizNode(async () => mockSchema);
    vizNode.data.secondaryNodeId = { catalogKind: CatalogKind.Component, name: 'log' };
    await enrichNode(vizNode);

    expect(vizNode.data.iconUrl).toBe('');
    expect(vizNode.data.iconAlt).toBeUndefined();
    expect(vizNode.data.description).toBe('log: Logs messages to the console');
    expect(vizNode.data.processorIconTooltip).toBeUndefined();
    expect(vizNode.data.title).toBe('Log EIP');
    expect(vizNode.data.schema).toBe(mockSchema);
    expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
  });

  it('should pass processorName to getTitleRequest for Processor catalog kind', async () => {
    resolveCatalogData({
      icon: 'when-icon.svg',
      tooltip: 'Conditional routing',
      processorIconTooltip: 'When: Routes based on condition',
      title: 'When EIP',
    });

    const vizNode = createMockVizNode();
    // Set name to a condition expression (different from primaryNodeId.name)
    vizNode.data.name = "${header.foo} == 'bar'";
    vizNode.data.primaryNodeId = { catalogKind: CatalogKind.Pattern, name: 'when' };

    await enrichNode(vizNode);

    // Verify the title was resolved with primaryNodeId.name, not name
    expect(mockGetProcessorTitle).toHaveBeenCalledWith('when', CatalogKind.Pattern, undefined);
    expect(vizNode.data.title).toBe('When EIP');
  });

  it('should pass name to getTitleRequest for Component catalog kind', async () => {
    resolveCatalogData({
      icon: 'timer-icon.svg',
      tooltip: 'Timer component',
      processorIconTooltip: 'From: Consumes messages',
      title: 'Timer',
    });

    const vizNode = createMockVizNode();
    vizNode.data.name = 'timer';
    vizNode.data.primaryNodeId = { catalogKind: CatalogKind.Pattern, name: 'from' };
    vizNode.data.secondaryNodeId = { catalogKind: CatalogKind.Component, name: 'timer' };

    await enrichNode(vizNode);

    // Verify the title was resolved with name (not primaryNodeId.name) for Component kind
    expect(mockGetComponentTitle).toHaveBeenCalledWith('timer');
    expect(vizNode.data.title).toBe('Timer');
  });

  describe('Entity + from processor special handling', () => {
    it('should use tertiaryNodeId (Kamelet) when present on a from node', async () => {
      resolveCatalogData({
        icon: 'beer-icon.svg',
        tooltip: 'Beer source kamelet',
        processorIconTooltip: '',
        title: 'Beer Source',
      });

      const vizNode = createMockVizNode();
      vizNode.data.name = 'beer-source';
      vizNode.data.primaryNodeId = { catalogKind: CatalogKind.Entity, name: 'from' };
      vizNode.data.secondaryNodeId = { catalogKind: CatalogKind.Component, name: 'kamelet' };
      vizNode.data.tertiaryNodeId = { catalogKind: CatalogKind.Kamelet, name: 'beer-source' };

      await enrichNode(vizNode);

      // deriveCatalogKind selects Kamelet; enrichment uses the kamelet name from node data
      expect(mockGetIcon).toHaveBeenCalledWith('kamelet:beer-source', CatalogKind.Kamelet);
      expect(mockGetKameletTooltip).toHaveBeenCalledWith('beer-source');
      expect(mockGetKameletTitle).toHaveBeenCalledWith('beer-source');
      expect(vizNode.data.title).toBe('Beer Source');
    });

    it('should use secondaryNodeId (Component) when tertiaryNodeId is absent on a from node', async () => {
      resolveCatalogData({
        icon: 'timer-icon.svg',
        tooltip: 'Timer component',
        processorIconTooltip: '',
        title: 'Timer',
      });

      const vizNode = createMockVizNode();
      vizNode.data.name = 'timer';
      vizNode.data.primaryNodeId = { catalogKind: CatalogKind.Entity, name: 'from' };
      vizNode.data.secondaryNodeId = { catalogKind: CatalogKind.Component, name: 'timer' };
      vizNode.data.tertiaryNodeId = undefined;

      await enrichNode(vizNode);

      // Should resolve using secondaryNodeId (Component)
      expect(mockGetIcon).toHaveBeenCalledWith('timer', CatalogKind.Component);
      expect(mockGetComponentTooltip).toHaveBeenCalledWith('timer');
      expect(mockGetComponentTitle).toHaveBeenCalledWith('timer');
      expect(vizNode.data.title).toBe('Timer');
    });

    it('should fall back to original name when neither secondaryNodeId nor tertiaryNodeId is set on a from node', async () => {
      resolveCatalogData({
        icon: 'entity-icon.svg',
        tooltip: 'from processor',
        processorIconTooltip: '',
        title: 'from',
      });

      const vizNode = createMockVizNode();
      vizNode.data.name = 'from';
      vizNode.data.primaryNodeId = { catalogKind: CatalogKind.Entity, name: 'from' };
      vizNode.data.secondaryNodeId = undefined;
      vizNode.data.tertiaryNodeId = undefined;

      await enrichNode(vizNode);

      // Should keep Entity kind with original name
      expect(mockGetIcon).toHaveBeenCalledWith('from', CatalogKind.Entity);
      expect(mockGetEntityTooltip).toHaveBeenCalledWith('from');
      // titleIdentifier: Entity is not Processor/Pattern, so effectiveName ('from') is used
      expect(mockGetEntityTitle).toHaveBeenCalledWith('from');
    });

    it('should not apply from-node special handling when processorName is not "from"', async () => {
      resolveCatalogData({
        icon: 'route-icon.svg',
        tooltip: 'route entity',
        processorIconTooltip: '',
        title: 'Route',
      });

      const vizNode = createMockVizNode();
      vizNode.data.name = 'my-route';
      vizNode.data.primaryNodeId = { catalogKind: CatalogKind.Entity, name: 'route' };
      vizNode.data.secondaryNodeId = { catalogKind: CatalogKind.Component, name: 'timer' };

      await enrichNode(vizNode);

      // Should NOT redirect to the secondaryNodeId — stays with Entity kind and original name
      expect(mockGetIcon).toHaveBeenCalledWith('my-route', CatalogKind.Entity);
    });
  });

  it('should use processorName as titleIdentifier for Pattern catalog kind', async () => {
    resolveCatalogData({
      icon: 'split-icon.svg',
      tooltip: 'Split EIP',
      processorIconTooltip: '',
      title: 'Split',
    });

    const vizNode = createMockVizNode();
    vizNode.data.name = 'split-expression';
    vizNode.data.primaryNodeId = { catalogKind: CatalogKind.Pattern, name: 'split' };

    await enrichNode(vizNode);

    // Pattern kind → titleIdentifier must be processorName, not the node name
    expect(mockGetProcessorTitle).toHaveBeenCalledWith('split', CatalogKind.Pattern, undefined);
    expect(vizNode.data.title).toBe('Split');
  });

  it('should enrich schema for Kamelet root nodes', async () => {
    const rootSchema: KaotoSchemaDefinition['schema'] = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        metadata: { type: 'object' as const },
      },
    };

    resolveCatalogData({
      icon: 'kamelet-icon.svg',
      tooltip: 'Kamelet description',
      processorIconTooltip: '',
      title: 'My Kamelet',
    });

    const vizNode = createVisualizationNode('test-kamelet', {
      name: 'test-kamelet',
      path: 'template',
      entity: {} as BaseVisualEntity,
      processorName: 'route',
      isPlaceholder: false,
      isGroup: true,
      iconUrl: '',
      title: '',
      description: '',
      primaryNodeId: { catalogKind: CatalogKind.Entity, name: 'route' },
    } as unknown as IVisualizationNodeData);

    vizNode.fetchSchema = vi.fn(async () => rootSchema);

    await enrichNode(vizNode);

    expect(vizNode.fetchSchema).toHaveBeenCalled();
    expect(vizNode.data.schema).toBe(rootSchema);
  });

  it('should enrich schema for non-root nodes', async () => {
    const standardSchema: KaotoSchemaDefinition['schema'] = {
      type: 'object' as const,
      properties: {
        uri: { type: 'string' as const },
      },
    };

    resolveCatalogData({
      icon: 'log-icon.svg',
      tooltip: 'Logs messages',
      processorIconTooltip: '',
      title: 'Log',
    });

    const vizNode = createVisualizationNode('test-child', {
      name: 'log',
      path: 'template.from.steps.0.log', // Not a root path
      entity: {} as BaseVisualEntity,
      processorName: 'log',
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
      primaryNodeId: { catalogKind: CatalogKind.Pattern, name: 'log' },
    } as unknown as IVisualizationNodeData);

    vizNode.fetchSchema = vi.fn(async () => standardSchema);

    await enrichNode(vizNode);

    expect(vizNode.fetchSchema).toHaveBeenCalled();
    expect(vizNode.data.schema).toBe(standardSchema);
  });

  describe('deriveCatalogKind', () => {
    it('should derive Kamelet when a tertiary kamelet identity is present', () => {
      const vizNode = createMockVizNode();
      vizNode.data.primaryNodeId = { catalogKind: CatalogKind.Pattern, name: 'to' };
      vizNode.data.secondaryNodeId = { catalogKind: CatalogKind.Component, name: 'kamelet' };
      vizNode.data.tertiaryNodeId = { catalogKind: CatalogKind.Kamelet, name: 'my-kamelet' };

      expect(NodeEnrichmentService.deriveCatalogKind(vizNode)).toBe(CatalogKind.Kamelet);
    });

    it('should derive Entity for entity nodes such as from and route', () => {
      const vizNode = createMockVizNode();
      vizNode.data.primaryNodeId = { catalogKind: CatalogKind.Entity, name: 'from' };
      vizNode.data.secondaryNodeId = { catalogKind: CatalogKind.Component, name: 'timer' };

      expect(NodeEnrichmentService.deriveCatalogKind(vizNode)).toBe(CatalogKind.Entity);
    });

    it('should derive Component for endpoint steps with a secondary component identity', () => {
      const vizNode = createMockVizNode();
      vizNode.data.primaryNodeId = { catalogKind: CatalogKind.Pattern, name: 'to' };
      vizNode.data.secondaryNodeId = { catalogKind: CatalogKind.Component, name: 'github' };

      expect(NodeEnrichmentService.deriveCatalogKind(vizNode)).toBe(CatalogKind.Component);
    });

    it('should derive Pattern for processor-only steps', () => {
      const vizNode = createMockVizNode();
      vizNode.data.primaryNodeId = { catalogKind: CatalogKind.Pattern, name: 'log' };

      expect(NodeEnrichmentService.deriveCatalogKind(vizNode)).toBe(CatalogKind.Pattern);
    });

    it('should derive TestAction for citrus action nodes', () => {
      const vizNode = createMockVizNode();
      vizNode.data.primaryNodeId = { catalogKind: CatalogKind.TestAction, name: 'print' };

      expect(NodeEnrichmentService.deriveCatalogKind(vizNode)).toBe(CatalogKind.TestAction);
    });

    it('should derive TestAction for the citrus test root node', () => {
      const vizNode = createMockVizNode();
      vizNode.data.primaryNodeId = { catalogKind: CatalogKind.Entity, name: EntityType.Test };

      expect(NodeEnrichmentService.deriveCatalogKind(vizNode)).toBe(CatalogKind.TestAction);
    });
  });

  describe('enrichVisualizationTree', () => {
    it('should enrich linked child nodes and skip placeholders', async () => {
      const mockSchema: KaotoSchemaDefinition['schema'] = { type: 'object' as const };
      resolveCatalogData({
        icon: 'log-icon.svg',
        tooltip: 'Logs messages',
        processorIconTooltip: 'Log processor',
        title: 'Log',
      });

      const root = createVisualizationNode('route', {
        name: 'route',
        path: 'route',
        entity: {} as BaseVisualEntity,
        isPlaceholder: false,
        isGroup: true,
        iconUrl: '',
        title: '',
        description: '',
        primaryNodeId: { catalogKind: CatalogKind.Entity, name: 'route' },
      } as unknown as IVisualizationNodeData);

      const child = createVisualizationNode('route.from.steps.0.log', {
        name: 'log',
        path: 'route.from.steps.0.log',
        isPlaceholder: false,
        isGroup: false,
        iconUrl: '',
        title: '',
        description: '',
        primaryNodeId: { catalogKind: CatalogKind.Pattern, name: 'log' },
      } as unknown as IVisualizationNodeData);
      child.fetchSchema = vi.fn(async () => mockSchema);

      const placeholder = createVisualizationNode('route.from.steps.1.placeholder', {
        name: 'placeholder',
        path: 'route.from.steps.1.placeholder',
        isPlaceholder: true,
        isGroup: false,
        iconUrl: '',
        title: '',
        description: '',
        primaryNodeId: { catalogKind: CatalogKind.Pattern, name: 'placeholder' },
      } as unknown as IVisualizationNodeData);

      root.addChild(child);
      root.addChild(placeholder);
      child.setPreviousNode(root);
      root.setNextNode(child);

      await NodeEnrichmentService.enrichVisualizationTree(root);

      expect(root.data.title).toBe('Log');
      expect(child.data.schema).toBe(mockSchema);
      expect(placeholder.data.iconUrl).toBe('');
    });
  });

  it('should populate vizNode.data.definition after enrichment', async () => {
    const expectedDefinition = { uri: 'timer', parameters: { timerName: 'tick' } };

    resolveCatalogData({
      icon: 'timer-icon.svg',
      tooltip: 'Timer component',
      processorIconTooltip: '',
      title: 'Timer',
    });

    const vizNode = createMockVizNode(
      async () => undefined,
      async () => expectedDefinition,
    );
    vizNode.data.primaryNodeId = { catalogKind: CatalogKind.Pattern, name: 'from' };
    vizNode.data.secondaryNodeId = { catalogKind: CatalogKind.Component, name: 'timer' };

    await enrichNode(vizNode);

    expect(vizNode.data.definition).toBe(expectedDefinition);
  });
});
