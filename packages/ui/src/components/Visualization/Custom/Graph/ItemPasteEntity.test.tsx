import { fireEvent, render, screen } from '@testing-library/react';

import { usePasteEntity } from '../../../../hooks/usePasteEntity';
import { ItemPasteEntity } from './ItemPasteEntity';

vi.mock('../../../../hooks/usePasteEntity');

describe('ItemPasteEntity', () => {
  const mockUsePasteEntity = usePasteEntity as MockedFunction<typeof usePasteEntity>;
  const mockOnPasteEntity = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
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

  it('renders with icon testid from mock', () => {
    mockUsePasteEntity.mockReturnValue({
      isCompatible: true,
      onPasteEntity: mockOnPasteEntity,
    });

    const { container } = render(<ItemPasteEntity />);

    expect(screen.getByText('Paste')).toBeInTheDocument();
    // Icon mock always provides a testid for the icon itself
    expect(container.querySelector('[data-testid="paste-icon"]')).toBeInTheDocument();
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
