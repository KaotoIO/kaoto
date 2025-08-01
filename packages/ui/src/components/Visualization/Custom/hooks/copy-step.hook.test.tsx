import { renderHook } from '@testing-library/react';
import { useCopyStep } from './copy-step.hook';
import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { ClipboardManager } from '../../../../utils/ClipboardManager';
import { SourceSchemaType } from '../../../../models/camel/source-schema-type';

describe('useCopyStep', () => {
  const copySpy = jest.spyOn(ClipboardManager, 'copy').mockImplementation(async (__object) => Promise.resolve());
  const copiedContent = {
    type: SourceSchemaType.Route,
    name: 'exampleNode',
    definition: { id: 'node1', type: 'exampleType' },
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call ClipboardManager.copy with the copied node content', async () => {
    const mockVizNode = {
      getCopiedContent: jest.fn().mockReturnValue(copiedContent),
    } as unknown as IVisualizationNode;

    const { result } = renderHook(() => useCopyStep(mockVizNode));
    await result.current.onCopyStep();

    expect(mockVizNode.getCopiedContent).toHaveBeenCalledTimes(1);
    expect(copySpy).toHaveBeenCalledTimes(1);
    expect(copySpy).toHaveBeenCalledWith(copiedContent);
  });

  it('should not call ClipboardManager.copy if getCopiedContent returns null', async () => {
    const mockVizNode = {
      getCopiedContent: jest.fn().mockReturnValue(null),
    } as unknown as IVisualizationNode;

    const { result } = renderHook(() => useCopyStep(mockVizNode));
    await result.current.onCopyStep();

    expect(mockVizNode.getCopiedContent).toHaveBeenCalledTimes(1);
    expect(copySpy).not.toHaveBeenCalled();
  });
});
