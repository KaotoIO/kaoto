import { fireEvent, render, screen } from '@testing-library/react';

import { usePasteEntity } from '../../../../hooks/usePasteEntity';
import { ItemPasteEntity } from './ItemPasteEntity';

jest.mock('../../../../hooks/usePasteEntity');

describe('ItemPasteEntity', () => {
  const mockUsePasteEntity = usePasteEntity as jest.MockedFunction<typeof usePasteEntity>;
  const mockOnPasteEntity = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the paste menu item with icon and text', () => {
    mockUsePasteEntity.mockReturnValue({
      isCompatible: true,
      onPasteEntity: mockOnPasteEntity,
    });

    render(<ItemPasteEntity data-testid="paste-item" />);

    expect(screen.getByTestId('paste-item')).toBeInTheDocument();
    expect(screen.getByText('Paste')).toBeInTheDocument();
  });

  it('is enabled when isCompatible is true', () => {
    mockUsePasteEntity.mockReturnValue({
      isCompatible: true,
      onPasteEntity: mockOnPasteEntity,
    });

    render(<ItemPasteEntity data-testid="paste-item" />);

    const menuItem = screen.getByRole('menuitem');
    expect(menuItem).not.toHaveAttribute('disabled', 'true');
  });

  it('is disabled when isCompatible is false', () => {
    mockUsePasteEntity.mockReturnValue({
      isCompatible: false,
      onPasteEntity: mockOnPasteEntity,
    });

    render(<ItemPasteEntity data-testid="paste-item" />);

    const menuItem = screen.getByRole('menuitem');
    expect(menuItem).toHaveAttribute('disabled');
  });

  it('calls onPasteEntity when clicked and enabled', () => {
    mockUsePasteEntity.mockReturnValue({
      isCompatible: true,
      onPasteEntity: mockOnPasteEntity,
    });

    render(<ItemPasteEntity data-testid="paste-item" />);

    const menuItem = screen.getByRole('menuitem');
    fireEvent.click(menuItem);

    expect(mockOnPasteEntity).toHaveBeenCalledTimes(1);
  });

  it('does not call onPasteEntity when clicked and disabled', () => {
    mockUsePasteEntity.mockReturnValue({
      isCompatible: false,
      onPasteEntity: mockOnPasteEntity,
    });

    render(<ItemPasteEntity data-testid="paste-item" />);

    const menuItem = screen.getByTestId('paste-item');
    fireEvent.click(menuItem);

    expect(mockOnPasteEntity).not.toHaveBeenCalled();
  });

  it('renders with custom data-testid', () => {
    mockUsePasteEntity.mockReturnValue({
      isCompatible: true,
      onPasteEntity: mockOnPasteEntity,
    });

    render(<ItemPasteEntity data-testid="custom-test-id" />);

    expect(screen.getByTestId('custom-test-id')).toBeInTheDocument();
  });

  it('renders without data-testid when not provided', () => {
    mockUsePasteEntity.mockReturnValue({
      isCompatible: true,
      onPasteEntity: mockOnPasteEntity,
    });

    const { container } = render(<ItemPasteEntity />);

    expect(screen.getByText('Paste')).toBeInTheDocument();
    expect(container.querySelector('[data-testid]')).not.toBeInTheDocument();
  });

  it('maintains correct structure with icon and text', () => {
    mockUsePasteEntity.mockReturnValue({
      isCompatible: true,
      onPasteEntity: mockOnPasteEntity,
    });

    render(<ItemPasteEntity data-testid="paste-item" />);

    const menuItem = screen.getByTestId('paste-item');
    const icon = menuItem.querySelector('svg');
    const text = screen.getByText('Paste');

    expect(icon).toBeInTheDocument();
    expect(text).toBeInTheDocument();
    expect(text).toHaveClass('pf-v6-u-m-sm');
  });
});
