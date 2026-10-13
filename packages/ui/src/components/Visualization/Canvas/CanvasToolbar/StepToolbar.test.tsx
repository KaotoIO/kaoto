import { RouteDefinition } from '@kaoto/camel-catalog/types';
import { VisualizationProvider } from '@patternfly/react-topology';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { cloneDeep } from 'lodash';
import { ReactNode } from 'react';
import type { Mock } from 'vitest';

import { CatalogModalContext } from '../../../../dynamic-catalog/catalog-modal.provider';
import { DISABLED_NODE_INTERACTION, IVisualizationNode, NodeInteraction } from '../../../../models';
import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
import { ACTION_ID_CONFIRM, ActionConfirmationModalContext } from '../../../../providers';
import { camelRouteJson, camelRouteWithDisabledSteps, TestProvidersWrapper } from '../../../../stubs';
import { createRouteVisualizationController } from '../../../../stubs/route-visualization-controller';
import { StepToolbar } from './StepToolbar';

/** The first step of `camelRouteJson`, followed by a `choice` step */
const SET_HEADER_PATH = 'route.from.steps.0.set-header';
/** The second step of `camelRouteJson`, preceded by a `set-header` step */
const CHOICE_PATH = 'route.from.steps.1.choice';
/** The first step of `camelRouteWithDisabledSteps`, a disabled `log` step */
const DISABLED_LOG_PATH = 'route.from.steps.0.log';

interface RenderToolbarOptions {
  route?: { route: RouteDefinition };
  path?: string;
  interaction?: Partial<NodeInteraction>;
  toolbar?: (vizNode: IVisualizationNode) => ReactNode;
}

describe('StepToolbar', () => {
  let camelResource: CamelRouteResource;
  let vizNode: IVisualizationNode;
  let updateEntitiesFromCamelResourceSpy: Mock;

  const mockCatalogModalContext = {
    setIsModalOpen: vi.fn(),
    getNewComponent: vi.fn(),
    checkCompatibility: vi.fn(),
  };
  const mockActionConfirmationModalContext = {
    actionConfirmation: vi.fn(),
  };

  beforeEach(() => {
    mockCatalogModalContext.getNewComponent.mockReset().mockResolvedValue(undefined);
    mockCatalogModalContext.checkCompatibility.mockReset().mockReturnValue(false);
    mockActionConfirmationModalContext.actionConfirmation.mockReset().mockResolvedValue(ACTION_ID_CONFIRM);
  });

  /**
   * Renders the toolbar of a real visualization node of a real route, with the real step hooks.
   * The node interactions are spied so each test enables only the buttons it is interested in.
   */
  const renderToolbar = async ({
    route = camelRouteJson,
    path = SET_HEADER_PATH,
    interaction = {},
    toolbar = (node) => <StepToolbar vizNode={node} />,
  }: RenderToolbarOptions = {}) => {
    /* The resource is built from a copy, so the steps modified by the toolbar don't leak into the shared stubs */
    camelResource = new CamelRouteResource([cloneDeep(route)]);
    const { Provider, updateEntitiesFromCamelResourceSpy: updateSpy } = await TestProvidersWrapper({ camelResource });
    updateEntitiesFromCamelResourceSpy = updateSpy;

    const { controller, getVizNode } = await createRouteVisualizationController(camelResource);
    vizNode = getVizNode(path);
    vi.spyOn(vizNode, 'getNodeInteraction').mockReturnValue({ ...DISABLED_NODE_INTERACTION, ...interaction });
    vi.spyOn(vizNode, 'getNodeLabel').mockReturnValue('Test Node');

    return render(
      <Provider>
        <VisualizationProvider controller={controller}>
          <CatalogModalContext.Provider value={mockCatalogModalContext}>
            <ActionConfirmationModalContext.Provider value={mockActionConfirmationModalContext}>
              {toolbar(vizNode)}
            </ActionConfirmationModalContext.Provider>
          </CatalogModalContext.Provider>
        </VisualizationProvider>
      </Provider>,
    );
  };

  /** Returns the step names of the route of the rendered resource */
  const getRouteStepNames = () => {
    const { route } = camelResource.getVisualEntities()[0].toJSON() as { route: RouteDefinition };
    return (route.from.steps ?? []).map((step) => Object.keys(step)[0]);
  };

  describe('Rendering', () => {
    it('should render the toolbar with correct data-testid', async () => {
      await renderToolbar({ toolbar: (node) => <StepToolbar vizNode={node} data-testid="test-toolbar" /> });

      expect(screen.getByTestId('test-toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('test-toolbar')).toHaveClass('step-toolbar');
    });

    it('should render no buttons when all interactions are disabled', async () => {
      await renderToolbar();

      expect(screen.queryByTestId('Test Node|step-toolbar-button-duplicate')).not.toBeInTheDocument();
      expect(screen.queryByTestId('Test Node|step-toolbar-button-add-special')).not.toBeInTheDocument();
      expect(screen.queryByTestId('Test Node|step-toolbar-button-disable')).not.toBeInTheDocument();
      expect(screen.queryByTestId('Test Node|step-toolbar-button-enable-all')).not.toBeInTheDocument();
      expect(screen.queryByTestId('Test Node|step-toolbar-button-replace')).not.toBeInTheDocument();
      expect(screen.queryByTestId('Test Node|step-toolbar-button-delete')).not.toBeInTheDocument();
      expect(screen.queryByTestId('Test Node|step-toolbar-button-delete-group')).not.toBeInTheDocument();
    });
  });

  describe('Duplicate button', () => {
    it('should render duplicate button when canDuplicate is true and call onDuplicate when duplicate button is clicked', async () => {
      /* The step copy is compatible as a next step, so it can be duplicated */
      mockCatalogModalContext.checkCompatibility.mockReturnValue(true);
      await renderToolbar({ interaction: { canHaveNextStep: true } });

      const duplicateButton = screen.getByTestId('Test Node|step-toolbar-button-duplicate');
      expect(duplicateButton).toBeInTheDocument();
      expect(duplicateButton).toHaveAttribute('title', 'Duplicate');

      fireEvent.click(duplicateButton);
      await waitFor(() => {
        expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalledTimes(1);
      });
      expect(getRouteStepNames()).toEqual(['set-header', 'set-header', 'choice', 'to']);
    });
  });

  describe('Move button', () => {
    it('should render Move Before button when canBeMoved is true and call onMoveStep when Move button is clicked', async () => {
      await renderToolbar({ path: CHOICE_PATH });

      const moveButton = screen.getByTestId('Test Node|step-toolbar-button-move-before');
      expect(moveButton).toBeInTheDocument();
      expect(moveButton).toHaveAttribute('title', 'Move before');

      fireEvent.click(moveButton);
      await waitFor(() => {
        expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalledTimes(1);
      });
      expect(getRouteStepNames()).toEqual(['choice', 'set-header', 'to']);
    });

    it('should render Move After button when canBeMoved is true and call onMoveStep when Move button is clicked', async () => {
      await renderToolbar({ path: SET_HEADER_PATH });

      const moveButton = screen.getByTestId('Test Node|step-toolbar-button-move-after');
      expect(moveButton).toBeInTheDocument();
      expect(moveButton).toHaveAttribute('title', 'Move after');

      fireEvent.click(moveButton);
      await waitFor(() => {
        expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalledTimes(1);
      });
      expect(getRouteStepNames()).toEqual(['choice', 'set-header', 'to']);
    });
  });

  describe('Add special children button', () => {
    it('should render add special button when canHaveSpecialChildren is true and call onInsertStep when add special button is clicked', async () => {
      await renderToolbar({ path: CHOICE_PATH, interaction: { canHaveSpecialChildren: true } });

      const addSpecialButton = screen.getByTestId('Test Node|step-toolbar-button-add-special');
      expect(addSpecialButton).toBeInTheDocument();
      expect(addSpecialButton).toHaveAttribute('title', 'Add branch');

      fireEvent.click(addSpecialButton);
      /* The real `useInsertStep` opens the catalog to pick the new branch */
      await waitFor(() => {
        expect(mockCatalogModalContext.getNewComponent).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Disable button', () => {
    it('should show "Disable step" title when step is enabled', async () => {
      await renderToolbar({ interaction: { canBeDisabled: true } });

      const disableButton = screen.getByTestId('Test Node|step-toolbar-button-disable');
      expect(disableButton).toHaveAttribute('title', 'Disable step');
    });

    it('should show "Enable step" title when step is disabled', async () => {
      await renderToolbar({
        route: camelRouteWithDisabledSteps,
        path: DISABLED_LOG_PATH,
        interaction: { canBeDisabled: true },
      });

      const disableButton = screen.getByTestId('Test Node|step-toolbar-button-disable');
      expect(disableButton).toHaveAttribute('title', 'Enable step');
    });

    it('should call onToggleDisableNode when disable button is clicked', async () => {
      await renderToolbar({ interaction: { canBeDisabled: true } });

      const disableButton = screen.getByTestId('Test Node|step-toolbar-button-disable');
      fireEvent.click(disableButton);

      expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalledTimes(1);
      expect(vizNode.data.definition).toEqual(expect.objectContaining({ disabled: true }));
    });
  });

  describe('Enable all button', () => {
    it('should render enable all button when areMultipleStepsDisabled is true and call onEnableAllSteps when enable all button is clicked', async () => {
      await renderToolbar({ route: camelRouteWithDisabledSteps, path: DISABLED_LOG_PATH });

      const enableAllButton = screen.getByTestId('Test Node|step-toolbar-button-enable-all');
      expect(enableAllButton).toBeInTheDocument();
      expect(enableAllButton).toHaveAttribute('title', 'Enable all');

      fireEvent.click(enableAllButton);
      expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalledTimes(1);
      const { route } = camelResource.getVisualEntities()[0].toJSON() as { route: RouteDefinition };
      expect(route.from.steps).toEqual([
        { log: expect.objectContaining({ disabled: false }) },
        { to: expect.objectContaining({ disabled: false }) },
      ]);
    });
  });

  describe('Replace button', () => {
    it('should render replace button when canReplaceStep is true and call onReplaceNode when replace button is clicked', async () => {
      await renderToolbar({ interaction: { canReplaceStep: true } });

      const replaceButton = screen.getByTestId('Test Node|step-toolbar-button-replace');
      expect(replaceButton).toBeInTheDocument();
      expect(replaceButton).toHaveAttribute('title', 'Replace step');

      fireEvent.click(replaceButton);
      /* The real `useReplaceStep` opens the catalog to pick the replacement */
      await waitFor(() => {
        expect(mockCatalogModalContext.getNewComponent).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Collapse button', () => {
    it('should show "Collapse step" title when not collapsed', async () => {
      const mockOnCollapseToggle = vi.fn();

      await renderToolbar({
        toolbar: (node) => <StepToolbar vizNode={node} onCollapseToggle={mockOnCollapseToggle} isCollapsed={false} />,
      });

      const collapseButton = screen.getByTestId('Test Node|step-toolbar-button-collapse');
      expect(collapseButton).toHaveAttribute('title', 'Collapse step');
    });

    it('should show "Expand step" title when collapsed', async () => {
      const mockOnCollapseToggle = vi.fn();

      await renderToolbar({
        toolbar: (node) => <StepToolbar vizNode={node} onCollapseToggle={mockOnCollapseToggle} isCollapsed />,
      });

      const collapseButton = screen.getByTestId('Test Node|step-toolbar-button-collapse');
      expect(collapseButton).toHaveAttribute('title', 'Expand step');
    });

    it('should call onCollapseToggle when collapse button is clicked', async () => {
      const mockOnCollapseToggle = vi.fn();

      await renderToolbar({
        toolbar: (node) => <StepToolbar vizNode={node} onCollapseToggle={mockOnCollapseToggle} />,
      });

      const collapseButton = screen.getByTestId('Test Node|step-toolbar-button-collapse');
      fireEvent.click(collapseButton);
      expect(mockOnCollapseToggle).toHaveBeenCalledTimes(1);
    });

    it('should not render collapse button when onCollapseToggle is not provided', async () => {
      await renderToolbar();

      expect(screen.queryByTestId('Test Node|step-toolbar-button-collapse')).not.toBeInTheDocument();
    });
  });

  describe('Delete step button', () => {
    it('should render delete step button when canRemoveStep is true and call onDeleteStep when delete step button is clicked', async () => {
      await renderToolbar({ interaction: { canRemoveStep: true } });

      const deleteButton = screen.getByTestId('Test Node|step-toolbar-button-delete');
      expect(deleteButton).toBeInTheDocument();
      expect(deleteButton).toHaveAttribute('title', 'Delete step');

      fireEvent.click(deleteButton);
      await waitFor(() => {
        expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalledTimes(1);
      });
      expect(getRouteStepNames()).toEqual(['choice', 'to']);
    });
  });

  describe('Delete group button', () => {
    it('should render delete group button when canRemoveFlow is true and call onDeleteGroup when delete group button is clicked', async () => {
      await renderToolbar({ path: 'route', interaction: { canRemoveFlow: true } });

      const deleteGroupButton = screen.getByTestId('Test Node|step-toolbar-button-delete-group');
      expect(deleteGroupButton).toBeInTheDocument();
      expect(deleteGroupButton).toHaveAttribute('title', 'Delete group');

      fireEvent.click(deleteGroupButton);
      /* The real `useDeleteGroup` asks for confirmation, then removes the route */
      await waitFor(() => {
        expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalledTimes(1);
      });
      expect(mockActionConfirmationModalContext.actionConfirmation).toHaveBeenCalledTimes(1);
      expect(camelResource.getVisualEntities()).toHaveLength(0);
    });
  });

  describe('Event propagation', () => {
    it('should stop click propagation to the parent for async actions (delete step)', async () => {
      const parentOnClick = vi.fn();
      await renderToolbar({
        interaction: { canRemoveStep: true },
        toolbar: (node) => (
          <div onClick={parentOnClick}>
            <StepToolbar vizNode={node} />
          </div>
        ),
      });

      const deleteButton = screen.getByTestId('Test Node|step-toolbar-button-delete');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalledTimes(1);
      });
      expect(parentOnClick).not.toHaveBeenCalled();
    });

    it('should stop click propagation to the parent for async actions (add special child)', async () => {
      const parentOnClick = vi.fn();
      await renderToolbar({
        path: CHOICE_PATH,
        interaction: { canHaveSpecialChildren: true },
        toolbar: (node) => (
          <div onClick={parentOnClick}>
            <StepToolbar vizNode={node} />
          </div>
        ),
      });

      const addSpecialButton = screen.getByTestId('Test Node|step-toolbar-button-add-special');
      fireEvent.click(addSpecialButton);

      await waitFor(() => {
        expect(mockCatalogModalContext.getNewComponent).toHaveBeenCalledTimes(1);
      });
      expect(parentOnClick).not.toHaveBeenCalled();
    });
  });

  describe('Multiple buttons rendering', () => {
    it('should render all available buttons when all interactions are enabled', async () => {
      const mockOnCollapseToggle = vi.fn();
      /* The step copy is compatible as a next step, so it can be duplicated */
      mockCatalogModalContext.checkCompatibility.mockReturnValue(true);
      await renderToolbar({
        route: camelRouteWithDisabledSteps,
        path: DISABLED_LOG_PATH,
        interaction: {
          canHavePreviousStep: true,
          canHaveNextStep: true,
          canHaveChildren: true,
          canHaveSpecialChildren: true,
          canReplaceStep: true,
          canRemoveStep: true,
          canRemoveFlow: true,
          canBeDisabled: true,
        },
        toolbar: (node) => <StepToolbar vizNode={node} onCollapseToggle={mockOnCollapseToggle} />,
      });

      expect(screen.getByTestId('Test Node|step-toolbar-button-duplicate')).toBeInTheDocument();
      expect(screen.getByTestId('Test Node|step-toolbar-button-add-special')).toBeInTheDocument();
      expect(screen.getByTestId('Test Node|step-toolbar-button-disable')).toBeInTheDocument();
      expect(screen.getByTestId('Test Node|step-toolbar-button-enable-all')).toBeInTheDocument();
      expect(screen.getByTestId('Test Node|step-toolbar-button-replace')).toBeInTheDocument();
      expect(screen.getByTestId('Test Node|step-toolbar-button-collapse')).toBeInTheDocument();
      expect(screen.getByTestId('Test Node|step-toolbar-button-delete')).toBeInTheDocument();
      expect(screen.getByTestId('Test Node|step-toolbar-button-delete-group')).toBeInTheDocument();
    });
  });
});
