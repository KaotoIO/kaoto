import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RestVerb } from '../restDslTypes';
import { OperationTypeHelp, RestDslOperationVerbSelect } from './RestDslOperationVerbSelect';

describe('RestDslOperationVerbSelect', () => {
  const verbs: RestVerb[] = ['get', 'post', 'put', 'delete'];

  const baseProps = {
    isOpen: false,
    selected: 'get' as const,
    verbs,
    onSelect: jest.fn(),
    onOpenChange: jest.fn(),
    onToggle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with selected verb', () => {
    render(<RestDslOperationVerbSelect {...baseProps} />);

    expect(screen.getByText('GET')).toBeInTheDocument();
  });

  it('calls onToggle when toggle is clicked', () => {
    render(<RestDslOperationVerbSelect {...baseProps} />);

    const toggle = screen.getByRole('button', { name: /get/i });
    fireEvent.click(toggle);

    expect(baseProps.onToggle).toHaveBeenCalledTimes(1);
  });

  it('shows options when isOpen is true', () => {
    render(<RestDslOperationVerbSelect {...baseProps} isOpen={true} />);

    expect(screen.getAllByText('GET').length).toBeGreaterThan(0);
    expect(screen.getByText('POST')).toBeInTheDocument();
    expect(screen.getByText('PUT')).toBeInTheDocument();
    expect(screen.getByText('DELETE')).toBeInTheDocument();
  });

  it('calls onSelect when an option is clicked', () => {
    render(<RestDslOperationVerbSelect {...baseProps} isOpen={true} />);

    const options = screen.getAllByRole('option');
    const postOption = options.find((opt) => opt.textContent === 'POST');
    if (postOption) {
      fireEvent.click(postOption);
    }

    expect(baseProps.onSelect).toHaveBeenCalledWith('post');
  });

  it('renders help popover trigger and shows content on hover', async () => {
    const user = userEvent.setup();
    render(<OperationTypeHelp />);

    const helpButton = screen.getByRole('button', { name: /more info about operation type/i });
    expect(helpButton).toBeInTheDocument();

    // Hover over the help button to trigger the popover
    await user.hover(helpButton);

    // Wait for and verify the popover content appears
    await waitFor(() => {
      expect(screen.getByText('Select the HTTP method to create for this REST operation.')).toBeInTheDocument();
    });
  });
});
