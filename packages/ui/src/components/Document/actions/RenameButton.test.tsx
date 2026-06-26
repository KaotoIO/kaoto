import { act, fireEvent, render, screen } from '@testing-library/react';

import { RenameButton } from './RenameButton';

describe('RenameButton', () => {
  it('should render with correct testId and labels', () => {
    const onRenameClick = jest.fn();
    render(<RenameButton itemName="my-item" label="variable" onRenameClick={onRenameClick} />);

    const btn = screen.getByTestId('rename-my-item-button');
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('title', 'Rename variable');
    expect(btn).toHaveAttribute('aria-label', 'Rename variable');
  });

  it('should call onRenameClick when clicked', () => {
    const onRenameClick = jest.fn();
    render(<RenameButton itemName="my-item" label="variable" onRenameClick={onRenameClick} />);

    act(() => {
      fireEvent.click(screen.getByTestId('rename-my-item-button'));
    });

    expect(onRenameClick).toHaveBeenCalledTimes(1);
  });
});
