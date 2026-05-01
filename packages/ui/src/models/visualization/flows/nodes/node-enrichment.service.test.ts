import { CatalogKind } from '../../../catalog-kind';
import { IVisualizationNode } from '../../base-visual-entity';
import { createVisualizationNode } from '../../visualization-node';
import { CamelRouteVisualEntityData } from '../support/camel-component-types';
import { NodeEnrichmentService } from './node-enrichment.service';
import { getIconRequest } from './resolvers/icon-resolver/getIconRequest';
import { getProcessorIconTooltipRequest } from './resolvers/tooltip-resolver/getProcessorIconTooltipRequest';
import { getTooltipRequest } from './resolvers/tooltip-resolver/getTooltipRequest';

jest.mock('./resolvers/icon-resolver/getIconRequest');
jest.mock('./resolvers/tooltip-resolver/getTooltipRequest');
jest.mock('./resolvers/tooltip-resolver/getProcessorIconTooltipRequest');

describe('NodeEnrichmentService', () => {
  const mockGetIconRequest = jest.mocked(getIconRequest);
  const mockGetTooltipRequest = jest.mocked(getTooltipRequest);
  const mockGetProcessorIconTooltipRequest = jest.mocked(getProcessorIconTooltipRequest);

  beforeEach(() => {
    jest.clearAllMocks();
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

    const vizNode = createMockVizNode();
    await NodeEnrichmentService.enrichNodeFromCatalog(vizNode, CatalogKind.Component);

    expect(vizNode.data.iconUrl).toBe('log-icon.svg');
    expect(vizNode.data.iconAlt).toBe('Log icon');
    expect(vizNode.data.description).toBe('Logs messages to the console');
    expect(vizNode.data.processorIconTooltip).toBe('From: Consumes messages from an endpoint');
  });

  it('should handle icon fetch failure gracefully', async () => {
    mockGetIconRequest.mockRejectedValue(new Error('Icon not found'));
    mockGetTooltipRequest.mockResolvedValue('Logs messages to the console');
    mockGetProcessorIconTooltipRequest.mockResolvedValue('From: Consumes messages from an endpoint');

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const vizNode = createMockVizNode();

    await NodeEnrichmentService.enrichNodeFromCatalog(vizNode, CatalogKind.Component);

    // Pre-existing values remain unchanged on failure
    expect(vizNode.data.iconUrl).toBe('');
    expect(vizNode.data.iconAlt).toBeUndefined();
    expect(vizNode.data.description).toBe('Logs messages to the console');
    expect(vizNode.data.processorIconTooltip).toBe('From: Consumes messages from an endpoint');
    expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to fetch icon for log:', expect.any(Error));

    consoleWarnSpy.mockRestore();
  });

  it('should handle tooltip fetch failure gracefully', async () => {
    mockGetIconRequest.mockResolvedValue({ icon: 'log-icon.svg', alt: 'Log icon' });
    mockGetTooltipRequest.mockRejectedValue(new Error('Tooltip not found'));
    mockGetProcessorIconTooltipRequest.mockResolvedValue('From: Consumes messages from an endpoint');

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const vizNode = createMockVizNode();

    await NodeEnrichmentService.enrichNodeFromCatalog(vizNode, CatalogKind.Component);

    expect(vizNode.data.iconUrl).toBe('log-icon.svg');
    expect(vizNode.data.iconAlt).toBe('Log icon');
    // Pre-existing description remains unchanged on failure
    expect(vizNode.data.description).toBe('Logs messages');
    expect(vizNode.data.processorIconTooltip).toBe('From: Consumes messages from an endpoint');
    expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to fetch tooltip for log:', expect.any(Error));

    consoleWarnSpy.mockRestore();
  });

  it('should handle processor icon tooltip fetch failure gracefully', async () => {
    mockGetIconRequest.mockResolvedValue({ icon: 'log-icon.svg', alt: 'Log icon' });
    mockGetTooltipRequest.mockResolvedValue('Logs messages to the console');
    mockGetProcessorIconTooltipRequest.mockRejectedValue(new Error('Processor tooltip not found'));

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const vizNode = createMockVizNode();

    await NodeEnrichmentService.enrichNodeFromCatalog(vizNode, CatalogKind.Component);

    expect(vizNode.data.iconUrl).toBe('log-icon.svg');
    expect(vizNode.data.iconAlt).toBe('Log icon');
    expect(vizNode.data.description).toBe('Logs messages to the console');
    expect(vizNode.data.processorIconTooltip).toBe('');
    expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to fetch processor icon tooltip for from:', expect.any(Error));

    consoleWarnSpy.mockRestore();
  });

  it('should handle all fetches failing gracefully', async () => {
    mockGetIconRequest.mockRejectedValue(new Error('Icon service down'));
    mockGetTooltipRequest.mockRejectedValue(new Error('Tooltip service down'));
    mockGetProcessorIconTooltipRequest.mockRejectedValue(new Error('Processor service down'));

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const vizNode = createMockVizNode();

    await NodeEnrichmentService.enrichNodeFromCatalog(vizNode, CatalogKind.Component);

    // Pre-existing values remain unchanged on failure
    expect(vizNode.data.iconUrl).toBe('');
    expect(vizNode.data.iconAlt).toBeUndefined();
    expect(vizNode.data.description).toBe('Logs messages');
    expect(vizNode.data.processorIconTooltip).toBe('');
    expect(consoleWarnSpy).toHaveBeenCalledTimes(3);

    consoleWarnSpy.mockRestore();
  });

  it('should handle partial failures and still enrich successfully fetched data', async () => {
    mockGetIconRequest.mockRejectedValue(new Error('Icon failed'));
    mockGetTooltipRequest.mockResolvedValue('Logs messages to the console');
    mockGetProcessorIconTooltipRequest.mockRejectedValue(new Error('Processor tooltip failed'));

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const vizNode = createMockVizNode();

    await NodeEnrichmentService.enrichNodeFromCatalog(vizNode, CatalogKind.Component);

    // Pre-existing values remain unchanged for failed fetches
    expect(vizNode.data.iconUrl).toBe('');
    expect(vizNode.data.iconAlt).toBeUndefined();
    expect(vizNode.data.description).toBe('Logs messages to the console');
    expect(vizNode.data.processorIconTooltip).toBe('');
    expect(consoleWarnSpy).toHaveBeenCalledTimes(2);

    consoleWarnSpy.mockRestore();
  });
});
