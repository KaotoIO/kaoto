import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { ArrowRightIcon, BoltIcon, DataSourceIcon, SyncAltIcon } from '@patternfly/react-icons';
import { renderHook } from '@testing-library/react';

import { CamelCatalogService, ComponentsCatalogTypes } from '../models';
import { useProcessorIcon } from './processor-icon.hook';

describe('useProcessorIcon', () => {
  const TEST_CASES = [
    ['from', DataSourceIcon],
    ['to', ArrowRightIcon],
    ['toD', BoltIcon],
    ['poll', SyncAltIcon],
  ] as const;

  it.each(TEST_CASES)('returns an icon and description for processorName="%s"', (name, icon) => {
    const { result } = renderHook(() => useProcessorIcon(name as keyof ProcessorDefinition));

    expect(result.current.Icon).toBe(icon);
    expect(result.current.description).toBe('');
  });

  it('should return null for not specified processors', () => {
    const { result } = renderHook(() => useProcessorIcon('unknown' as keyof ProcessorDefinition));

    expect(result.current.Icon).toBe(null);
    expect(result.current.description).toBeUndefined();
  });

  const DESCRIPTION_TEST_CASES = [
    ['from', 'From: From Description'],
    ['to', 'To: To Description'],
    ['toD', 'ToD: ToD Description'],
    ['poll', 'Poll: Poll Description'],
  ] as const;
  it.each(DESCRIPTION_TEST_CASES)(
    'returns the correct description for processorName="%s"',
    (name, expectedDescription) => {
      jest.spyOn(CamelCatalogService, 'getComponent').mockReturnValueOnce({
        model: { description: expectedDescription.split(': ')[1] },
      } as unknown as ComponentsCatalogTypes);

      const { result } = renderHook(() => useProcessorIcon(name as keyof ProcessorDefinition));

      expect(result.current.description).toBe(expectedDescription);
    },
  );
});
