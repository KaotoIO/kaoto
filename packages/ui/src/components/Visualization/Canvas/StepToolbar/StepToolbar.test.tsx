import { act, fireEvent, render, screen } from '@testing-library/react';

import { IVisualizationNode } from '../../../../models';
import { useDeleteGroup } from '../../Custom/hooks/delete-group.hook';
import { useDeleteStep } from '../../Custom/hooks/delete-step.hook';
import { useDisableStep } from '../../Custom/hooks/disable-step.hook';
import { useDuplicateStep } from '../../Custom/hooks/duplicate-step.hook';
import { useEnableAllSteps } from '../../Custom/hooks/enable-all-steps.hook';
import { useInsertStep } from '../../Custom/hooks/insert-step.hook';
import { useMoveStep } from '../../Custom/hooks/move-step.hook';
import { useReplaceStep } from '../../Custom/hooks/replace-step.hook';
import { StepToolbar } from './StepToolbar';

// Mock all hooks
jest.mock('../../Custom/hooks/delete-group.hook');
jest.mock('../../Custom/hooks/delete-step.hook');
jest.mock('../../Custom/hooks/disable-step.hook');
jest.mock('../../Custom/hooks/duplicate-step.hook');
jest.mock('../../Custom/hooks/move-step.hook');
jest.mock('../../Custom/hooks/enable-all-steps.hook');
jest.mock('../../Custom/hooks/insert-step.hook');
jest.mock('../../Custom/hooks/replace-step.hook');

const mockUseDeleteGroup = useDeleteGroup as jest.MockedFunction<typeof useDeleteGroup>;
const mockUseDeleteStep = useDeleteStep as jest.MockedFunction<typeof useDeleteStep>;
const mockUseDisableStep = useDisableStep as jest.MockedFunction<typeof useDisableStep>;
const mockUseDuplicateStep = useDuplicateStep as jest.MockedFunction<typeof useDuplicateStep>;
const mockUseMoveStep = useMoveStep as jest.MockedFunction<typeof useMoveStep>;
const mockUseEnableAllSteps = useEnableAllSteps as jest.MockedFunction<typeof useEnableAllSteps>;
const mockUseInsertStep = useInsertStep as jest.MockedFunction<typeof useInsertStep>;
const mockUseReplaceStep = useReplaceStep as jest.MockedFunction<typeof useReplaceStep>;

describe('StepToolbar', () => {
  const mockGetNodeInteraction = jest.fn();
  const mockVizNode = {
    getNodeInteraction: mockGetNodeInteraction,
  } as unknown as IVisualizationNode;

  const defaultNodeInteraction = {
    canHavePreviousStep: false,
    canHaveNextStep: false,
    canHaveChildren: false,
    canHaveSpecialChildren: false,
    canReplaceStep: false,
    canRemoveStep: false,
    canRemoveFlow: false,
    canBeDisabled: false,
  };

  beforeEach(() => {
    // Default hook implementations
    mockUseDeleteGroup.mockReturnValue({ onDeleteGroup: jest.fn() });
    mockUseDeleteStep.mockReturnValue({ onDeleteStep: jest.fn() });
    mockUseDisableStep.mockReturnValue({ onToggleDisableNode: jest.fn(), isDisabled: false });
    mockUseDuplicateStep.mockReturnValue({ canDuplicate: false, onDuplicate: jest.fn() });
    mockUseMoveStep.mockReturnValue({ canBeMoved: false, onMoveStep: jest.fn() });
    mockUseEnableAllSteps.mockReturnValue({ areMultipleStepsDisabled: false, onEnableAllSteps: jest.fn() });
    mockUseInsertStep.mockReturnValue({ onInsertStep: jest.fn() });
    mockUseReplaceStep.mockReturnValue({ onReplaceNode: jest.fn() });

    mockGetNodeInteraction.mockReturnValue(defaultNodeInteraction);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the toolbar with correct data-testid', async () => {
      await act(async () => {
        render(<StepToolbar vizNode={mockVizNode} data-testid="test-toolbar" />);
      });

      expect(screen.getByTestId('test-toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('test-toolbar')).toHaveClass('step-toolbar');
    });

    it('should render no buttons when all interactions are disabled', async () => {
      await act(async () => {
        render(<StepToolbar vizNode={mockVizNode} />);
      });

      expect(screen.queryByTestId('step-toolbar-button-duplicate')).not.toBeInTheDocument();
      expect(screen.queryByTestId('step-toolbar-button-add-special')).not.toBeInTheDocument();
      expect(screen.queryByTestId('step-toolbar-button-disable')).not.toBeInTheDocument();
      expect(screen.queryByTestId('step-toolbar-button-enable-all')).not.toBeInTheDocument();
      expect(screen.queryByTestId('step-toolbar-button-replace')).not.toBeInTheDocument();
      expect(screen.queryByTestId('step-toolbar-button-delete')).not.toBeInTheDocument();
      expect(screen.queryByTestId('step-toolbar-button-delete-group')).not.toBeInTheDocument();
    });
  });

  describe('Duplicate button', () => {
    it('should render duplicate button when canDuplicate is true and call onDuplicate when duplicate button is clicked', async () => {
      const mockOnDuplicate = jest.fn();
      mockUseDuplicateStep.mockReturnValue({ canDuplicate: true, onDuplicate: mockOnDuplicate });

      await act(async () => {
        render(<StepToolbar vizNode={mockVizNode} />);
      });

      const duplicateButton = screen.getByTestId('step-toolbar-button-duplicate');
      expect(duplicateButton).toBeInTheDocument();
      expect(duplicateButton).toHaveAttribute('title', 'Duplicate');

      act(() => {
        fireEvent.click(duplicateButton);
      });
      expect(mockOnDuplicate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Move button', () => {
    it('should render Move Before button when canBeMoved is true and call onMoveStep when Move button is clicked', async () => {
      const mockOnMoveStep = jest.fn();
      mockUseMoveStep.mockReturnValue({ canBeMoved: true, onMoveStep: mockOnMoveStep });

      await act(async () => {
        render(<StepToolbar vizNode={mockVizNode} />);
      });

      const moveButton = screen.getByTestId('step-toolbar-button-move-before');
      expect(moveButton).toBeInTheDocument();
      expect(moveButton).toHaveAttribute('title', 'Move before');

      act(() => {
        fireEvent.click(moveButton);
      });
      expect(mockOnMoveStep).toHaveBeenCalledTimes(1);
    });

    it('should render Move After button when canBeMoved is true and call onMoveStep when Move button is clicked', async () => {
      const mockOnMoveStep = jest.fn();
      mockUseMoveStep.mockReturnValue({ canBeMoved: true, onMoveStep: mockOnMoveStep });

      await act(async () => {
        render(<StepToolbar vizNode={mockVizNode} />);
      });

      const moveButton = screen.getByTestId('step-toolbar-button-move-after');
      expect(moveButton).toBeInTheDocument();
      expect(moveButton).toHaveAttribute('title', 'Move after');

      act(() => {
        fireEvent.click(moveButton);
      });
      expect(mockOnMoveStep).toHaveBeenCalledTimes(1);
    });
  });

  describe('Add special children button', () => {
    it('should render add special button when canHaveSpecialChildren is true and call onInsertStep when add special button is clicked', async () => {
      const mockOnInsertStep = jest.fn();
      mockUseInsertStep.mockReturnValue({ onInsertStep: mockOnInsertStep });
      mockGetNodeInteraction.mockReturnValue({
        ...defaultNodeInteraction,
        canHaveSpecialChildren: true,
      });

      await act(async () => {
        render(<StepToolbar vizNode={mockVizNode} />);
      });

      const addSpecialButton = screen.getByTestId('step-toolbar-button-add-special');
      expect(addSpecialButton).toBeInTheDocument();
      expect(addSpecialButton).toHaveAttribute('title', 'Add branch');

      act(() => {
        fireEvent.click(addSpecialButton);
      });
      expect(mockOnInsertStep).toHaveBeenCalledTimes(1);
    });
  });

  describe('Disable button', () => {
    it('should show "Disable step" title when step is enabled', async () => {
      mockUseDisableStep.mockReturnValue({ onToggleDisableNode: jest.fn(), isDisabled: false });
      mockGetNodeInteraction.mockReturnValue({
        ...defaultNodeInteraction,
        canBeDisabled: true,
      });

      await act(async () => {
        render(<StepToolbar vizNode={mockVizNode} />);
      });

      const disableButton = screen.getByTestId('step-toolbar-button-disable');
      expect(disableButton).toHaveAttribute('title', 'Disable step');
    });

    it('should show "Enable step" title when step is disabled', async () => {
      mockUseDisableStep.mockReturnValue({ onToggleDisableNode: jest.fn(), isDisabled: true });
      mockGetNodeInteraction.mockReturnValue({
        ...defaultNodeInteraction,
        canBeDisabled: true,
      });

      await act(async () => {
        render(<StepToolbar vizNode={mockVizNode} />);
      });

      const disableButton = screen.getByTestId('step-toolbar-button-disable');
      expect(disableButton).toHaveAttribute('title', 'Enable step');
    });

    it('should call onToggleDisableNode when disable button is clicked', async () => {
      const mockOnToggleDisableNode = jest.fn();
      mockUseDisableStep.mockReturnValue({ onToggleDisableNode: mockOnToggleDisableNode, isDisabled: false });
      mockGetNodeInteraction.mockReturnValue({
        ...defaultNodeInteraction,
        canBeDisabled: true,
      });

      await act(async () => {
        render(<StepToolbar vizNode={mockVizNode} />);
      });

      const disableButton = screen.getByTestId('step-toolbar-button-disable');
      act(() => {
        fireEvent.click(disableButton);
      });
      expect(mockOnToggleDisableNode).toHaveBeenCalledTimes(1);
    });
  });

  describe('Enable all button', () => {
    it('should render enable all button when areMultipleStepsDisabled is true and call onEnableAllSteps when enable all button is clicked', async () => {
      const mockOnEnableAllSteps = jest.fn();
      mockUseEnableAllSteps.mockReturnValue({ areMultipleStepsDisabled: true, onEnableAllSteps: mockOnEnableAllSteps });

      await act(async () => {
        render(<StepToolbar vizNode={mockVizNode} />);
      });

      const enableAllButton = screen.getByTestId('step-toolbar-button-enable-all');
      expect(enableAllButton).toBeInTheDocument();
      expect(enableAllButton).toHaveAttribute('title', 'Enable all');

      act(() => {
        fireEvent.click(enableAllButton);
      });
      expect(mockOnEnableAllSteps).toHaveBeenCalledTimes(1);
    });
  });

  describe('Replace button', () => {
    it('should render replace button when canReplaceStep is true and call onReplaceNode when replace button is clicked', async () => {
      const mockOnReplaceNode = jest.fn();
      mockUseReplaceStep.mockReturnValue({ onReplaceNode: mockOnReplaceNode });
      mockGetNodeInteraction.mockReturnValue({
        ...defaultNodeInteraction,
        canReplaceStep: true,
      });

      await act(async () => {
        render(<StepToolbar vizNode={mockVizNode} />);
      });

      const replaceButton = screen.getByTestId('step-toolbar-button-replace');
      expect(replaceButton).toBeInTheDocument();
      expect(replaceButton).toHaveAttribute('title', 'Replace step');

      act(() => {
        fireEvent.click(replaceButton);
      });
      expect(mockOnReplaceNode).toHaveBeenCalledTimes(1);
    });
  });

  describe('Collapse button', () => {
    it('should show "Collapse step" title when not collapsed', async () => {
      const mockOnCollapseToggle = jest.fn();

      await act(async () => {
        render(<StepToolbar vizNode={mockVizNode} onCollapseToggle={mockOnCollapseToggle} isCollapsed={false} />);
      });

      const collapseButton = screen.getByTestId('step-toolbar-button-collapse');
      expect(collapseButton).toHaveAttribute('title', 'Collapse step');
    });

    it('should show "Expand step" title when collapsed', async () => {
      const mockOnCollapseToggle = jest.fn();

      await act(async () => {
        render(<StepToolbar vizNode={mockVizNode} onCollapseToggle={mockOnCollapseToggle} isCollapsed={true} />);
      });

      const collapseButton = screen.getByTestId('step-toolbar-button-collapse');
      expect(collapseButton).toHaveAttribute('title', 'Expand step');
    });

    it('should call onCollapseToggle when collapse button is clicked', async () => {
      const mockOnCollapseToggle = jest.fn();

      await act(async () => {
        render(<StepToolbar vizNode={mockVizNode} onCollapseToggle={mockOnCollapseToggle} />);
      });

      const collapseButton = screen.getByTestId('step-toolbar-button-collapse');
      act(() => {
        fireEvent.click(collapseButton);
      });
      expect(mockOnCollapseToggle).toHaveBeenCalledTimes(1);
    });

    it('should not render collapse button when onCollapseToggle is not provided', async () => {
      await act(async () => {
        render(<StepToolbar vizNode={mockVizNode} />);
      });

      expect(screen.queryByTestId('step-toolbar-button-collapse')).not.toBeInTheDocument();
    });
  });

  describe('Delete step button', () => {
    it('should render delete step button when canRemoveStep is true and call onDeleteStep when delete step button is clicked', async () => {
      const mockOnDeleteStep = jest.fn();
      mockUseDeleteStep.mockReturnValue({ onDeleteStep: mockOnDeleteStep });
      mockGetNodeInteraction.mockReturnValue({
        ...defaultNodeInteraction,
        canRemoveStep: true,
      });

      await act(async () => {
        render(<StepToolbar vizNode={mockVizNode} />);
      });

      const deleteButton = screen.getByTestId('step-toolbar-button-delete');
      expect(deleteButton).toBeInTheDocument();
      expect(deleteButton).toHaveAttribute('title', 'Delete step');

      act(() => {
        fireEvent.click(deleteButton);
      });
      expect(mockOnDeleteStep).toHaveBeenCalledTimes(1);
    });
  });

  describe('Delete group button', () => {
    it('should render delete group button when canRemoveFlow is true and call onDeleteGroup when delete group button is clicked', async () => {
      const mockOnDeleteGroup = jest.fn();
      mockUseDeleteGroup.mockReturnValue({ onDeleteGroup: mockOnDeleteGroup });
      mockGetNodeInteraction.mockReturnValue({
        ...defaultNodeInteraction,
        canRemoveFlow: true,
      });

      await act(async () => {
        render(<StepToolbar vizNode={mockVizNode} />);
      });

      const deleteGroupButton = screen.getByTestId('step-toolbar-button-delete-group');
      expect(deleteGroupButton).toBeInTheDocument();
      expect(deleteGroupButton).toHaveAttribute('title', 'Delete group');

      act(() => {
        fireEvent.click(deleteGroupButton);
      });
      expect(mockOnDeleteGroup).toHaveBeenCalledTimes(1);
    });
  });

  describe('Multiple buttons rendering', () => {
    it('should render all available buttons when all interactions are enabled', async () => {
      const mockOnCollapseToggle = jest.fn();
      mockGetNodeInteraction.mockReturnValue({
        canHavePreviousStep: true,
        canHaveNextStep: true,
        canHaveChildren: true,
        canHaveSpecialChildren: true,
        canReplaceStep: true,
        canRemoveStep: true,
        canRemoveFlow: true,
        canBeDisabled: true,
      });
      mockUseDuplicateStep.mockReturnValue({ canDuplicate: true, onDuplicate: jest.fn() });
      mockUseDisableStep.mockReturnValue({ onToggleDisableNode: jest.fn(), isDisabled: false });
      mockUseEnableAllSteps.mockReturnValue({ areMultipleStepsDisabled: true, onEnableAllSteps: jest.fn() });

      await act(async () => {
        render(<StepToolbar vizNode={mockVizNode} onCollapseToggle={mockOnCollapseToggle} />);
      });

      expect(screen.getByTestId('step-toolbar-button-duplicate')).toBeInTheDocument();
      expect(screen.getByTestId('step-toolbar-button-add-special')).toBeInTheDocument();
      expect(screen.getByTestId('step-toolbar-button-disable')).toBeInTheDocument();
      expect(screen.getByTestId('step-toolbar-button-enable-all')).toBeInTheDocument();
      expect(screen.getByTestId('step-toolbar-button-replace')).toBeInTheDocument();
      expect(screen.getByTestId('step-toolbar-button-collapse')).toBeInTheDocument();
      expect(screen.getByTestId('step-toolbar-button-delete')).toBeInTheDocument();
      expect(screen.getByTestId('step-toolbar-button-delete-group')).toBeInTheDocument();
    });
  });
});
