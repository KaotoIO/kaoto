import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { ArrowRightIcon, BoltIcon, DataSourceIcon, SpinnerIcon } from '@patternfly/react-icons';

import { getProcessorIcon } from './processor-icon';

describe('getProcessorIcon', () => {
  const TEST_CASES = [
    ['from', DataSourceIcon],
    ['to', ArrowRightIcon],
    ['toD', BoltIcon],
    ['poll', SpinnerIcon],
  ] as const;

  it.each(TEST_CASES)('returns correct icon for processorName="%s"', (name, icon) => {
    const result = getProcessorIcon(name as keyof ProcessorDefinition);

    expect(result).toBe(icon);
  });

  it('should return null for not specified processors', () => {
    const result = getProcessorIcon('unknown' as keyof ProcessorDefinition);

    expect(result).toBe(null);
  });

  it('should return null for setHeader processor', () => {
    const result = getProcessorIcon('setHeader' as keyof ProcessorDefinition);

    expect(result).toBe(null);
  });
});
