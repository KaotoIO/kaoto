import { useEffect, useState } from 'react';

import { IVisualizationNode } from '../../../../models';

/**
 * Resolves the validation text for a node via the async `getNodeValidationText` API.
 *
 * The node's validation depends on its current definition, which is mutated in place on edits while
 * bumping `lastUpdate`. Keying the effect on `lastUpdate` (in addition to the node itself) ensures the
 * validation text is recomputed whenever the node changes, not only when a different node is provided.
 *
 * @param vizNode The visualization node to validate.
 * @returns The validation text, or `undefined` while it resolves or when there is nothing to report.
 */
export const useNodeValidationText = (vizNode?: IVisualizationNode): string | undefined => {
  const [validationText, setValidationText] = useState<string | undefined>(undefined);
  const lastUpdate = vizNode?.lastUpdate;

  useEffect(() => {
    let cancelled = false;
    vizNode
      ?.getNodeValidationText()
      .then((text) => {
        if (!cancelled) setValidationText(text);
      })
      .catch((error) => {
        console.error('Failed to get node validation text:', error);
      });
    return () => {
      cancelled = true;
    };
    // `lastUpdate` is intentionally included so the text re-resolves when the node is edited in place.
  }, [vizNode, lastUpdate]);

  return validationText;
};
