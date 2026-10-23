import { ArrowRight, DataShare, Delay, Flash } from '@carbon/icons-react';
import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { ElementType } from 'react';

import { PROCESSORS_WITH_ICONS } from '../models/special-processors.constants';

/**
 * Map of processor names to their icon components.
 * These icons are used as overlays in the visualization to indicate processor type.
 */
const PROCESSOR_ICON_MAP: Record<(typeof PROCESSORS_WITH_ICONS)[number], ElementType> = {
  from: DataShare,
  to: ArrowRight,
  toD: Flash,
  poll: Delay,
};

/**
 * Gets the icon component for a given processor name.
 * @param processorName - The processor name (e.g., 'from', 'to', 'toD', 'poll')
 * @returns The icon component or null if not found
 */
export const getProcessorIcon = (processorName: keyof ProcessorDefinition): ElementType | null => {
  return PROCESSOR_ICON_MAP[processorName as (typeof PROCESSORS_WITH_ICONS)[number]] ?? null;
};
