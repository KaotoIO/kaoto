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

describe('usePasteStep', () => {
  const camelResource = new CamelRouteResource();
  const getCompatibleComponentsSpy = jest.spyOn(camelResource, 'getCompatibleComponents');
  const getTypeSpy = jest.spyOn(camelResource, 'getType').mockReturnValue(SourceSchemaType.Route);
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
    type: SourceSchemaType.Route,
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
    jest.spyOn(console, 'error').mockImplementation(() => {});
    // Mock the clipboard API to make clipboard read() return error
    Object.assign(navigator, {
      clipboard: {
        read: jest.fn().mockRejectedValue(new Error('Nothing in the Clipboard')),
      },
    });
    const vizNode = createVisualizationNode('test', {});
    const { result } = renderHook(() => usePasteStep(vizNode, AddStepMode.InsertChildStep), { wrapper });
    const { isCompatible } = result.current;

    expect(isCompatible).toBe(false);
    expect(navigator.clipboard.read as jest.Mock).toHaveBeenCalledTimes(1);
  });

  it('should call ClipboardManager.paste', async () => {
    const mockVizNode = {
      getComponentSchema: jest.fn(),
      pasteBaseEntityStep: jest.fn(),
    } as unknown as IVisualizationNode;

    // Mock the ClipboardManager.paste() to return a valid content
    const pasteSpy = jest
      .spyOn(ClipboardManager, 'paste')
      .mockImplementation(async () => Promise.resolve(copiedContent as IClipboardCopyObject));

    const { result } = renderHook(() => usePasteStep(mockVizNode, AddStepMode.AppendStep), { wrapper });
    await waitFor(() => {
      // ClipboardManager.paste() called 1st time to check the paste compatibilty
      expect(pasteSpy).toHaveBeenCalledTimes(1);
      expect(getCompatibleComponentsSpy).toHaveBeenCalledTimes(1);
      expect(getTypeSpy).toHaveBeenCalledTimes(1);
    });

    await result.current.onPasteStep();
    // ClipboardManager.paste() called another time by the onPasteStep() execution
    expect(pasteSpy).toHaveBeenCalledTimes(2);
    expect(mockVizNode.pasteBaseEntityStep as jest.Mock).toHaveBeenCalledTimes(1);
    expect(mockEntitiesContext.updateEntitiesFromCamelResource as jest.Mock).toHaveBeenCalledTimes(1);
  });
});
