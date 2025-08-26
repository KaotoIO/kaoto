import { renderHook, waitFor } from '@testing-library/react';
import { IClipboardCopyObject } from './copy-step.hook';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { ClipboardManager } from '../../../../utils/ClipboardManager';
import { SourceSchemaType } from '../../../../models/camel/source-schema-type';
import { usePasteStep } from './paste-step.hook';
import { FunctionComponent, PropsWithChildren } from 'react';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { CatalogModalContext } from '../../../../providers/catalog-modal.provider';
import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
import { createVisualizationNode } from '../../../../models/visualization/visualization-node';

// Mock the permission API
Object.assign(navigator, {
  permissions: {
    query: jest.fn(),
  },
});

describe('usePasteStep', () => {
  const camelResource = new CamelRouteResource();
  const getCompatibleComponentsSpy = jest.spyOn(camelResource, 'getCompatibleComponents');
  const getTypeSpy = jest.spyOn(camelResource, 'getType').mockReturnValue(SourceSchemaType.RouteYAML);
  const mockEntitiesContext = {
    camelResource,
    entities: camelResource.getEntities(),
    visualEntities: camelResource.getVisualEntities(),
    currentSchemaType: camelResource.getType(),
    updateSourceCodeFromEntities: jest.fn(),
    updateEntitiesFromCamelResource: jest.fn(),
  };

  // Mock CatalogModalContext
  const mockCatalogModalContext = {
    setIsModalOpen: jest.fn(),
    getNewComponent: jest.fn(),
    checkCompatibility: jest.fn(),
  };

  const copiedContent = {
    type: SourceSchemaType.RouteYAML,
    name: 'log',
    definition: { id: 'test', message: 'hello' },
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <EntitiesContext.Provider value={mockEntitiesContext}>
      <CatalogModalContext.Provider value={mockCatalogModalContext}>{children}</CatalogModalContext.Provider>
    </EntitiesContext.Provider>
  );

  it('should return the isCompatible false', async () => {
    jest.spyOn(navigator.permissions, 'query').mockResolvedValueOnce({ state: 'granted' } as PermissionStatus);
    jest.spyOn(ClipboardManager, 'paste').mockResolvedValueOnce(null);

    const vizNode = createVisualizationNode('test', {});
    const { result } = renderHook(() => usePasteStep(vizNode, AddStepMode.InsertChildStep), { wrapper });

    await waitFor(() => {
      expect(result.current.isCompatible).toBe(false);
    });

    expect(navigator.permissions.query as jest.Mock).toHaveBeenCalledTimes(1);
  });

  it('should return the isCompatible true when clipboard-read permission returns rejected', async () => {
    jest.spyOn(navigator.permissions, 'query').mockRejectedValueOnce(new Error('Permission error'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const vizNode = createVisualizationNode('test', {});
    const { result } = renderHook(() => usePasteStep(vizNode, AddStepMode.InsertChildStep), { wrapper });
    // Initially, isCompatible should be false
    expect(result.current.isCompatible).toBe(false);

    await waitFor(() => {
      expect(result.current.isCompatible).toBe(true);
    });

    expect(navigator.permissions.query as jest.Mock).toHaveBeenCalledTimes(1);
  });

  it('should call pasteBaseEntityStep() and updateEntitiesFromCamelResource()', async () => {
    jest.spyOn(navigator.permissions, 'query').mockResolvedValue({ state: 'granted' } as PermissionStatus);
    const mockVizNode = {
      getComponentSchema: jest.fn(),
      pasteBaseEntityStep: jest.fn(),
    } as unknown as IVisualizationNode;

    // Mock the ClipboardManager.paste() to return a valid content
    const pasteSpy = jest
      .spyOn(ClipboardManager, 'paste')
      .mockImplementation(async () => Promise.resolve(copiedContent as IClipboardCopyObject));
    // Mock the compatibility check to return true
    jest.spyOn(mockCatalogModalContext, 'checkCompatibility').mockReturnValue(true);

    const { result } = renderHook(() => usePasteStep(mockVizNode, AddStepMode.AppendStep), { wrapper });
    await waitFor(() => {
      expect(result.current.isCompatible).toBe(true);
      // ClipboardManager.paste() called 1st time to check the paste compatibilty
      expect(pasteSpy).toHaveBeenCalledTimes(1);
      expect(getCompatibleComponentsSpy).toHaveBeenCalledTimes(1);
      expect(getTypeSpy).toHaveBeenCalledTimes(1);
      expect(mockCatalogModalContext.checkCompatibility as jest.Mock).toHaveBeenCalledTimes(1);
    });

    await result.current.onPasteStep();
    // ClipboardManager.paste() called another time by the onPasteStep() execution
    expect(pasteSpy).toHaveBeenCalledTimes(2);
    expect(getCompatibleComponentsSpy).toHaveBeenCalledTimes(2);
    expect(getTypeSpy).toHaveBeenCalledTimes(2);
    expect(mockCatalogModalContext.checkCompatibility as jest.Mock).toHaveBeenCalledTimes(2);
    expect(mockVizNode.pasteBaseEntityStep as jest.Mock).toHaveBeenCalledTimes(1);
    expect(mockEntitiesContext.updateEntitiesFromCamelResource as jest.Mock).toHaveBeenCalledTimes(1);
  });

  it('should not call pasteBaseEntityStep() and updateEntitiesFromCamelResource()', async () => {
    jest.spyOn(navigator.permissions, 'query').mockRejectedValueOnce(new Error('Permission error'));
    const mockVizNode = {
      pasteBaseEntityStep: jest.fn(),
    } as unknown as IVisualizationNode;

    // Mock the ClipboardManager.paste() to return a content which isn't compatible
    const pasteSpy = jest.spyOn(ClipboardManager, 'paste').mockImplementation(async () =>
      Promise.resolve({
        type: SourceSchemaType.Pipe,
        name: 'log',
        definition: { id: 'test', message: 'hello' },
      } as IClipboardCopyObject),
    );

    const { result } = renderHook(() => usePasteStep(mockVizNode, AddStepMode.AppendStep), { wrapper });
    await waitFor(() => {
      // ClipboardManager.paste() call skipped as the permission query failed
      expect(pasteSpy).toHaveBeenCalledTimes(0);
      // Compatibility set to true intentionally
      expect(result.current.isCompatible).toBe(true);
    });

    await result.current.onPasteStep();
    // ClipboardManager.paste() called first time by the onPasteStep() execution
    expect(pasteSpy).toHaveBeenCalledTimes(1);
    expect(getTypeSpy).toHaveBeenCalledTimes(1);
    expect(mockVizNode.pasteBaseEntityStep as jest.Mock).toHaveBeenCalledTimes(0);
    expect(mockEntitiesContext.updateEntitiesFromCamelResource as jest.Mock).toHaveBeenCalledTimes(0);
  });
});
