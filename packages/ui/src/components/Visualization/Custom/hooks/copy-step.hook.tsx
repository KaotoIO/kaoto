import { useCallback, useMemo } from 'react';
import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { ClipboardManager } from '../../../../utils/ClipboardManager';

export interface IClipboardCopyObject {
  name: string;
  // can the type be more specific like: ProcessorDefinition[keyof ProcessorDefinition]
  defaultValue: object;
}

export const useCopyStep = (vizNode: IVisualizationNode) => {
  const onCopyStep = useCallback(async () => {
    if (!vizNode) return;

    const model = vizNode.getComponentSchema()?.definition ?? {};
    const copiedNode: IClipboardCopyObject = {
      defaultValue: model,
      name: vizNode.data.processorName as string,
    };
    /** Copy the node model */
    try {
      ClipboardManager.copy(copiedNode);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  }, [vizNode]);

  const value = useMemo(
    () => ({
      onCopyStep: onCopyStep,
    }),
    [onCopyStep],
  );

  return value;
};
