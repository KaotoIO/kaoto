import { renderHook, waitFor } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import { CatalogModalContext } from '../../../../dynamic-catalog/catalog-modal.provider';
import { CatalogKind } from '../../../../models';
import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
import { SourceSchemaType } from '../../../../models/camel/source-schema-type';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { IClipboardCopyObject } from '../../../../models/visualization/clipboard';
import { CamelComponentSchemaService } from '../../../../models/visualization/flows/support/camel-component-schema.service';
import { CamelRouteVisualEntityData } from '../../../../models/visualization/flows/support/camel-component-types';
import { createVisualizationNode } from '../../../../models/visualization/visualization-node';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { ClipboardManager } from '../../../../utils/ClipboardManager';
import { usePasteStep } from './paste-step.hook';

const mockController = {
  fromModel: jest.fn(),
};

jest.mock('@patternfly/react-topology', () => ({
  useVisualizationController: () => mockController,
}));

// Mock the permission API
Object.assign(navigator, {
  permissions: {
    query: jest.fn(),
  },
});

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
    jest.spyOn(navigator.permissions, 'query').mockResolvedValueOnce({ state: 'granted' } as PermissionStatus);
    jest.spyOn(ClipboardManager, 'paste').mockResolvedValueOnce(null);

    const vizNode = createVisualizationNode('test', { catalogKind: CatalogKind.Processor, name: 'test' });
    const { result } = renderHook(() => usePasteStep(vizNode, AddStepMode.InsertChildStep), { wrapper });

    await waitFor(() => {
      expect(result.current.isCompatible).toBe(false);
    });

    expect(navigator.permissions.query as jest.Mock).toHaveBeenCalledTimes(1);
  });

  it('should return the isCompatible true when clipboard-read permission returns rejected', async () => {
    jest.spyOn(navigator.permissions, 'query').mockRejectedValueOnce(new Error('Permission error'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const vizNode = createVisualizationNode('test', { catalogKind: CatalogKind.Processor, name: 'test' });
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
      getNodeSchema: jest.fn(),
      getNodeDefinition: jest.fn(),
      pasteBaseEntityStep: jest.fn(),
    } as unknown as IVisualizationNode;

    // Mock the ClipboardManager.paste() to return a valid content
    const pasteSpy = jest
      .spyOn(ClipboardManager, 'paste')
      .mockImplementation(async () => copiedContent as IClipboardCopyObject);
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
    const pasteSpy = jest.spyOn(ClipboardManager, 'paste').mockImplementation(
      async () =>
        ({
          type: SourceSchemaType.Pipe,
          name: 'log',
          definition: { id: 'test', message: 'hello' },
        }) as IClipboardCopyObject,
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

  describe('onPasteStep', () => {
    const mockChoiceVizNode = createVisualizationNode('choice', {
      catalogKind: CatalogKind.Processor,
      name: 'choice',
      processorName: 'choice',
    });
    mockChoiceVizNode.pasteBaseEntityStep = jest.fn();

    const getProcessorStepsPropertiesMock = jest.spyOn(CamelComponentSchemaService, 'getProcessorStepsProperties');

    const whenContent = {
      type: SourceSchemaType.Route,
      name: 'when',
      definition: {
        steps: [],
        simple: {
          expression: '${header.foo} == 1',
        },
      },
    } as IClipboardCopyObject;

    beforeEach(() => {
      // Mock the ClipboardManager.paste() to return a content which isn't compatible
      jest.spyOn(ClipboardManager, 'paste').mockResolvedValue(whenContent);
      // Mock the compatibility check to return true
      jest.spyOn(mockCatalogModalContext, 'checkCompatibility').mockReturnValue(true);
      mockController.fromModel.mockClear();
    });

    it('should paste step with InsertSpecialChildStep mode', async () => {
      mockChoiceVizNode.getChildren = jest.fn().mockReturnValue(undefined);

      const { result } = renderHook(() => usePasteStep(mockChoiceVizNode, AddStepMode.InsertSpecialChildStep), {
        wrapper,
      });

      await result.current.onPasteStep();

      expect(mockChoiceVizNode.pasteBaseEntityStep).toHaveBeenCalledWith(
        whenContent,
        AddStepMode.InsertSpecialChildStep,
      );

      expect(getProcessorStepsPropertiesMock).toHaveBeenCalledWith(
        (mockChoiceVizNode.data as CamelRouteVisualEntityData).processorName,
      );

      expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
    });

    it('should call controller.fromModel() when mode is InsertSpecialChildStep and conditions are met', async () => {
      mockChoiceVizNode.getChildren = jest.fn().mockReturnValue([
        createVisualizationNode('test-when', {
          catalogKind: CatalogKind.Processor,
          name: 'when',
          processorName: 'when',
        }),
      ]);

      getProcessorStepsPropertiesMock.mockReturnValue([
        { name: 'when', type: 'array-clause' },
        { name: 'otherwise', type: 'array-clause' },
      ]);

      const { result } = renderHook(() => usePasteStep(mockChoiceVizNode, AddStepMode.InsertSpecialChildStep), {
        wrapper,
      });

      await result.current.onPasteStep();

      expect(mockController.fromModel).toHaveBeenCalledWith({
        nodes: [],
        edges: [],
      });
    });
  });
});
