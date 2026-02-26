import { fireEvent, render, screen } from '@testing-library/react';

import { FieldContextMenu } from './FieldContextMenu';

describe('FieldContextMenu', () => {
  it('should render context menu with Override type option', () => {
    const onOverrideType = jest.fn();
    const onResetOverride = jest.fn();
    const onClose = jest.fn();

    render(
      <FieldContextMenu
        hasOverride={false}
        onOverrideType={onOverrideType}
        onResetOverride={onResetOverride}
        onClose={onClose}
      />,
    );

    expect(screen.getByText('Override Type...')).toBeInTheDocument();
  });

  it('should call onOverrideType and onClose when Override type is clicked', () => {
    const onOverrideType = jest.fn();
    const onResetOverride = jest.fn();
    const onClose = jest.fn();

    render(
      <FieldContextMenu
        hasOverride={false}
        onOverrideType={onOverrideType}
        onResetOverride={onResetOverride}
        onClose={onClose}
      />,
    );

    const overrideButton = screen.getByText('Override Type...');
    fireEvent.click(overrideButton);

    expect(onOverrideType).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('should show Reset override option when hasOverride is true', () => {
    const onOverrideType = jest.fn();
    const onResetOverride = jest.fn();
    const onClose = jest.fn();

    render(
      <FieldContextMenu
        hasOverride={true}
        onOverrideType={onOverrideType}
        onResetOverride={onResetOverride}
        onClose={onClose}
      />,
    );

    expect(screen.getByText('Reset Override')).toBeInTheDocument();
  });

  it('should call onResetOverride and onClose when Reset override is clicked', () => {
    const onOverrideType = jest.fn();
    const onResetOverride = jest.fn();
    const onClose = jest.fn();

    render(
      <FieldContextMenu
        hasOverride={true}
        onOverrideType={onOverrideType}
        onResetOverride={onResetOverride}
        onClose={onClose}
      />,
    );

    const resetButton = screen.getByText('Reset Override');
    fireEvent.click(resetButton);

    expect(onResetOverride).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('should not show Reset override when hasOverride is false', () => {
    const onOverrideType = jest.fn();
    const onResetOverride = jest.fn();
    const onClose = jest.fn();

    render(
      <FieldContextMenu
        hasOverride={false}
        onOverrideType={onOverrideType}
        onResetOverride={onResetOverride}
        onClose={onClose}
      />,
    );

    expect(screen.queryByText('Reset Override')).not.toBeInTheDocument();
  });
});
