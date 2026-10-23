import { ArrowRight, DataShare, Delay, Flash } from '@carbon/icons-react';
import { ProcessorDefinition } from '@kaoto/camel-catalog/types';

import { getProcessorIcon } from './processor-icon';

describe('getProcessorIcon', () => {
  const TEST_CASES = [
    ['from', DataShare],
    ['to', ArrowRight],
    ['toD', Flash],
    ['poll', Delay],
  ] as const;

  it.each(TEST_CASES)('returns correct icon for processorName="%s"', (name, icon) => {
    const result = getProcessorIcon(name as keyof ProcessorDefinition);

    expect(result).toBe(icon);
  });

  it('should return null for not specified processors', () => {
    const result = getProcessorIcon('unknown' as keyof ProcessorDefinition);

    expect(result).toBeNull();
  });

  it('should return null for setHeader processor', () => {
    const result = getProcessorIcon('setHeader' as keyof ProcessorDefinition);

    expect(result).toBeNull();
  });
});
