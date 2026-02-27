import { act, renderHook } from '@testing-library/react';

import { createRestConfigurationVisualEntity, createSimpleRestVisualEntity } from '../../../stubs';
import { useRestDslSelection } from './useRestDslSelection';

describe('useRestDslSelection', () => {
  const mockRestEntity = createSimpleRestVisualEntity('rest-1');

  it('initializes with undefined selection when no data', () => {
    const { result } = renderHook(() =>
      useRestDslSelection({
        restConfiguration: undefined,
        restEntities: [],
      }),
    );

    expect(result.current.selection).toBeUndefined();
  });

  it('initializes with rest configuration when available', () => {
    const mockRestConfiguration = createRestConfigurationVisualEntity();

    const { result } = renderHook(() =>
      useRestDslSelection({
        restConfiguration: mockRestConfiguration,
        restEntities: [],
      }),
    );

    expect(result.current.selection).toEqual({ kind: 'restConfiguration' });
  });

  it('initializes with first rest entity when no configuration', () => {
    const { result } = renderHook(() =>
      useRestDslSelection({
        restConfiguration: undefined,
        restEntities: [mockRestEntity],
      }),
    );

    expect(result.current.selection).toEqual({
      kind: 'rest',
      restId: 'rest-1',
    });
  });

  it('updates selection when set', () => {
    const { result } = renderHook(() =>
      useRestDslSelection({
        restConfiguration: undefined,
        restEntities: [mockRestEntity],
      }),
    );

    act(() => {
      result.current.setSelection({
        kind: 'operation',
        restId: 'rest-1',
        verb: 'get',
        index: 0,
      });
    });

    expect(result.current.selection).toEqual({
      kind: 'operation',
      restId: 'rest-1',
      verb: 'get',
      index: 0,
    });
  });

  it('returns selectedFormState for rest configuration', () => {
    const mockRestConfiguration = createRestConfigurationVisualEntity();

    const { result } = renderHook(() =>
      useRestDslSelection({
        restConfiguration: mockRestConfiguration,
        restEntities: [],
      }),
    );

    expect(result.current.selectedFormState).toMatchObject({
      title: 'Rest Configuration',
      entity: mockRestConfiguration,
      path: 'restConfiguration',
    });
  });

  it('returns selectedFormState for rest entity', () => {
    const { result } = renderHook(() =>
      useRestDslSelection({
        restConfiguration: undefined,
        restEntities: [mockRestEntity],
      }),
    );

    expect(result.current.selectedFormState).toMatchObject({
      title: 'Rest',
      entity: mockRestEntity,
      path: 'rest',
    });
  });
});
