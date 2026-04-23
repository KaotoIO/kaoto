import { fireEvent, render, screen } from '@testing-library/react';

import { FieldContextMenu, MenuGroup } from './FieldContextMenu';

describe('FieldContextMenu', () => {
  const overrideGroup: MenuGroup = {
    actions: [{ label: 'Override Field...', onClick: jest.fn(), testId: 'override-field' }],
  };

  const resetGroup = (onClick: jest.Mock): MenuGroup => ({
    actions: [{ label: 'Reset Override', onClick }],
  });

  it('should render context menu with Override type option', () => {
    render(<FieldContextMenu groups={[overrideGroup]} />);

    expect(screen.getByText('Override Field...')).toBeInTheDocument();
  });

  it('should call onClick and onClose when Override type is clicked', () => {
    const onClick = jest.fn();
    const onClose = jest.fn();
    const group: MenuGroup = { actions: [{ label: 'Override Field...', onClick }] };

    render(<FieldContextMenu groups={[group]} onClose={onClose} />);

    fireEvent.click(screen.getByText('Override Field...'));

    expect(onClick).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('should show Reset override option when included in groups', () => {
    render(<FieldContextMenu groups={[overrideGroup, resetGroup(jest.fn())]} />);

    expect(screen.getByText('Reset Override')).toBeInTheDocument();
  });

  it('should call onClick and onClose when Reset override is clicked', () => {
    const onReset = jest.fn();
    const onClose = jest.fn();

    render(<FieldContextMenu groups={[overrideGroup, resetGroup(onReset)]} onClose={onClose} />);

    fireEvent.click(screen.getByText('Reset Override'));

    expect(onReset).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('should not show Reset override when not included in groups', () => {
    render(<FieldContextMenu groups={[overrideGroup]} />);

    expect(screen.queryByText('Reset Override')).not.toBeInTheDocument();
  });

  it('should skip empty groups and not render extra dividers', () => {
    const emptyGroup: MenuGroup = { actions: [] };

    const { container } = render(<FieldContextMenu groups={[emptyGroup, overrideGroup]} />);

    expect(screen.getByText('Override Field...')).toBeInTheDocument();
    expect(container.querySelectorAll('[role="separator"]').length).toBe(0);
  });

  it('should render dividers between non-empty groups', () => {
    const group1: MenuGroup = { actions: [{ label: 'Action 1', onClick: jest.fn() }] };
    const group2: MenuGroup = { actions: [{ label: 'Action 2', onClick: jest.fn() }] };

    const { container } = render(<FieldContextMenu groups={[group1, group2]} />);

    expect(container.querySelectorAll('.pf-v6-c-divider, [role="separator"]').length).toBe(1);
  });

  describe('Choice wrapper context menu (Case A)', () => {
    const buildChoiceMemberGroups = (
      members: string[],
      selectedIndex?: number,
      onSelect = jest.fn(),
      onClear = jest.fn(),
    ): MenuGroup[] => {
      const ChoicesIcon = () => <span data-testid="choices-icon" />;
      const CheckIcon = () => <span data-testid="check-icon" />;

      const membersGroup: MenuGroup = {
        actions: members.map((name, index) => ({
          label: name,
          onClick: () => onSelect(index),
          icon: selectedIndex === index ? <CheckIcon /> : <ChoicesIcon />,
          testId: `choice-menu-item-${index}`,
        })),
      };

      const clearGroup: MenuGroup = {
        actions: [{ label: 'Show All Choice Options', onClick: onClear, testId: 'clear-choice' }],
      };

      return [membersGroup, clearGroup];
    };

    it('should render choice members inline', () => {
      const groups = buildChoiceMemberGroups(['Email', 'Phone', 'Fax']);

      render(<FieldContextMenu groups={groups} />);

      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Phone')).toBeInTheDocument();
      expect(screen.getByText('Fax')).toBeInTheDocument();
      expect(screen.getByText('Show All Choice Options')).toBeInTheDocument();
    });

    it('should show check icon for selected member', () => {
      const groups = buildChoiceMemberGroups(['Email', 'Phone', 'Fax'], 1);

      render(<FieldContextMenu groups={groups} />);

      const phoneItem = screen.getByTestId('choice-menu-item-1');
      expect(phoneItem).toBeInTheDocument();
      expect(phoneItem.querySelector('svg, [data-testid="check-icon"]')).toBeInTheDocument();
    });

    it('should not render override menu items', () => {
      const groups = buildChoiceMemberGroups(['Email', 'Phone']);

      render(<FieldContextMenu groups={groups} />);

      expect(screen.queryByText('Override Field...')).not.toBeInTheDocument();
      expect(screen.queryByText('Reset Override')).not.toBeInTheDocument();
    });

    it('should call onSelectChoiceMember with index when member is clicked', () => {
      const onSelect = jest.fn();
      const onClose = jest.fn();
      const groups = buildChoiceMemberGroups(['Email', 'Phone', 'Fax'], undefined, onSelect);

      render(<FieldContextMenu groups={groups} onClose={onClose} />);

      fireEvent.click(screen.getByText('Phone'));

      expect(onSelect).toHaveBeenCalledWith(1);
      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClearChoice and onClose when Show All Choice Options is clicked', () => {
      const onClear = jest.fn();
      const onClose = jest.fn();
      const groups = buildChoiceMemberGroups(['Email', 'Phone'], undefined, jest.fn(), onClear);

      render(<FieldContextMenu groups={groups} onClose={onClose} />);

      fireEvent.click(screen.getByText('Show All Choice Options'));

      expect(onClear).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    it('should show Select Member... for large choice lists', () => {
      const onOpenModal = jest.fn();
      const onClose = jest.fn();
      const modalGroup: MenuGroup = {
        actions: [{ label: 'Select Member...', onClick: onOpenModal, testId: 'open-choice-modal' }],
      };
      const clearGroup: MenuGroup = {
        actions: [{ label: 'Show All Choice Options', onClick: jest.fn(), testId: 'clear-choice' }],
      };

      render(<FieldContextMenu groups={[modalGroup, clearGroup]} onClose={onClose} />);

      expect(screen.queryByText('Member0')).not.toBeInTheDocument();
      expect(screen.getByText('Select Member...')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Select Member...'));
      expect(onOpenModal).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    it('should handle empty choice field', () => {
      const groups = buildChoiceMemberGroups([]);

      render(<FieldContextMenu groups={groups} />);

      expect(screen.getByText('Show All Choice Options')).toBeInTheDocument();
      expect(screen.queryByText('Email')).not.toBeInTheDocument();
    });
  });

  describe('Selected choice context menu (Case B)', () => {
    it('should show Show All Choice Options above Override Field', () => {
      const clearGroup: MenuGroup = {
        actions: [{ label: 'Show All Choice Options', onClick: jest.fn(), testId: 'clear-choice' }],
      };

      render(<FieldContextMenu groups={[clearGroup, overrideGroup]} />);

      expect(screen.getByText('Show All Choice Options')).toBeInTheDocument();
      expect(screen.getByText('Override Field...')).toBeInTheDocument();
    });

    it('should call onClearChoice when Show All Choice Options is clicked', () => {
      const onClear = jest.fn();
      const onClose = jest.fn();
      const clearGroup: MenuGroup = {
        actions: [{ label: 'Show All Choice Options', onClick: onClear, testId: 'clear-choice' }],
      };

      render(<FieldContextMenu groups={[clearGroup, overrideGroup]} onClose={onClose} />);

      fireEvent.click(screen.getByText('Show All Choice Options'));

      expect(onClear).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Choice member context menu (Case C)', () => {
    it('should show Select with member name above Override Field', () => {
      const selectGroup: MenuGroup = {
        actions: [{ label: "Select 'Fax'", onClick: jest.fn(), testId: 'select-choice-member' }],
      };

      render(<FieldContextMenu groups={[selectGroup, overrideGroup]} />);

      expect(screen.getByText("Select 'Fax'")).toBeInTheDocument();
      expect(screen.getByText('Override Field...')).toBeInTheDocument();
    });

    it('should include parent wrapper name when provided', () => {
      const selectAction = {
        label: "Select 'Fax' in 'contactChoice'",
        onClick: jest.fn(),
        testId: 'select-choice-member',
      };
      const selectGroup: MenuGroup = { actions: [selectAction] };

      render(<FieldContextMenu groups={[selectGroup, overrideGroup]} />);

      expect(screen.getByText("Select 'Fax' in 'contactChoice'")).toBeInTheDocument();
    });

    it('should call onSelectSelfAsChoiceMember when Select is clicked', () => {
      const onSelectSelf = jest.fn();
      const onClose = jest.fn();
      const selectGroup: MenuGroup = {
        actions: [{ label: "Select 'Fax'", onClick: onSelectSelf, testId: 'select-choice-member' }],
      };

      render(<FieldContextMenu groups={[selectGroup, overrideGroup]} onClose={onClose} />);

      fireEvent.click(screen.getByText("Select 'Fax'"));

      expect(onSelectSelf).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
