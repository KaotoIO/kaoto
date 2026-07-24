import { renderHook } from '@testing-library/react';

import { SourceSchemaType } from '../../../../models/camel/source-schema-type';
import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { ClipboardService } from '../../../../services/visualization/clipboard.service';
import { useCopyStep } from './copy-step.hook';

describe('useCopyStep', () => {
  const copySpy = vi.spyOn(ClipboardService, 'copy').mockImplementation(async (__object) => undefined);
  const copiedContent = {
    type: SourceSchemaType.Route,
    name: 'exampleNode',
    definition: { id: 'node1', type: 'exampleType' },
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call ClipboardService.copy with the copied node content', async () => {
    const mockVizNode = {
      getCopiedContent: vi.fn().mockReturnValue(copiedContent),
    } as unknown as IVisualizationNode;

    const { result } = renderHook(() => useCopyStep(mockVizNode));
    await result.current.onCopyStep();

    expect(mockVizNode.getCopiedContent).toHaveBeenCalledTimes(1);
    expect(copySpy).toHaveBeenCalledTimes(1);
    expect(copySpy).toHaveBeenCalledWith(copiedContent);
  });

  it('should not call ClipboardService.copy if getCopiedContent returns null', async () => {
    const mockVizNode = {
      getCopiedContent: vi.fn().mockReturnValue(null),
    } as unknown as IVisualizationNode;

    const { result } = renderHook(() => useCopyStep(mockVizNode));
    await result.current.onCopyStep();

    expect(mockVizNode.getCopiedContent).toHaveBeenCalledTimes(1);
    expect(copySpy).not.toHaveBeenCalled();
  });
});
