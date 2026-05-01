import { PROCESSORS_WITH_ICONS } from '../../../../../special-processors.constants';
import { ProcessorIconTooltipResolver } from './processor-icon-tooltip-resolver';

/**
 * Requests a processor icon tooltip for a given processor name.
 * This function resolves processor icon tooltip content from the catalog asynchronously.
 * Only applies to processors that have icon overlays: from, to, toD, poll
 *
 * @param processorName - The processor name (e.g., 'from', 'to', 'toD', 'poll')
 * @returns Promise resolving to the processor icon tooltip text (empty string if not applicable)
 */
export async function getProcessorIconTooltipRequest(processorName?: string): Promise<string> {
  // Only these processors have icon overlays
  if (!processorName || !(PROCESSORS_WITH_ICONS as readonly string[]).includes(processorName)) {
    return '';
  }

  const tooltip = await ProcessorIconTooltipResolver.getProcessorIconTooltip(processorName);
  return tooltip ?? '';
}
