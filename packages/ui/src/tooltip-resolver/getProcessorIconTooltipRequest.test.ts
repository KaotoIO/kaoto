import { getProcessorIconTooltipRequest } from './getProcessorIconTooltipRequest';
import { ProcessorIconTooltipResolver } from './processor-icon-tooltip-resolver';

jest.mock('./processor-icon-tooltip-resolver');

describe('getProcessorIconTooltipRequest', () => {
  const mockGetProcessorIconTooltip = jest.mocked(ProcessorIconTooltipResolver.getProcessorIconTooltip);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call resolver and return tooltip for valid processors', async () => {
    mockGetProcessorIconTooltip.mockResolvedValue('From: Consumes messages from an endpoint');

    const result = await getProcessorIconTooltipRequest('from');

    expect(mockGetProcessorIconTooltip).toHaveBeenCalledWith('from');
    expect(result).toBe('From: Consumes messages from an endpoint');
  });

  it('should return empty string for invalid processors without calling resolver', async () => {
    const result = await getProcessorIconTooltipRequest('setHeader');

    expect(mockGetProcessorIconTooltip).not.toHaveBeenCalled();
    expect(result).toBe('');
  });

  it('should return empty string when resolver returns undefined', async () => {
    mockGetProcessorIconTooltip.mockResolvedValue(undefined);

    const result = await getProcessorIconTooltipRequest('from');

    expect(mockGetProcessorIconTooltip).toHaveBeenCalledWith('from');
    expect(result).toBe('');
  });

  it('should return empty string for undefined processor name', async () => {
    const result = await getProcessorIconTooltipRequest(undefined as unknown as string);

    expect(mockGetProcessorIconTooltip).not.toHaveBeenCalled();
    expect(result).toBe('');
  });

  it.each(['to', 'toD', 'poll'])('should call resolver for valid processor "%s"', async (processorName) => {
    mockGetProcessorIconTooltip.mockResolvedValue(`${processorName}: description`);

    const result = await getProcessorIconTooltipRequest(processorName);

    expect(mockGetProcessorIconTooltip).toHaveBeenCalledWith(processorName);
    expect(result).toBe(`${processorName}: description`);
  });
});
