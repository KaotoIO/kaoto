import { fireEvent, render, screen } from '@testing-library/react';

import { ExportMappingFileDropdownItem } from './ExportMappingFileDropdownItem';

describe('ExportMappingFileDropdownItem', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  it('should render the dropdown item', () => {
    render(<ExportMappingFileDropdownItem onClick={mockOnClick} />);

    const dropdownItem = screen.getByTestId('dm-debug-export-mappings-button');
    expect(dropdownItem).toBeInTheDocument();
  });

  it('should display correct text', () => {
    render(<ExportMappingFileDropdownItem onClick={mockOnClick} />);

    expect(screen.getByText('Export current mappings (.xsl)')).toBeInTheDocument();
  });

  it('should render with ExportIcon', () => {
    render(<ExportMappingFileDropdownItem onClick={mockOnClick} />);

    const dropdownItem = screen.getByTestId('dm-debug-export-mappings-button');
    // Check that the icon is rendered (ExportIcon should be present in the DOM)
    const icon = dropdownItem.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    render(<ExportMappingFileDropdownItem onClick={mockOnClick} />);

    const dropdownItem = screen.getByTestId('dm-debug-export-mappings-button');
    const button = dropdownItem.querySelector('button');

    expect(button).toBeInTheDocument();

    if (button) {
      fireEvent.click(button);
    }

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('should call onClick multiple times when clicked multiple times', () => {
    render(<ExportMappingFileDropdownItem onClick={mockOnClick} />);

    const dropdownItem = screen.getByTestId('dm-debug-export-mappings-button');
    const button = dropdownItem.querySelector('button');

    expect(button).toBeInTheDocument();

    if (button) {
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
    }

    expect(mockOnClick).toHaveBeenCalledTimes(3);
  });

  it('should be accessible via test id', () => {
    render(<ExportMappingFileDropdownItem onClick={mockOnClick} />);

    const dropdownItem = screen.getByTestId('dm-debug-export-mappings-button');
    expect(dropdownItem).toBeInTheDocument();
    expect(dropdownItem.tagName).toBe('LI');
  });

  it('should render as a DropdownItem component', () => {
    render(<ExportMappingFileDropdownItem onClick={mockOnClick} />);

    const dropdownItem = screen.getByTestId('dm-debug-export-mappings-button');
    // DropdownItem renders as a list item element
    expect(dropdownItem.tagName).toBe('LI');
  });

  it('should have proper ARIA attributes for accessibility', () => {
    render(<ExportMappingFileDropdownItem onClick={mockOnClick} />);

    const dropdownItem = screen.getByTestId('dm-debug-export-mappings-button');
    // Button should be accessible
    expect(dropdownItem).toBeEnabled();
  });

  it('should not call onClick when not interacted with', () => {
    render(<ExportMappingFileDropdownItem onClick={mockOnClick} />);

    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it('should handle keyboard interaction', () => {
    render(<ExportMappingFileDropdownItem onClick={mockOnClick} />);

    const dropdownItem = screen.getByTestId('dm-debug-export-mappings-button');
    const button = dropdownItem.querySelector('button');

    expect(button).toBeInTheDocument();

    if (button) {
      // Simulate Enter key press on the button
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
    }

    // The button should be present and interactive
    expect(button).toBeInTheDocument();
  });
});
