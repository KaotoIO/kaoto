import { act, renderHook } from '@testing-library/react';

import { EntitiesContextResult } from '../../../../../providers/entities.provider';
import { VisibleFlowsContextResult } from '../../../../../providers/visible-flows.provider';
import {
  getDirectNameFromUri,
  useCreateDirectRoute,
  useDirectEndpointNameOptions,
} from './DirectEndpointNameField.hooks';

describe('DirectEndpointNameField hooks', () => {
  describe('getDirectNameFromUri', () => {
    it('extracts a direct endpoint name', () => {
      expect(getDirectNameFromUri('direct:orders')).toBe('orders');
      expect(getDirectNameFromUri('direct:orders?lazyStartProducer=true')).toBe('orders');
    });

    it('returns undefined for non-direct URIs', () => {
      expect(getDirectNameFromUri('timer:test')).toBeUndefined();
    });
  });

  describe('useDirectEndpointNameOptions', () => {
    const visualEntities = [
      {
        getId: () => 'route-start',
        toJSON: () => ({ route: { from: { uri: 'direct:start', steps: [{ to: { uri: 'direct:orders' } }] } } }),
      },
      {
        getId: () => 'route-billing',
        toJSON: () => ({ route: { from: { uri: 'direct', parameters: { name: 'billing' }, steps: [] } } }),
      },
    ];

    it('lists and sorts direct endpoint names from entities', () => {
      const onChange = jest.fn();

      const { result } = renderHook(() =>
        useDirectEndpointNameOptions({
          value: '',
          onChange,
          visualEntities,
        }),
      );

      expect(result.current.items.map((item) => item.name)).toEqual(['billing', 'orders', 'start']);
      expect(result.current.existingDirectRouteNames).toEqual(['billing', 'start']);
      expect(result.current.items.find((item) => item.name === 'billing')?.description).toContain('route-billing');
      expect(result.current.items.find((item) => item.name === 'start')?.description).toContain('route-start');
    });

    it('handles typeahead callbacks', () => {
      const onChange = jest.fn();
      const { result } = renderHook(() =>
        useDirectEndpointNameOptions({
          value: 'start',
          onChange,
          visualEntities,
        }),
      );

      act(() => result.current.onTypeaheadChange({ name: 'orders', value: 'orders' }));
      act(() => result.current.onCleanInput());
      act(() => result.current.onCreateOption(undefined, 'new-route'));

      expect(onChange).toHaveBeenNthCalledWith(1, 'orders');
      expect(onChange).toHaveBeenNthCalledWith(2, undefined);
      expect(onChange).toHaveBeenNthCalledWith(3, 'new-route');
      expect(result.current.typedName).toBe('start');
    });
  });

  describe('useCreateDirectRoute', () => {
    it('creates a route for a new direct name', () => {
      const onChange = jest.fn();
      const addNewEntity = jest.fn().mockReturnValue('new-route-id');
      const toggleFlowVisible = jest.fn();
      const updateEntitiesFromCamelResource = jest.fn();
      const entitiesContext = {
        camelResource: { addNewEntity },
        updateEntitiesFromCamelResource,
      } as unknown as EntitiesContextResult;
      const visibleFlowsContext = {
        visualFlowsApi: { toggleFlowVisible },
      } as unknown as VisibleFlowsContextResult;

      const { result } = renderHook(() =>
        useCreateDirectRoute({
          disabled: false,
          typedName: 'new-route',
          existingDirectRouteNames: ['start'],
          onChange,
          entitiesContext,
          visibleFlowsContext,
        }),
      );

      expect(result.current.canCreateRoute).toBe(true);

      act(() => result.current.onCreateRoute());

      expect(addNewEntity).toHaveBeenCalledWith('route', {
        from: { uri: 'direct', parameters: { name: 'new-route' }, steps: [] },
      });
      expect(toggleFlowVisible).toHaveBeenCalledWith('new-route-id');
      expect(updateEntitiesFromCamelResource).toHaveBeenCalled();
      expect(onChange).toHaveBeenCalledWith('new-route');
    });

    it('disables route creation for existing names', () => {
      const onChange = jest.fn();
      const { result } = renderHook(() =>
        useCreateDirectRoute({
          disabled: false,
          typedName: 'start',
          existingDirectRouteNames: ['start'],
          onChange,
          entitiesContext: null,
          visibleFlowsContext: undefined,
        }),
      );

      expect(result.current.canCreateRoute).toBe(false);
    });

    it('allows route creation when the name is only referenced but has no direct from route', () => {
      const onChange = jest.fn();
      const { result } = renderHook(() =>
        useCreateDirectRoute({
          disabled: false,
          typedName: 'orders',
          existingDirectRouteNames: ['start'],
          onChange,
          entitiesContext: null,
          visibleFlowsContext: undefined,
        }),
      );

      expect(result.current.canCreateRoute).toBe(true);
    });
  });
});
