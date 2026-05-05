import { CatalogKind } from '../../../../../catalog-kind';
import { getTitleRequest } from './getTitleRequest';
import { NodeTitleResolver } from './node-title-resolver';

jest.mock('./node-title-resolver');

describe('getTitleRequest', () => {
  const mockGetComponentTitle = jest.mocked(NodeTitleResolver.getComponentTitle);
  const mockGetKameletTitle = jest.mocked(NodeTitleResolver.getKameletTitle);
  const mockGetProcessorTitle = jest.mocked(NodeTitleResolver.getProcessorTitle);
  const mockGetEntityTitle = jest.mocked(NodeTitleResolver.getEntityTitle);
  const mockGetTestActionTitle = jest.mocked(NodeTitleResolver.getTestActionTitle);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should get component title for Component catalog kind', async () => {
    mockGetComponentTitle.mockResolvedValue('Timer Component');

    const result = await getTitleRequest(CatalogKind.Component, 'timer');

    expect(mockGetComponentTitle).toHaveBeenCalledWith('timer');
    expect(result).toBe('Timer Component');
  });

  it('should get kamelet title for Kamelet catalog kind', async () => {
    mockGetKameletTitle.mockResolvedValue('Kafka Source');

    const result = await getTitleRequest(CatalogKind.Kamelet, 'kafka-source');

    expect(mockGetKameletTitle).toHaveBeenCalledWith('kafka-source');
    expect(result).toBe('Kafka Source');
  });

  it('should get processor title for Processor catalog kind', async () => {
    mockGetProcessorTitle.mockResolvedValue('Log EIP');

    const result = await getTitleRequest(CatalogKind.Processor, 'log');

    expect(mockGetProcessorTitle).toHaveBeenCalledWith('log', undefined);
    expect(result).toBe('Log EIP');
  });

  it('should get processor title with component name', async () => {
    mockGetProcessorTitle.mockResolvedValue('Timer');

    const result = await getTitleRequest(CatalogKind.Processor, 'from', 'timer');

    expect(mockGetProcessorTitle).toHaveBeenCalledWith('from', 'timer');
    expect(result).toBe('Timer');
  });

  it('should get entity title for Entity catalog kind', async () => {
    mockGetEntityTitle.mockResolvedValue('Error Handler');

    const result = await getTitleRequest(CatalogKind.Entity, 'errorHandler');

    expect(mockGetEntityTitle).toHaveBeenCalledWith('errorHandler');
    expect(result).toBe('Error Handler');
  });

  it('should get test action title for TestAction catalog kind', async () => {
    mockGetTestActionTitle.mockResolvedValue('Send Action');

    const result = await getTitleRequest(CatalogKind.TestAction, 'send');

    expect(mockGetTestActionTitle).toHaveBeenCalledWith('send');
    expect(result).toBe('Send Action');
  });

  it('should fallback to name if title is empty', async () => {
    mockGetProcessorTitle.mockResolvedValue('');

    const result = await getTitleRequest(CatalogKind.Processor, 'unknown');

    expect(result).toBe('unknown');
  });
});
