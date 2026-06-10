import { MockInstance, vi } from 'vitest';

import { CatalogKind } from '../../../catalog-kind';
import { KaotoSchemaDefinition } from '../../../kaoto-schema';
import { BaseVisualEntity, IVisualizationNode } from '../../base-visual-entity';
import { createVisualizationNode } from '../../visualization-node';
import { CamelRouteVisualEntityData } from '../support/camel-component-types';
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
  ): IVisualizationNode<CamelRouteVisualEntityData> => {
    const data = {
      name: 'log',
      description: 'Logs messages',
      processorName: 'from',
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
    } as unknown as CamelRouteVisualEntityData;
    const vizNode = createVisualizationNode('test-node', data);

    // Mock fetchSchema method
    if (fetchSchemaImpl) {
      vizNode.fetchSchema = vi.fn(fetchSchemaImpl);
    }

    return vizNode;
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
    await NodeEnrichmentService.enrichNodeFromCatalog(vizNode, CatalogKind.Component);

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
    await NodeEnrichmentService.enrichNodeFromCatalog(vizNode, CatalogKind.Component);

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
    await NodeEnrichmentService.enrichNodeFromCatalog(vizNode, CatalogKind.Component);

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
    // Set name to a condition expression (different from processorName)
    vizNode.data.name = "${header.foo} == 'bar'";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (vizNode.data as any).processorName = 'when';

    await NodeEnrichmentService.enrichNodeFromCatalog(vizNode, CatalogKind.Processor);

    // Verify getTitleRequest was called with processorName, not name
    expect(mockGetTitleRequest).toHaveBeenCalledWith(CatalogKind.Processor, 'when', undefined);
    expect(vizNode.data.title).toBe('When EIP');
  });

  it('should pass name to getTitleRequest for Component catalog kind', async () => {
    mockGetIconRequest.mockResolvedValue({ icon: 'timer-icon.svg', alt: 'Timer icon' });
    mockGetTooltipRequest.mockResolvedValue('Timer component');
    mockGetProcessorIconTooltipRequest.mockResolvedValue('From: Consumes messages');
    mockGetTitleRequest.mockResolvedValue('Timer');

    const vizNode = createMockVizNode();
    vizNode.data.name = 'timer';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (vizNode.data as any).processorName = 'from';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (vizNode.data as any).componentName = 'timer';

    await NodeEnrichmentService.enrichNodeFromCatalog(vizNode, CatalogKind.Component);

    // Verify getTitleRequest was called with name (not processorName) for Component kind
    expect(mockGetTitleRequest).toHaveBeenCalledWith(CatalogKind.Component, 'timer', 'timer');
    expect(vizNode.data.title).toBe('Timer');
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
    } as unknown as CamelRouteVisualEntityData);

    vizNode.fetchSchema = vi.fn(async () => rootSchema);

    await NodeEnrichmentService.enrichNodeFromCatalog(vizNode, CatalogKind.Entity);

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
    } as unknown as CamelRouteVisualEntityData);

    vizNode.fetchSchema = vi.fn(async () => standardSchema);

    await NodeEnrichmentService.enrichNodeFromCatalog(vizNode, CatalogKind.Processor);

    expect(vizNode.fetchSchema).toHaveBeenCalled();
    expect(vizNode.data.schema).toBe(standardSchema);
  });
});
