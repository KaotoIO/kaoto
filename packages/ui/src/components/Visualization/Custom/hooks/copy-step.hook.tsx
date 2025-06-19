import { useCallback, useMemo } from 'react';
import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { ClipboardManager } from '../../../../utils/ClipboardManager';
import { SourceSchemaType } from '../../../../models/camel/source-schema-type';

export interface IClipboardCopyObject {
  type: SourceSchemaType;
  name: string;
  // can the type be more specific like: ProcessorDefinition[keyof ProcessorDefinition]
  defaultValue: object;
}

export const useCopyStep = (vizNode: IVisualizationNode) => {
  const onCopyStep = useCallback(async () => {
    if (!vizNode) return;

    try {
      const copiedNodeContent = vizNode.getCopiedContent();
      /** Copy the node model */
      if (copiedNodeContent) {
        ClipboardManager.copy(copiedNodeContent);
      }
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
