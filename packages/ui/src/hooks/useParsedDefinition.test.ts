import { renderHook, waitFor } from '@testing-library/react';

import { IVisualizationNode } from '../models/visualization/base-visual-entity';
import { useParsedDefinition } from './useParsedDefinition';

describe('useParsedDefinition', () => {
  it('should return undefined initially before the promise resolves', () => {
    const mockVizNode = {
      data: { schema: undefined },
      getParsedDefinition: vi.fn().mockReturnValue(new Promise(() => {})), // never resolves
    } as unknown as IVisualizationNode;

    const { result } = renderHook(() => useParsedDefinition(mockVizNode));
    expect(result.current).toBeUndefined();
  });

  it('should call getParsedDefinition even when schema is not available', async () => {
    const parsed = { uri: 'timer', parameters: {} };
    const mockVizNode = {
      data: { schema: undefined },
      getParsedDefinition: vi.fn().mockResolvedValue(parsed),
    } as unknown as IVisualizationNode;

    const { result } = renderHook(() => useParsedDefinition(mockVizNode));
    await waitFor(() => {
      expect(result.current).toEqual(parsed);
    });
    expect(mockVizNode.getParsedDefinition).toHaveBeenCalledTimes(1);
  });

  it('should return the parsed definition after resolution', async () => {
    const parsed = { uri: 'timer', parameters: { timerName: 'tick' } };
    const mockVizNode = {
      data: { schema: {} },
      getParsedDefinition: vi.fn().mockResolvedValue(parsed),
    } as unknown as IVisualizationNode;

    const { result } = renderHook(() => useParsedDefinition(mockVizNode));
    await waitFor(() => {
      expect(result.current).toEqual(parsed);
    });
  });

  it('should return undefined when vizNode is undefined', () => {
    const { result } = renderHook(() => useParsedDefinition(undefined));
    expect(result.current).toBeUndefined();
  });

  it('should re-fetch when vizNode changes', async () => {
    const firstParsed = { uri: 'timer', parameters: {} };
    const secondParsed = { uri: 'log', parameters: {} };

    const firstVizNode = {
      data: { schema: {} },
      getParsedDefinition: vi.fn().mockResolvedValue(firstParsed),
    } as unknown as IVisualizationNode;

    const secondVizNode = {
      data: { schema: {} },
      getParsedDefinition: vi.fn().mockResolvedValue(secondParsed),
    } as unknown as IVisualizationNode;

    const { result, rerender } = renderHook(({ vn }) => useParsedDefinition(vn), {
      initialProps: { vn: firstVizNode },
    });

    await waitFor(() => {
      expect(result.current).toEqual(firstParsed);
    });

    rerender({ vn: secondVizNode });
    await waitFor(() => {
      expect(result.current).toEqual(secondParsed);
    });
  });
});
