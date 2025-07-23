import { useCallback, useMemo } from 'react';
import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { ClipboardManager } from '../../../../utils/ClipboardManager';
import { SourceSchemaType } from '../../../../models/camel/source-schema-type';

export interface IClipboardCopyObject {
  type: SourceSchemaType;
  name: string;
  definition: object;
}

export const useCopyStep = (vizNode: IVisualizationNode) => {
  const onCopyStep = useCallback(async () => {
    const copiedNodeContent = vizNode.getCopiedContent();
    /** Copy the node model */
    if (copiedNodeContent) {
      ClipboardManager.copy(copiedNodeContent);
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
