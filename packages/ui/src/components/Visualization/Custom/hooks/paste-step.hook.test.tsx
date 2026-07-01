import { renderHook, waitFor } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';
import type { Mock } from 'vitest';

import { CatalogModalContext } from '../../../../dynamic-catalog/catalog-modal.provider';
import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
import { SourceSchemaType } from '../../../../models/camel/source-schema-type';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { IClipboardCopyObject } from '../../../../models/visualization/clipboard';
import { CamelComponentSchemaService } from '../../../../models/visualization/flows/support/camel-component-schema.service';
import { CamelRouteVisualEntityData } from '../../../../models/visualization/flows/support/camel-component-types';
import { createVisualizationNode } from '../../../../models/visualization/visualization-node';
import { EntitiesContext, EntitiesContextResult } from '../../../../providers/entities.provider';
import { createMockEntitiesContext } from '../../../../stubs';
import { ClipboardManager } from '../../../../utils/ClipboardManager';
import { usePasteStep } from './paste-step.hook';

const mockController = {
  fromModel: vi.fn(),
};

vi.mock('@patternfly/react-topology', () => ({
  useVisualizationController: () => mockController,
}));

// Mock the permission API
Object.assign(navigator, {
  permissions: {
    query: vi.fn(),
  },
});

describe('usePasteStep', () => {
  const camelResource = new CamelRouteResource();
  let getCompatibleComponentsSpy: ReturnType<typeof vi.spyOn>;
  let getTypeSpy: ReturnType<typeof vi.spyOn>;
  let mockEntitiesContext: EntitiesContextResult;

  beforeAll(async () => {
    mockEntitiesContext = await createMockEntitiesContext(camelResource);
    getCompatibleComponentsSpy = vi.spyOn(camelResource, 'getCompatibleComponents');
    getTypeSpy = vi.spyOn(camelResource, 'getType').mockReturnValue(SourceSchemaType.Route);
  });

  // Mock CatalogModalContext
  const mockCatalogModalContext = {
    setIsModalOpen: vi.fn(),
    getNewComponent: vi.fn(),
    checkCompatibility: vi.fn(),
  };

  const copiedContent = {
    type: SourceSchemaType.Route,
    name: 'log',
    definition: { id: 'test', message: 'hello' },
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <EntitiesContext.Provider value={mockEntitiesContext}>
      <CatalogModalContext.Provider value={mockCatalogModalContext}>{children}</CatalogModalContext.Provider>
    </EntitiesContext.Provider>
  );

  it('should return the isCompatible false', async () => {
    vi.spyOn(navigator.permissions, 'query').mockResolvedValueOnce({ state: 'granted' } as PermissionStatus);
    vi.spyOn(ClipboardManager, 'paste').mockResolvedValueOnce(null);

    const vizNode = createVisualizationNode('test', {
      name: 'test',
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    });
    const { result } = renderHook(() => usePasteStep(vizNode, AddStepMode.InsertChildStep), { wrapper });

    await waitFor(() => {
      expect(result.current.isCompatible).toBe(false);
    });

    expect(navigator.permissions.query as Mock).toHaveBeenCalledTimes(1);
  });

  it('should return the isCompatible true when clipboard-read permission returns rejected', async () => {
    vi.spyOn(navigator.permissions, 'query').mockRejectedValueOnce(new Error('Permission error'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const vizNode = createVisualizationNode('test', {
      name: 'test',
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    });
    const { result } = renderHook(() => usePasteStep(vizNode, AddStepMode.InsertChildStep), { wrapper });
    // Initially, isCompatible should be false
    expect(result.current.isCompatible).toBe(false);

    await waitFor(() => {
      expect(result.current.isCompatible).toBe(true);
    });

    expect(navigator.permissions.query as Mock).toHaveBeenCalledTimes(1);
  });

  it('should call pasteBaseEntityStep() and updateEntitiesFromCamelResource()', async () => {
    vi.spyOn(navigator.permissions, 'query').mockResolvedValue({ state: 'granted' } as PermissionStatus);
    const mockVizNode = {
      getNodeSchema: vi.fn(),
      getNodeDefinition: vi.fn(),
      pasteBaseEntityStep: vi.fn(),
    } as unknown as IVisualizationNode;

    // Mock the ClipboardManager.paste() to return a valid content
    const pasteSpy = vi
      .spyOn(ClipboardManager, 'paste')
      .mockImplementation(async () => copiedContent as IClipboardCopyObject);
    // Mock the compatibility check to return true
    vi.spyOn(mockCatalogModalContext, 'checkCompatibility').mockReturnValue(true);

    const { result } = renderHook(() => usePasteStep(mockVizNode, AddStepMode.AppendStep), { wrapper });
    await waitFor(() => {
      expect(result.current.isCompatible).toBe(true);
      // ClipboardManager.paste() called 1st time to check the paste compatibilty
      expect(pasteSpy).toHaveBeenCalledTimes(1);
      expect(getCompatibleComponentsSpy).toHaveBeenCalledTimes(1);
      expect(getTypeSpy).toHaveBeenCalledTimes(1);
      expect(mockCatalogModalContext.checkCompatibility as Mock).toHaveBeenCalledTimes(1);
    });

    await result.current.onPasteStep();
    // ClipboardManager.paste() called another time by the onPasteStep() execution
    expect(pasteSpy).toHaveBeenCalledTimes(2);
    expect(getCompatibleComponentsSpy).toHaveBeenCalledTimes(2);
    expect(getTypeSpy).toHaveBeenCalledTimes(2);
    expect(mockCatalogModalContext.checkCompatibility as Mock).toHaveBeenCalledTimes(2);
    expect(mockVizNode.pasteBaseEntityStep as Mock).toHaveBeenCalledTimes(1);
    expect(mockEntitiesContext.updateEntitiesFromCamelResource as Mock).toHaveBeenCalledTimes(1);
  });

  it('should not call pasteBaseEntityStep() and updateEntitiesFromCamelResource()', async () => {
    vi.spyOn(navigator.permissions, 'query').mockRejectedValueOnce(new Error('Permission error'));
    const mockVizNode = {
      pasteBaseEntityStep: vi.fn(),
    } as unknown as IVisualizationNode;

    // Mock the ClipboardManager.paste() to return a content which isn't compatible
    const pasteSpy = vi.spyOn(ClipboardManager, 'paste').mockImplementation(
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
    expect(mockVizNode.pasteBaseEntityStep as Mock).toHaveBeenCalledTimes(0);
    expect(mockEntitiesContext.updateEntitiesFromCamelResource as Mock).toHaveBeenCalledTimes(0);
  });

  describe('onPasteStep', () => {
    const mockChoiceVizNode = createVisualizationNode('choice', {
      name: 'choice',
      processorName: 'choice',
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    });
    mockChoiceVizNode.pasteBaseEntityStep = vi.fn();

    const getProcessorStepsPropertiesMock = vi.spyOn(CamelComponentSchemaService, 'getProcessorStepsProperties');

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
      vi.spyOn(ClipboardManager, 'paste').mockResolvedValue(whenContent);
      // Mock the compatibility check to return true
      vi.spyOn(mockCatalogModalContext, 'checkCompatibility').mockReturnValue(true);
      mockController.fromModel.mockClear();
    });

    it('should paste step with InsertSpecialChildStep mode', async () => {
      mockChoiceVizNode.getChildren = vi.fn().mockReturnValue(undefined);

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
      mockChoiceVizNode.getChildren = vi.fn().mockReturnValue([
        createVisualizationNode('test-when', {
          name: 'when',
          processorName: 'when',
          isPlaceholder: false,
          isGroup: false,
          iconUrl: '',
          title: '',
          description: '',
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
