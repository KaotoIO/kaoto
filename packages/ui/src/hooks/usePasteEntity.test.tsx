import { act, renderHook, waitFor } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import { CamelRouteResource } from '../models/camel/camel-route-resource';
import { SourceSchemaType } from '../models/camel/source-schema-type';
import { IClipboardCopyObject } from '../models/visualization/clipboard';
import {
  ACTION_ID_CANCEL,
  ACTION_ID_CONFIRM,
  ActionConfirmationModalContext,
} from '../providers/action-confirmation-modal.provider';
import { EntitiesContext } from '../providers/entities.provider';
import { VisibleFlowsContext, VisibleFlowsContextResult } from '../providers/visible-flows.provider';
import { ClipboardManager } from '../utils/ClipboardManager';
import { usePasteEntity } from './usePasteEntity';

// Mock the permission API
Object.assign(navigator, {
  permissions: {
    query: jest.fn(),
  },
});

describe('usePasteEntity', () => {
  const camelResource = new CamelRouteResource();
  const addNewEntitySpy = jest.spyOn(camelResource, 'addNewEntity');
  const removeEntitySpy = jest.spyOn(camelResource, 'removeEntity');
  jest.spyOn(camelResource, 'getType').mockReturnValue(SourceSchemaType.Route);
  const supportsMultipleVisualEntitiesSpy = jest
    .spyOn(camelResource, 'supportsMultipleVisualEntities')
    .mockReturnValue(true);

  const mockEntitiesContext = {
    camelResource,
    entities: camelResource.getEntities(),
    visualEntities: camelResource.getVisualEntities(),
    currentSchemaType: camelResource.getType(),
    updateSourceCodeFromEntities: jest.fn(),
    updateEntitiesFromCamelResource: jest.fn(),
  };

  const mockVisibleFlowsContext = {
    visibleFlows: {},
    allFlowsVisible: true,
    visualFlowsApi: {
      toggleFlowVisible: jest.fn(),
      showFlows: jest.fn(),
      hideFlows: jest.fn(),
      clearFlows: jest.fn(),
      initVisibleFlows: jest.fn(),
      renameFlow: jest.fn(),
    } as unknown as VisibleFlowsContextResult['visualFlowsApi'],
  };

  const mockActionConfirmationContext = {
    actionConfirmation: jest.fn(),
  };

  const copiedRouteContent: IClipboardCopyObject = {
    type: SourceSchemaType.Route,
    name: 'route',
    definition: { id: 'test-route', from: { uri: 'timer:tick' } },
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <EntitiesContext.Provider value={mockEntitiesContext}>
      <VisibleFlowsContext.Provider value={mockVisibleFlowsContext}>
        <ActionConfirmationModalContext.Provider value={mockActionConfirmationContext}>
          {children}
        </ActionConfirmationModalContext.Provider>
      </VisibleFlowsContext.Provider>
    </EntitiesContext.Provider>
  );

  it('should return isCompatible false when clipboard is empty', async () => {
    jest.spyOn(navigator.permissions, 'query').mockResolvedValueOnce({ state: 'granted' } as PermissionStatus);
    jest.spyOn(ClipboardManager, 'paste').mockResolvedValueOnce(null);

    const { result } = renderHook(() => usePasteEntity(), { wrapper });

    await waitFor(() => {
      expect(result.current.isCompatible).toBe(false);
    });
  });

  it('should return isCompatible true when clipboard-read permission returns rejected (Firefox fallback)', async () => {
    jest.spyOn(navigator.permissions, 'query').mockRejectedValueOnce(new Error('Permission error'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => usePasteEntity(), { wrapper });

    expect(result.current.isCompatible).toBe(false);

    await waitFor(() => {
      expect(result.current.isCompatible).toBe(true);
    });
  });

  it('should return isCompatible true when clipboard has compatible Route content', async () => {
    jest.spyOn(navigator.permissions, 'query').mockResolvedValueOnce({ state: 'granted' } as PermissionStatus);
    jest.spyOn(ClipboardManager, 'paste').mockResolvedValueOnce(copiedRouteContent);

    const { result } = renderHook(() => usePasteEntity(), { wrapper });

    await waitFor(() => {
      expect(result.current.isCompatible).toBe(true);
    });
  });

  it('should return isCompatible false when clipboard has incompatible content', async () => {
    jest.spyOn(navigator.permissions, 'query').mockResolvedValueOnce({ state: 'granted' } as PermissionStatus);
    jest.spyOn(ClipboardManager, 'paste').mockResolvedValueOnce({
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
    jest.spyOn(navigator.permissions, 'query').mockRejectedValueOnce(new Error('Permission error'));
    jest.spyOn(ClipboardManager, 'paste').mockResolvedValueOnce(null);

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
    jest.spyOn(navigator.permissions, 'query').mockRejectedValueOnce(new Error('Permission error'));
    jest.spyOn(ClipboardManager, 'paste').mockResolvedValueOnce({
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
    jest.spyOn(navigator.permissions, 'query').mockResolvedValueOnce({ state: 'granted' } as PermissionStatus);
    jest.spyOn(ClipboardManager, 'paste').mockResolvedValue(copiedRouteContent);
    addNewEntitySpy.mockReturnValue('new-route-id');

    const { result } = renderHook(() => usePasteEntity(), { wrapper });

    await waitFor(() => {
      expect(result.current.isCompatible).toBe(true);
    });

    await act(async () => {
      await result.current.onPasteEntity();
    });

    expect(addNewEntitySpy).toHaveBeenCalled();
    expect(mockVisibleFlowsContext.visualFlowsApi.toggleFlowVisible).toHaveBeenCalledWith('new-route-id');
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
  });

  describe('single-entity resources', () => {
    beforeEach(() => {
      supportsMultipleVisualEntitiesSpy.mockReturnValue(false);
    });

    afterEach(() => {
      supportsMultipleVisualEntitiesSpy.mockReturnValue(true);
    });

    it('should prompt for replacement when pasting to single-entity resource with existing entity', async () => {
      jest.spyOn(navigator.permissions, 'query').mockResolvedValueOnce({ state: 'granted' } as PermissionStatus);
      jest.spyOn(ClipboardManager, 'paste').mockResolvedValue(copiedRouteContent);
      jest.spyOn(camelResource, 'getVisualEntities').mockReturnValue([{ id: 'existing-entity' }] as never);
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
      jest.spyOn(navigator.permissions, 'query').mockResolvedValueOnce({ state: 'granted' } as PermissionStatus);
      jest.spyOn(ClipboardManager, 'paste').mockResolvedValue(copiedRouteContent);
      jest.spyOn(camelResource, 'getVisualEntities').mockReturnValue([{ id: 'existing-entity' }] as never);
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
      jest.spyOn(navigator.permissions, 'query').mockResolvedValueOnce({ state: 'granted' } as PermissionStatus);
      jest.spyOn(ClipboardManager, 'paste').mockResolvedValue(copiedRouteContent);
      jest.spyOn(camelResource, 'getVisualEntities').mockReturnValue([]);
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
      expect(mockVisibleFlowsContext.visualFlowsApi.toggleFlowVisible).toHaveBeenCalledWith('new-route-id');
    });
  });

  it('should handle null entitiesContext gracefully', async () => {
    const wrapperWithoutEntities: FunctionComponent<PropsWithChildren> = ({ children }) => (
      <VisibleFlowsContext.Provider value={mockVisibleFlowsContext}>
        <ActionConfirmationModalContext.Provider value={mockActionConfirmationContext}>
          {children}
        </ActionConfirmationModalContext.Provider>
      </VisibleFlowsContext.Provider>
    );

    jest.spyOn(navigator.permissions, 'query').mockResolvedValueOnce({ state: 'granted' } as PermissionStatus);
    jest.spyOn(ClipboardManager, 'paste').mockResolvedValue(copiedRouteContent);

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
    const wrapperWithoutActionConfirmation: FunctionComponent<PropsWithChildren> = ({ children }) => (
      <EntitiesContext.Provider value={mockEntitiesContext}>
        <VisibleFlowsContext.Provider value={mockVisibleFlowsContext}>{children}</VisibleFlowsContext.Provider>
      </EntitiesContext.Provider>
    );

    it('when clipboard is empty', async () => {
      jest.spyOn(navigator.permissions, 'query').mockResolvedValueOnce({ state: 'granted' } as PermissionStatus);
      jest.spyOn(ClipboardManager, 'paste').mockResolvedValue(null);

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
      jest.spyOn(navigator.permissions, 'query').mockResolvedValueOnce({ state: 'granted' } as PermissionStatus);
      jest.spyOn(ClipboardManager, 'paste').mockResolvedValue({
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
      jest.spyOn(navigator.permissions, 'query').mockResolvedValueOnce({ state: 'granted' } as PermissionStatus);
      jest.spyOn(ClipboardManager, 'paste').mockResolvedValue(copiedRouteContent);
      jest.spyOn(camelResource, 'getVisualEntities').mockReturnValue([{ id: 'existing-entity' }] as never);

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
    jest.spyOn(navigator.permissions, 'query').mockResolvedValueOnce({ state: 'granted' } as PermissionStatus);
    jest.spyOn(ClipboardManager, 'paste').mockResolvedValue(copiedRouteContent);
    addNewEntitySpy.mockReturnValue('');

    const { result } = renderHook(() => usePasteEntity(), { wrapper });

    await waitFor(() => {
      expect(result.current.isCompatible).toBe(true);
    });

    await act(async () => {
      await result.current.onPasteEntity();
    });

    expect(addNewEntitySpy).toHaveBeenCalled();
    expect(mockVisibleFlowsContext.visualFlowsApi.toggleFlowVisible).not.toHaveBeenCalled();
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
  });
});
