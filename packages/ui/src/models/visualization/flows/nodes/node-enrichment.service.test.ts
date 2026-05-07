import { CatalogKind } from '../../../catalog-kind';
import { IVisualizationNode } from '../../base-visual-entity';
import { createVisualizationNode } from '../../visualization-node';
import { CamelRouteVisualEntityData } from '../support/camel-component-types';
import { NodeEnrichmentService } from './node-enrichment.service';
import { getIconRequest } from './resolvers/icon-resolver/getIconRequest';
import { getTitleRequest } from './resolvers/title-resolver/getTitleRequest';
import { getProcessorIconTooltipRequest } from './resolvers/tooltip-resolver/getProcessorIconTooltipRequest';
import { getTooltipRequest } from './resolvers/tooltip-resolver/getTooltipRequest';

jest.mock('./resolvers/icon-resolver/getIconRequest');
jest.mock('./resolvers/tooltip-resolver/getTooltipRequest');
jest.mock('./resolvers/tooltip-resolver/getProcessorIconTooltipRequest');
jest.mock('./resolvers/title-resolver/getTitleRequest');

describe('NodeEnrichmentService', () => {
  const mockGetIconRequest = jest.mocked(getIconRequest);
  const mockGetTooltipRequest = jest.mocked(getTooltipRequest);
  const mockGetProcessorIconTooltipRequest = jest.mocked(getProcessorIconTooltipRequest);
  const mockGetTitleRequest = jest.mocked(getTitleRequest);

  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  const createMockVizNode = (): IVisualizationNode<CamelRouteVisualEntityData> => {
    const data = {
      name: 'log',
      description: 'Logs messages',
      processorName: 'from',
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
    } as unknown as CamelRouteVisualEntityData;
    return createVisualizationNode('test-node', data);
  };

  it('should enrich node with all catalog data on success', async () => {
    mockGetIconRequest.mockResolvedValue({ icon: 'log-icon.svg', alt: 'Log icon' });
    mockGetTooltipRequest.mockResolvedValue('Logs messages to the console');
    mockGetProcessorIconTooltipRequest.mockResolvedValue('From: Consumes messages from an endpoint');
    mockGetTitleRequest.mockResolvedValue('Log EIP');

    const vizNode = createMockVizNode();
    await NodeEnrichmentService.enrichNodeFromCatalog(vizNode, CatalogKind.Component);

    expect(vizNode.data.iconUrl).toBe('log-icon.svg');
    expect(vizNode.data.iconAlt).toBe('Log icon');
    expect(vizNode.data.description).toBe('Logs messages to the console');
    expect(vizNode.data.processorIconTooltip).toBe('From: Consumes messages from an endpoint');
    expect(vizNode.data.title).toBe('Log EIP');
  });

  it('should handle all fetches failing gracefully', async () => {
    mockGetIconRequest.mockRejectedValue(new Error('Icon service down'));
    mockGetTooltipRequest.mockRejectedValue(new Error('Tooltip service down'));
    mockGetProcessorIconTooltipRequest.mockRejectedValue(new Error('Processor service down'));
    mockGetTitleRequest.mockRejectedValue(new Error('Title service down'));

    const vizNode = createMockVizNode();
    await NodeEnrichmentService.enrichNodeFromCatalog(vizNode, CatalogKind.Component);

    expect(vizNode.data.iconUrl).toBe('');
    expect(vizNode.data.iconAlt).toBeUndefined();
    expect(vizNode.data.description).toBe('Logs messages');
    expect(vizNode.data.processorIconTooltip).toBeUndefined();
    expect(vizNode.data.title).toBe('');
    expect(consoleWarnSpy).toHaveBeenCalledTimes(4);
  });

  it('should handle partial failures and still enrich successfully fetched data', async () => {
    mockGetIconRequest.mockRejectedValue(new Error('Icon failed'));
    mockGetTooltipRequest.mockResolvedValue('Logs messages to the console');
    mockGetProcessorIconTooltipRequest.mockRejectedValue(new Error('Processor tooltip failed'));
    mockGetTitleRequest.mockResolvedValue('Log EIP');

    const vizNode = createMockVizNode();
    await NodeEnrichmentService.enrichNodeFromCatalog(vizNode, CatalogKind.Component);

    expect(vizNode.data.iconUrl).toBe('');
    expect(vizNode.data.iconAlt).toBeUndefined();
    expect(vizNode.data.description).toBe('Logs messages to the console');
    expect(vizNode.data.processorIconTooltip).toBeUndefined();
    expect(vizNode.data.title).toBe('Log EIP');
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
});
