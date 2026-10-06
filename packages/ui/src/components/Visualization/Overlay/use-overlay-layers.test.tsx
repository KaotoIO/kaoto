import { act, render, renderHook, screen } from '@testing-library/react';
import { StrictMode } from 'react';

import { createOverlayStore } from '../../../store/overlay.store';
import { useOverlayLayers } from './use-overlay-layers';

const scope = { canvasId: 'canvas', documentId: 'route.yaml', modelRevision: '1' };
const createStore = () => createOverlayStore({ scope, targets: [{ kind: 'node', id: 'step' }] });
const note = (value: number) => ({
  id: 'count',
  kind: 'annotation' as const,
  target: { kind: 'node' as const, id: 'step' },
  text: 'Count',
  value,
  interaction: { accessibleLabel: 'Count' },
});

it('updates multiple React consumers from external writes and disposal under StrictMode', () => {
  const store = createStore();
  const owner = store.getState().createOwner()!;
  const Consumer = () => {
    const layers = useOverlayLayers(store);
    const entry = layers[0]?.entries[0];
    return <output>{entry?.kind === 'annotation' ? entry.value : 'empty'}</output>;
  };
  render(
    <StrictMode>
      <Consumer />
      <Consumer />
    </StrictMode>,
  );
  expect(screen.getAllByText('empty')).toHaveLength(2);
  act(() => {
    owner.replaceLayer(scope, 'metrics', [note(42)]);
  });
  expect(screen.getAllByText('42')).toHaveLength(2);
  act(() => {
    owner.upsertEntries(scope, 'metrics', [note(43)]);
  });
  expect(screen.getAllByText('43')).toHaveLength(2);
  act(() => {
    owner.dispose();
  });
  expect(screen.getAllByText('empty')).toHaveLength(2);
  act(() => {
    store
      .getState()
      .createOwner()!
      .replaceLayer(scope, 'new', [note(99)]);
  });
  expect(screen.getAllByText('99')).toHaveLength(2);
  act(() => {
    store.getState().dispose();
  });
  expect(screen.getAllByText('empty')).toHaveLength(2);
});

it('switches stores, stops old updates and releases subscriptions on unmount', () => {
  const first = createStore();
  const second = createStore();
  const firstOwner = first.getState().createOwner()!;
  const secondOwner = second.getState().createOwner()!;
  secondOwner.replaceLayer(scope, 'metrics', [note(2)]);
  const unsubscribeSecond = vi.fn();
  const subscribeSecond = second.subscribe;
  vi.spyOn(second, 'subscribe').mockImplementation((listener) => {
    const release = subscribeSecond(listener);
    return () => {
      unsubscribeSecond();
      release();
    };
  });
  const unsubscribe = vi.fn();
  const subscribe = first.subscribe;
  vi.spyOn(first, 'subscribe').mockImplementation((listener) => {
    const release = subscribe(listener);
    return () => {
      unsubscribe();
      release();
    };
  });
  const { result, rerender, unmount } = renderHook(({ store }) => useOverlayLayers(store), {
    initialProps: { store: first },
  });
  act(() => {
    firstOwner.replaceLayer(scope, 'metrics', [note(1)]);
  });
  expect(result.current).toBe(first.getState().layers);
  rerender({ store: second });
  expect(unsubscribe).toHaveBeenCalledOnce();
  expect(result.current).toBe(second.getState().layers);
  act(() => {
    firstOwner.upsertEntries(scope, 'metrics', [note(3)]);
  });
  expect(result.current).toBe(second.getState().layers);
  unmount();
  expect(unsubscribeSecond).toHaveBeenCalledOnce();
  // The hook is a subscriber; it never owns or disposes a supplied store.
  expect(secondOwner.upsertEntries(scope, 'metrics', [note(4)]).status).toBe('applied');
});

it('keeps an empty snapshot stable when no store is attached', () => {
  const { result, rerender } = renderHook(() => useOverlayLayers(undefined));
  const empty = result.current;
  rerender();
  expect(result.current).toBe(empty);
  expect(empty).toEqual([]);
});

it('observes a write between rendering and attaching the subscription', () => {
  const store = createStore();
  const owner = store.getState().createOwner()!;
  const subscribe = store.subscribe;
  vi.spyOn(store, 'subscribe').mockImplementation((listener) => {
    owner.replaceLayer(scope, 'metrics', [note(42)]);
    return subscribe(listener);
  });
  const { result } = renderHook(() => useOverlayLayers(store));
  expect(result.current).toBe(store.getState().layers);
  expect(result.current[0].entries[0]).toEqual(note(42));
});
