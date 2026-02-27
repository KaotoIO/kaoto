import { renderHook } from '@testing-library/react';

import {
  createRestEntityWithDirectRouteNotFound,
  createRestEntityWithNonDirectUri,
  createRestEntityWithoutTo,
  createSimpleRestVisualEntity,
} from '../../../stubs';
import { useRestDslToUri } from './useRestDslToUri';

describe('useRestDslToUri', () => {
  const mockDirectEndpointItems = [
    { name: 'direct:users', value: 'direct:users' },
    { name: 'direct:posts', value: 'direct:posts' },
  ];

  const mockDirectRouteInputs = new Set(['direct:users']);

  const defaultProps = {
    selection: undefined,
    selectedFormState: undefined,
    restEntities: [],
    directEndpointItems: mockDirectEndpointItems,
    directRouteInputs: mockDirectRouteInputs,
    entitiesContext: null,
    canAddRestEntities: false,
    onChangeProp: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with empty toUri value when no selection', () => {
    const { result } = renderHook(() => useRestDslToUri(defaultProps));

    expect(result.current.toUriValue).toBe('');
    expect(result.current.directRouteExists).toBe(false);
  });

  it('returns toUri value for selected operation', () => {
    const restEntities = [createSimpleRestVisualEntity('rest-1')];

    const { result } = renderHook(() =>
      useRestDslToUri({
        ...defaultProps,
        selection: { kind: 'operation', restId: 'rest-1', verb: 'get', index: 0 },
        restEntities,
      }),
    );

    expect(result.current.toUriValue).toBe('direct:users');
  });

  it('detects when direct route exists', () => {
    const restEntities = [createSimpleRestVisualEntity('rest-1')];

    const { result } = renderHook(() =>
      useRestDslToUri({
        ...defaultProps,
        selection: { kind: 'operation', restId: 'rest-1', verb: 'get', index: 0 },
        restEntities,
      }),
    );

    expect(result.current.directRouteExists).toBe(true);
  });

  it('detects when direct route does not exist', () => {
    const restEntities = [createRestEntityWithDirectRouteNotFound('rest-1')];

    const { result } = renderHook(() =>
      useRestDslToUri({
        ...defaultProps,
        selection: { kind: 'operation', restId: 'rest-1', verb: 'get', index: 0 },
        restEntities,
      }),
    );

    expect(result.current.directRouteExists).toBe(false);
  });

  it('returns empty toUri for rest entity selection', () => {
    const restEntities = [createSimpleRestVisualEntity('rest-1')];

    const { result } = renderHook(() =>
      useRestDslToUri({
        ...defaultProps,
        selection: { kind: 'rest', restId: 'rest-1' },
        restEntities,
      }),
    );

    expect(result.current.toUriValue).toBe('');
    expect(result.current.directRouteExists).toBe(false);
  });

  it('handles operation without to field', () => {
    const restEntities = [createRestEntityWithoutTo('rest-1')];

    const { result } = renderHook(() =>
      useRestDslToUri({
        ...defaultProps,
        selection: { kind: 'operation', restId: 'rest-1', verb: 'get', index: 0 },
        restEntities,
      }),
    );

    expect(result.current.toUriValue).toBe('');
  });

  it('handles non-direct URI', () => {
    const restEntities = [createRestEntityWithNonDirectUri('rest-1')];

    const { result } = renderHook(() =>
      useRestDslToUri({
        ...defaultProps,
        selection: { kind: 'operation', restId: 'rest-1', verb: 'get', index: 0 },
        restEntities,
      }),
    );

    expect(result.current.toUriValue).toBe('log:info');
    expect(result.current.directRouteExists).toBe(false);
  });
});
