import { renderHook, waitFor } from '@testing-library/react';

import { getProcessorIconTooltipRequest } from '../tooltip-resolver/getProcessorIconTooltipRequest';
import { useProcessorTooltips } from './use-processor-tooltips.hook';

jest.mock('../tooltip-resolver/getProcessorIconTooltipRequest');

describe('useProcessorTooltips', () => {
  const mockGetRequest = jest.mocked(getProcessorIconTooltipRequest);

  // Use stable array references to match real-world usage with constants
  const STABLE_THREE_PROCESSORS = ['to', 'toD', 'poll'];
  const STABLE_TWO_PROCESSORS = ['to', 'toD'];
  const STABLE_ONE_PROCESSOR = ['to'];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch tooltips for multiple processors', async () => {
    mockGetRequest.mockImplementation(async (name) => {
      const tooltips: Record<string, string> = {
        to: 'To: Sends messages to an endpoint',
        toD: 'ToD: Sends messages to a dynamic endpoint',
        poll: 'Poll: Polls messages from an endpoint',
      };
      return tooltips[name || ''] || '';
    });

    const { result } = renderHook(() => useProcessorTooltips(STABLE_THREE_PROCESSORS));

    await waitFor(() => {
      expect(result.current).toEqual({
        to: 'To: Sends messages to an endpoint',
        toD: 'ToD: Sends messages to a dynamic endpoint',
        poll: 'Poll: Polls messages from an endpoint',
      });
    });

    expect(mockGetRequest).toHaveBeenCalledTimes(3);
    expect(mockGetRequest).toHaveBeenCalledWith('to');
    expect(mockGetRequest).toHaveBeenCalledWith('toD');
    expect(mockGetRequest).toHaveBeenCalledWith('poll');
  });

  it('should handle empty string tooltips for invalid processors', async () => {
    mockGetRequest.mockResolvedValue('');

    const { result } = renderHook(() => useProcessorTooltips(STABLE_TWO_PROCESSORS));

    await waitFor(() => {
      expect(result.current).toEqual({
        to: '',
        toD: '',
      });
    });
  });

  it('should return empty object initially', () => {
    mockGetRequest.mockResolvedValue('To: Sends messages to an endpoint');

    const { result } = renderHook(() => useProcessorTooltips(STABLE_ONE_PROCESSOR));

    expect(result.current).toEqual({});
  });

  it('should gracefully handle partial failures and return successful tooltips', async () => {
    mockGetRequest.mockImplementation(async (name) => {
      if (name === 'to') {
        return 'To: Sends messages to an endpoint';
      }
      if (name === 'toD') {
        throw new Error('Network error');
      }
      if (name === 'poll') {
        return 'Poll: Polls messages from an endpoint';
      }
      return '';
    });

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const { result } = renderHook(() => useProcessorTooltips(STABLE_THREE_PROCESSORS));

    await waitFor(() => {
      expect(result.current).toEqual({
        to: 'To: Sends messages to an endpoint',
        toD: '',
        poll: 'Poll: Polls messages from an endpoint',
      });
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to fetch tooltip for processor "toD":', expect.any(Error));

    consoleWarnSpy.mockRestore();
  });

  it('should handle all requests failing gracefully', async () => {
    mockGetRequest.mockRejectedValue(new Error('Catalog service unavailable'));

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const { result } = renderHook(() => useProcessorTooltips(STABLE_TWO_PROCESSORS));

    await waitFor(() => {
      expect(result.current).toEqual({
        to: '',
        toD: '',
      });
    });

    expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
    expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to fetch tooltip for processor "to":', expect.any(Error));
    expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to fetch tooltip for processor "toD":', expect.any(Error));

    consoleWarnSpy.mockRestore();
  });

  it('should not re-fetch when array reference changes but contents are the same', async () => {
    mockGetRequest.mockImplementation(async (name) => {
      const tooltips: Record<string, string> = {
        to: 'To: Sends messages to an endpoint',
        toD: 'ToD: Sends messages to a dynamic endpoint',
      };
      return tooltips[name || ''] || '';
    });

    const { result, rerender } = renderHook(({ processors }) => useProcessorTooltips(processors), {
      initialProps: { processors: ['to', 'toD'] as const },
    });

    await waitFor(() => {
      expect(result.current).toEqual({
        to: 'To: Sends messages to an endpoint',
        toD: 'ToD: Sends messages to a dynamic endpoint',
      });
    });

    expect(mockGetRequest).toHaveBeenCalledTimes(2);

    mockGetRequest.mockClear();

    rerender({ processors: ['to', 'toD'] as const });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockGetRequest).not.toHaveBeenCalled();
  });
});
