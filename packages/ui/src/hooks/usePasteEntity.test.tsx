import { act, renderHook, waitFor } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';
import type { Mock } from 'vitest';

import { CamelRouteResource } from '../models/camel/camel-route-resource';
import { SourceSchemaType } from '../models/camel/source-schema-type';
import { IClipboardCopyObject } from '../models/visualization/clipboard';
import { VisualFlowsApi } from '../models/visualization/flows/support/flows-visibility';
import {
  ACTION_ID_CANCEL,
  ACTION_ID_CONFIRM,
  ActionConfirmationModalContext,
} from '../providers/action-confirmation-modal.provider';
import { TestProvidersWrapper } from '../stubs';
import { ClipboardManager } from '../utils/ClipboardManager';
import { usePasteEntity } from './usePasteEntity';

// Mock the permission API
Object.assign(navigator, {
  permissions: {
    query: vi.fn(),
  },
});

describe('usePasteEntity', () => {
  let camelResource: CamelRouteResource;
  let addNewEntitySpy: SpyInstance;
  let removeEntitySpy: SpyInstance;
  let supportsMultipleVisualEntitiesSpy: SpyInstance;
  let updateEntitiesFromCamelResourceSpy: Mock;
  let toggleFlowVisibleSpy: SpyInstance;

  const mockActionConfirmationContext = {
    actionConfirmation: vi.fn(),
  };

  const copiedRouteContent: IClipboardCopyObject = {
    type: SourceSchemaType.Route,
    name: 'route',
    definition: { id: 'test-route', from: { uri: 'timer:tick' } },
  };

  beforeEach(() => {
    camelResource = new CamelRouteResource();
    camelResource.initialize();
    addNewEntitySpy = vi.spyOn(camelResource, 'addNewEntity');
    removeEntitySpy = vi.spyOn(camelResource, 'removeEntity');
    vi.spyOn(camelResource, 'getType').mockReturnValue(SourceSchemaType.Route);
    supportsMultipleVisualEntitiesSpy = vi.spyOn(camelResource, 'supportsMultipleVisualEntities').mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => {
    const visualFlowsApi = new VisualFlowsApi(vi.fn());
    toggleFlowVisibleSpy = vi.spyOn(visualFlowsApi, 'toggleFlowVisible');
    const { Provider, updateEntitiesFromCamelResourceSpy: updateSpy } = TestProvidersWrapper({
      camelResource,
      visibleFlowsContext: {
        allFlowsVisible: true,
        visibleFlows: {},
        visualFlowsApi,
      },
    });
    updateEntitiesFromCamelResourceSpy = updateSpy;
    return (
      <Provider>
        <ActionConfirmationModalContext.Provider value={mockActionConfirmationContext}>
          {children}
        </ActionConfirmationModalContext.Provider>
      </Provider>
    );
  };

  it('should return isCompatible false when clipboard is empty', async () => {
    vi.spyOn(navigator.permissions, 'query').mockResolvedValueOnce({ state: 'granted' } as PermissionStatus);
    vi.spyOn(ClipboardManager, 'paste').mockResolvedValueOnce(null);

    const { result } = renderHook(() => usePasteEntity(), { wrapper });

    await waitFor(() => {
      expect(result.current.isCompatible).toBe(false);
    });
  });

  it('should return isCompatible true when clipboard-read permission returns rejected (Firefox fallback)', async () => {
    vi.spyOn(navigator.permissions, 'query').mockRejectedValueOnce(new Error('Permission error'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => usePasteEntity(), { wrapper });

    expect(result.current.isCompatible).toBe(false);

    await waitFor(() => {
      expect(result.current.isCompatible).toBe(true);
    });
  });

  it('should return isCompatible true when clipboard has compatible Route content', async () => {
    vi.spyOn(navigator.permissions, 'query').mockResolvedValueOnce({ state: 'granted' } as PermissionStatus);
    vi.spyOn(ClipboardManager, 'paste').mockResolvedValueOnce(copiedRouteContent);

    const { result } = renderHook(() => usePasteEntity(), { wrapper });

    await waitFor(() => {
      expect(result.current.isCompatible).toBe(true);
    });
  });

  it('should return isCompatible false when clipboard has incompatible content', async () => {
    vi.spyOn(navigator.permissions, 'query').mockResolvedValueOnce({ state: 'granted' } as PermissionStatus);
    vi.spyOn(ClipboardManager, 'paste').mockResolvedValueOnce({
      type: SourceSchemaType.Pipe,
      name: 'pipe',
      definition: {},
    });

    const { result } = renderHook(() => usePasteEntity(), { wrapper });

    await waitFor(() => {
      expect(result.current.isCompatible).toBe(false);
    });
  });

  it('should show error modal when clipboard is empty on paste', async () => {
    vi.spyOn(navigator.permissions, 'query').mockRejectedValueOnce(new Error('Permission error'));
    vi.spyOn(ClipboardManager, 'paste').mockResolvedValueOnce(null);

    const { result } = renderHook(() => usePasteEntity(), { wrapper });

    await waitFor(() => {
      expect(result.current.isCompatible).toBe(true);
    });

    await act(async () => {
      await result.current.onPasteEntity();
    });

    expect(mockActionConfirmationContext.actionConfirmation).toHaveBeenCalledWith({
      title: 'Invalid Paste Action',
      text: 'No valid content found in clipboard.',
      buttonOptions: {},
    });
  });

  it('should show error modal when clipboard content is incompatible', async () => {
    vi.spyOn(navigator.permissions, 'query').mockRejectedValueOnce(new Error('Permission error'));
    vi.spyOn(ClipboardManager, 'paste').mockResolvedValueOnce({
      type: SourceSchemaType.Pipe,
      name: 'pipe',
      definition: {},
    });

    const { result } = renderHook(() => usePasteEntity(), { wrapper });

    await waitFor(() => {
      expect(result.current.isCompatible).toBe(true);
    });

    await act(async () => {
      await result.current.onPasteEntity();
    });

    expect(mockActionConfirmationContext.actionConfirmation).toHaveBeenCalledWith({
      title: 'Invalid Paste Action',
      text: 'Pasted entity is not compatible with the current resource type.',
      buttonOptions: {},
    });
  });

  it('should paste entity and make it visible', async () => {
    vi.spyOn(navigator.permissions, 'query').mockResolvedValueOnce({ state: 'granted' } as PermissionStatus);
    vi.spyOn(ClipboardManager, 'paste').mockResolvedValue(copiedRouteContent);
    addNewEntitySpy.mockReturnValue('new-route-id');

    const { result } = renderHook(() => usePasteEntity(), { wrapper });

    await waitFor(() => {
      expect(result.current.isCompatible).toBe(true);
    });

    await act(async () => {
      await result.current.onPasteEntity();
    });

    expect(addNewEntitySpy).toHaveBeenCalled();
    expect(toggleFlowVisibleSpy).toHaveBeenCalledWith('new-route-id');
    expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalled();
  });

  describe('single-entity resources', () => {
    beforeEach(() => {
      supportsMultipleVisualEntitiesSpy.mockReturnValue(false);
    });

    afterEach(() => {
      supportsMultipleVisualEntitiesSpy.mockReturnValue(true);
    });

    it('should prompt for replacement when pasting to single-entity resource with existing entity', async () => {
      vi.spyOn(navigator.permissions, 'query').mockResolvedValueOnce({ state: 'granted' } as PermissionStatus);
      vi.spyOn(ClipboardManager, 'paste').mockResolvedValue(copiedRouteContent);
      vi.spyOn(camelResource, 'getVisualEntities').mockReturnValue([{ id: 'existing-entity' }] as never);
      mockActionConfirmationContext.actionConfirmation.mockResolvedValue(ACTION_ID_CONFIRM);
      addNewEntitySpy.mockReturnValue('new-route-id');

      const { result } = renderHook(() => usePasteEntity(), { wrapper });

      await waitFor(() => {
        expect(result.current.isCompatible).toBe(true);
      });

      await act(async () => {
        await result.current.onPasteEntity();
      });

      expect(mockActionConfirmationContext.actionConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Replace Existing Entity?',
        }),
      );
      expect(removeEntitySpy).toHaveBeenCalledWith(['existing-entity']);
      expect(addNewEntitySpy).toHaveBeenCalled();
    });

    it('should not paste when user cancels replacement', async () => {
      vi.spyOn(navigator.permissions, 'query').mockResolvedValueOnce({ state: 'granted' } as PermissionStatus);
      vi.spyOn(ClipboardManager, 'paste').mockResolvedValue(copiedRouteContent);
      vi.spyOn(camelResource, 'getVisualEntities').mockReturnValue([{ id: 'existing-entity' }] as never);
      mockActionConfirmationContext.actionConfirmation.mockResolvedValue(ACTION_ID_CANCEL);

      const { result } = renderHook(() => usePasteEntity(), { wrapper });

      await waitFor(() => {
        expect(result.current.isCompatible).toBe(true);
      });

      await act(async () => {
        await result.current.onPasteEntity();
      });

      expect(mockActionConfirmationContext.actionConfirmation).toHaveBeenCalled();
      expect(removeEntitySpy).not.toHaveBeenCalled();
      expect(addNewEntitySpy).not.toHaveBeenCalled();
    });

    it('should paste to single-entity resource when no existing entities', async () => {
      vi.spyOn(navigator.permissions, 'query').mockResolvedValueOnce({ state: 'granted' } as PermissionStatus);
      vi.spyOn(ClipboardManager, 'paste').mockResolvedValue(copiedRouteContent);
      vi.spyOn(camelResource, 'getVisualEntities').mockReturnValue([]);
      addNewEntitySpy.mockReturnValue('new-route-id');

      const { result } = renderHook(() => usePasteEntity(), { wrapper });

      await waitFor(() => {
        expect(result.current.isCompatible).toBe(true);
      });

      await act(async () => {
        await result.current.onPasteEntity();
      });

      expect(mockActionConfirmationContext.actionConfirmation).not.toHaveBeenCalled();
      expect(removeEntitySpy).not.toHaveBeenCalled();
      expect(addNewEntitySpy).toHaveBeenCalled();
      expect(toggleFlowVisibleSpy).toHaveBeenCalledWith('new-route-id');
    });
  });

  it('should handle null entitiesContext gracefully', async () => {
    const wrapperWithoutEntities: FunctionComponent<PropsWithChildren> = ({ children }) => {
      const { Provider } = TestProvidersWrapper({ camelResource, entitiesContextValue: null });
      return (
        <Provider>
          <ActionConfirmationModalContext.Provider value={mockActionConfirmationContext}>
            {children}
          </ActionConfirmationModalContext.Provider>
        </Provider>
      );
    };

    vi.spyOn(navigator.permissions, 'query').mockResolvedValueOnce({ state: 'granted' } as PermissionStatus);
    vi.spyOn(ClipboardManager, 'paste').mockResolvedValue(copiedRouteContent);

    const { result } = renderHook(() => usePasteEntity(), { wrapper: wrapperWithoutEntities });

    await waitFor(() => {
      expect(result.current.isCompatible).toBe(false);
    });

    await act(async () => {
      await result.current.onPasteEntity();
    });

    expect(addNewEntitySpy).not.toHaveBeenCalled();
  });

  describe('should handle null actionConfirmationContext', () => {
    const wrapperWithoutActionConfirmation: FunctionComponent<PropsWithChildren> = ({ children }) => {
      const { Provider } = TestProvidersWrapper({ camelResource });
      return <Provider>{children}</Provider>;
    };

    it('when clipboard is empty', async () => {
      vi.spyOn(navigator.permissions, 'query').mockResolvedValueOnce({ state: 'granted' } as PermissionStatus);
      vi.spyOn(ClipboardManager, 'paste').mockResolvedValue(null);

      const { result } = renderHook(() => usePasteEntity(), { wrapper: wrapperWithoutActionConfirmation });

      await waitFor(() => {
        expect(result.current.isCompatible).toBe(false);
      });

      await act(async () => {
        await result.current.onPasteEntity();
      });

      expect(addNewEntitySpy).not.toHaveBeenCalled();
    });

    it('when content is incompatible', async () => {
      vi.spyOn(navigator.permissions, 'query').mockResolvedValueOnce({ state: 'granted' } as PermissionStatus);
      vi.spyOn(ClipboardManager, 'paste').mockResolvedValue({
        type: SourceSchemaType.Pipe,
        name: 'pipe',
        definition: {},
      });

      const { result } = renderHook(() => usePasteEntity(), { wrapper: wrapperWithoutActionConfirmation });

      await waitFor(() => {
        expect(result.current.isCompatible).toBe(false);
      });

      await act(async () => {
        await result.current.onPasteEntity();
      });

      expect(addNewEntitySpy).not.toHaveBeenCalled();
    });

    it('when replacing single-entity', async () => {
      supportsMultipleVisualEntitiesSpy.mockReturnValue(false);
      vi.spyOn(navigator.permissions, 'query').mockResolvedValueOnce({ state: 'granted' } as PermissionStatus);
      vi.spyOn(ClipboardManager, 'paste').mockResolvedValue(copiedRouteContent);
      vi.spyOn(camelResource, 'getVisualEntities').mockReturnValue([{ id: 'existing-entity' }] as never);

      const { result } = renderHook(() => usePasteEntity(), { wrapper: wrapperWithoutActionConfirmation });

      await waitFor(() => {
        expect(result.current.isCompatible).toBe(true);
      });

      await act(async () => {
        await result.current.onPasteEntity();
      });

      expect(removeEntitySpy).not.toHaveBeenCalled();
      expect(addNewEntitySpy).not.toHaveBeenCalled();
      supportsMultipleVisualEntitiesSpy.mockReturnValue(true);
    });
  });

  it('should not toggle flow visibility when newId is empty', async () => {
    vi.spyOn(navigator.permissions, 'query').mockResolvedValueOnce({ state: 'granted' } as PermissionStatus);
    vi.spyOn(ClipboardManager, 'paste').mockResolvedValue(copiedRouteContent);
    addNewEntitySpy.mockReturnValue('');

    const { result } = renderHook(() => usePasteEntity(), { wrapper });

    await waitFor(() => {
      expect(result.current.isCompatible).toBe(true);
    });

    await act(async () => {
      await result.current.onPasteEntity();
    });

    expect(addNewEntitySpy).toHaveBeenCalled();
    expect(toggleFlowVisibleSpy).not.toHaveBeenCalled();
    expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalled();
  });
});
