import type { MockInstance } from 'vitest';

import { CatalogKind } from '../../../catalog-kind';
import { EntityType } from '../../../entities';
import { KaotoSchemaDefinition } from '../../../kaoto-schema';
import { BaseVisualEntity, IVisualizationNode, IVisualizationNodeData } from '../../base-visual-entity';
import { createVisualizationNode } from '../../visualization-node';
import { NodeEnrichmentService } from './node-enrichment.service';
import { getIconRequest } from './resolvers/icon-resolver/getIconRequest';
import { getTitleRequest } from './resolvers/title-resolver/getTitleRequest';
import { getProcessorIconTooltipRequest } from './resolvers/tooltip-resolver/getProcessorIconTooltipRequest';
import { getTooltipRequest } from './resolvers/tooltip-resolver/getTooltipRequest';

vi.mock('./resolvers/icon-resolver/getIconRequest');
vi.mock('./resolvers/tooltip-resolver/getTooltipRequest');
vi.mock('./resolvers/tooltip-resolver/getProcessorIconTooltipRequest');
vi.mock('./resolvers/title-resolver/getTitleRequest');

describe('NodeEnrichmentService', () => {
  const mockGetIconRequest = vi.mocked(getIconRequest);
  const mockGetTooltipRequest = vi.mocked(getTooltipRequest);
  const mockGetProcessorIconTooltipRequest = vi.mocked(getProcessorIconTooltipRequest);
  const mockGetTitleRequest = vi.mocked(getTitleRequest);

  let consoleWarnSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  const createMockVizNode = (
    fetchSchemaImpl?: () => Promise<KaotoSchemaDefinition['schema'] | undefined>,
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

    // Mock fetchSchema method
    if (fetchSchemaImpl) {
      vizNode.fetchSchema = vi.fn(fetchSchemaImpl);
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

    mockGetIconRequest.mockResolvedValue({ icon: 'log-icon.svg', alt: 'Log icon' });
    mockGetTooltipRequest.mockResolvedValue('Logs messages to the console');
    mockGetProcessorIconTooltipRequest.mockResolvedValue('From: Consumes messages from an endpoint');
    mockGetTitleRequest.mockResolvedValue('Log EIP');

    const vizNode = createMockVizNode(async () => mockSchema);
    vizNode.data.secondaryNodeId = { catalogKind: CatalogKind.Component, name: 'log' };
    await enrichNode(vizNode);

    expect(vizNode.data.iconUrl).toBe('log-icon.svg');
    expect(vizNode.data.iconAlt).toBe('Log icon');
    expect(vizNode.data.description).toBe('Logs messages to the console');
    expect(vizNode.data.processorIconTooltip).toBe('From: Consumes messages from an endpoint');
    expect(vizNode.data.title).toBe('Log EIP');
    expect(vizNode.data.schema).toBe(mockSchema);
  });

  it('should handle all fetches failing gracefully', async () => {
    mockGetIconRequest.mockRejectedValue(new Error('Icon service down'));
    mockGetTooltipRequest.mockRejectedValue(new Error('Tooltip service down'));
    mockGetProcessorIconTooltipRequest.mockRejectedValue(new Error('Processor service down'));
    mockGetTitleRequest.mockRejectedValue(new Error('Title service down'));

    const vizNode = createMockVizNode(async () => {
      throw new Error('Schema service down');
    });
    vizNode.data.secondaryNodeId = { catalogKind: CatalogKind.Component, name: 'log' };
    await enrichNode(vizNode);

    expect(vizNode.data.iconUrl).toBe('');
    expect(vizNode.data.iconAlt).toBeUndefined();
    expect(vizNode.data.description).toBe('Logs messages');
    expect(vizNode.data.processorIconTooltip).toBeUndefined();
    expect(vizNode.data.title).toBe('');
    expect(vizNode.data.schema).toBeUndefined();
    expect(consoleWarnSpy).toHaveBeenCalledTimes(5);
  });

  it('should handle partial failures and still enrich successfully fetched data', async () => {
    const mockSchema: KaotoSchemaDefinition['schema'] = {
      type: 'object' as const,
      properties: {
        message: { type: 'string' as const },
      },
    };

    mockGetIconRequest.mockRejectedValue(new Error('Icon failed'));
    mockGetTooltipRequest.mockResolvedValue('Logs messages to the console');
    mockGetProcessorIconTooltipRequest.mockRejectedValue(new Error('Processor tooltip failed'));
    mockGetTitleRequest.mockResolvedValue('Log EIP');

    const vizNode = createMockVizNode(async () => mockSchema);
    vizNode.data.secondaryNodeId = { catalogKind: CatalogKind.Component, name: 'log' };
    await enrichNode(vizNode);

    expect(vizNode.data.iconUrl).toBe('');
    expect(vizNode.data.iconAlt).toBeUndefined();
    expect(vizNode.data.description).toBe('Logs messages to the console');
    expect(vizNode.data.processorIconTooltip).toBeUndefined();
    expect(vizNode.data.title).toBe('Log EIP');
    expect(vizNode.data.schema).toBe(mockSchema);
    expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
  });

  it('should pass processorName to getTitleRequest for Processor catalog kind', async () => {
    mockGetIconRequest.mockResolvedValue({ icon: 'when-icon.svg', alt: 'When icon' });
    mockGetTooltipRequest.mockResolvedValue('Conditional routing');
    mockGetProcessorIconTooltipRequest.mockResolvedValue('When: Routes based on condition');
    mockGetTitleRequest.mockResolvedValue('When EIP');

    const vizNode = createMockVizNode();
    // Set name to a condition expression (different from primaryNodeId.name)
    vizNode.data.name = "${header.foo} == 'bar'";
    vizNode.data.primaryNodeId = { catalogKind: CatalogKind.Pattern, name: 'when' };

    await enrichNode(vizNode);

    // Verify getTitleRequest was called with primaryNodeId.name, not name
    expect(mockGetTitleRequest).toHaveBeenCalledWith(CatalogKind.Pattern, 'when', undefined);
    expect(vizNode.data.title).toBe('When EIP');
  });

  it('should pass name to getTitleRequest for Component catalog kind', async () => {
    mockGetIconRequest.mockResolvedValue({ icon: 'timer-icon.svg', alt: 'Timer icon' });
    mockGetTooltipRequest.mockResolvedValue('Timer component');
    mockGetProcessorIconTooltipRequest.mockResolvedValue('From: Consumes messages');
    mockGetTitleRequest.mockResolvedValue('Timer');

    const vizNode = createMockVizNode();
    vizNode.data.name = 'timer';
    vizNode.data.primaryNodeId = { catalogKind: CatalogKind.Pattern, name: 'from' };
    vizNode.data.secondaryNodeId = { catalogKind: CatalogKind.Component, name: 'timer' };

    await enrichNode(vizNode);

    // Verify getTitleRequest was called with name (not primaryNodeId.name) for Component kind
    expect(mockGetTitleRequest).toHaveBeenCalledWith(CatalogKind.Component, 'timer', 'timer');
    expect(vizNode.data.title).toBe('Timer');
  });

  describe('Entity + from processor special handling', () => {
    it('should use tertiaryNodeId (Kamelet) when present on a from node', async () => {
      mockGetIconRequest.mockResolvedValue({ icon: 'beer-icon.svg', alt: 'Kamelet icon' });
      mockGetTooltipRequest.mockResolvedValue('Beer source kamelet');
      mockGetProcessorIconTooltipRequest.mockResolvedValue('');
      mockGetTitleRequest.mockResolvedValue('Beer Source');

      const vizNode = createMockVizNode();
      vizNode.data.name = 'beer-source';
      vizNode.data.primaryNodeId = { catalogKind: CatalogKind.Entity, name: 'from' };
      vizNode.data.secondaryNodeId = { catalogKind: CatalogKind.Component, name: 'kamelet' };
      vizNode.data.tertiaryNodeId = { catalogKind: CatalogKind.Kamelet, name: 'beer-source' };

      await enrichNode(vizNode);

      // deriveCatalogKind selects Kamelet; enrichment uses the kamelet name from node data
      expect(mockGetIconRequest).toHaveBeenCalledWith(CatalogKind.Kamelet, 'beer-source');
      expect(mockGetTooltipRequest).toHaveBeenCalledWith(CatalogKind.Kamelet, 'beer-source', expect.any(String));
      expect(mockGetTitleRequest).toHaveBeenCalledWith(CatalogKind.Kamelet, 'beer-source', 'kamelet');
      expect(vizNode.data.title).toBe('Beer Source');
    });

    it('should use secondaryNodeId (Component) when tertiaryNodeId is absent on a from node', async () => {
      mockGetIconRequest.mockResolvedValue({ icon: 'timer-icon.svg', alt: 'Component icon' });
      mockGetTooltipRequest.mockResolvedValue('Timer component');
      mockGetProcessorIconTooltipRequest.mockResolvedValue('');
      mockGetTitleRequest.mockResolvedValue('Timer');

      const vizNode = createMockVizNode();
      vizNode.data.name = 'timer';
      vizNode.data.primaryNodeId = { catalogKind: CatalogKind.Entity, name: 'from' };
      vizNode.data.secondaryNodeId = { catalogKind: CatalogKind.Component, name: 'timer' };
      vizNode.data.tertiaryNodeId = undefined;

      await enrichNode(vizNode);

      // Should resolve using secondaryNodeId (Component)
      expect(mockGetIconRequest).toHaveBeenCalledWith(CatalogKind.Component, 'timer');
      expect(mockGetTooltipRequest).toHaveBeenCalledWith(CatalogKind.Component, 'timer', expect.any(String));
      expect(mockGetTitleRequest).toHaveBeenCalledWith(CatalogKind.Component, 'timer', undefined);
      expect(vizNode.data.title).toBe('Timer');
    });

    it('should fall back to original name when neither secondaryNodeId nor tertiaryNodeId is set on a from node', async () => {
      mockGetIconRequest.mockResolvedValue({ icon: 'entity-icon.svg', alt: 'Entity icon' });
      mockGetTooltipRequest.mockResolvedValue('from processor');
      mockGetProcessorIconTooltipRequest.mockResolvedValue('');
      mockGetTitleRequest.mockResolvedValue('from');

      const vizNode = createMockVizNode();
      vizNode.data.name = 'from';
      vizNode.data.primaryNodeId = { catalogKind: CatalogKind.Entity, name: 'from' };
      vizNode.data.secondaryNodeId = undefined;
      vizNode.data.tertiaryNodeId = undefined;

      await enrichNode(vizNode);

      // Should keep Entity kind with original name
      expect(mockGetIconRequest).toHaveBeenCalledWith(CatalogKind.Entity, 'from');
      expect(mockGetTooltipRequest).toHaveBeenCalledWith(CatalogKind.Entity, 'from', expect.any(String));
      // titleIdentifier: Entity is not Processor/Pattern, so effectiveName ('from') is used
      expect(mockGetTitleRequest).toHaveBeenCalledWith(CatalogKind.Entity, 'from', undefined);
    });

    it('should not apply from-node special handling when processorName is not "from"', async () => {
      mockGetIconRequest.mockResolvedValue({ icon: 'route-icon.svg', alt: 'Entity icon' });
      mockGetTooltipRequest.mockResolvedValue('route entity');
      mockGetProcessorIconTooltipRequest.mockResolvedValue('');
      mockGetTitleRequest.mockResolvedValue('Route');

      const vizNode = createMockVizNode();
      vizNode.data.name = 'my-route';
      vizNode.data.primaryNodeId = { catalogKind: CatalogKind.Entity, name: 'route' };
      vizNode.data.secondaryNodeId = { catalogKind: CatalogKind.Component, name: 'timer' };

      await enrichNode(vizNode);

      // Should NOT redirect to the secondaryNodeId — stays with Entity kind and original name
      expect(mockGetIconRequest).toHaveBeenCalledWith(CatalogKind.Entity, 'my-route');
    });
  });

  it('should use processorName as titleIdentifier for Pattern catalog kind', async () => {
    mockGetIconRequest.mockResolvedValue({ icon: 'split-icon.svg', alt: 'Pattern icon' });
    mockGetTooltipRequest.mockResolvedValue('Split EIP');
    mockGetProcessorIconTooltipRequest.mockResolvedValue('');
    mockGetTitleRequest.mockResolvedValue('Split');

    const vizNode = createMockVizNode();
    vizNode.data.name = 'split-expression';
    vizNode.data.primaryNodeId = { catalogKind: CatalogKind.Pattern, name: 'split' };

    await enrichNode(vizNode);

    // Pattern kind → titleIdentifier must be processorName, not the node name
    expect(mockGetTitleRequest).toHaveBeenCalledWith(CatalogKind.Pattern, 'split', undefined);
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

    mockGetIconRequest.mockResolvedValue({ icon: 'kamelet-icon.svg', alt: 'Kamelet icon' });
    mockGetTooltipRequest.mockResolvedValue('Kamelet description');
    mockGetProcessorIconTooltipRequest.mockResolvedValue('');
    mockGetTitleRequest.mockResolvedValue('My Kamelet');

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

    mockGetIconRequest.mockResolvedValue({ icon: 'log-icon.svg', alt: 'Log icon' });
    mockGetTooltipRequest.mockResolvedValue('Logs messages');
    mockGetProcessorIconTooltipRequest.mockResolvedValue('');
    mockGetTitleRequest.mockResolvedValue('Log');

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
      mockGetIconRequest.mockResolvedValue({ icon: 'log-icon.svg', alt: 'Log icon' });
      mockGetTooltipRequest.mockResolvedValue('Logs messages');
      mockGetProcessorIconTooltipRequest.mockResolvedValue('Log processor');
      mockGetTitleRequest.mockResolvedValue('Log');

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
});
