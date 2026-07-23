import { fireEvent, render, screen } from '@testing-library/react';

import { IWrapperCandidate } from '../../../models/datamapper/field-action';
import { Types } from '../../../models/datamapper/types';
import { WrapperSelectionModal, WrapperSelectionModalProps } from './WrapperSelectionModal';

function makeCandidates(count: number): IWrapperCandidate[] {
  return Array.from({ length: count }, (_, i) => ({
    key: `key-${i}`,
    label: `Candidate ${i}`,
    typeBadge: Types.String,
    description: i % 2 === 0 ? `Description for ${i}` : undefined,
    childrenPreview: i % 3 === 0 ? ['child1', 'child2'] : undefined,
    selection: { memberIndex: i },
  }));
}

function renderModal(overrides: Partial<WrapperSelectionModalProps> = {}) {
  const defaultProps: WrapperSelectionModalProps = {
    isOpen: true,
    title: 'Select substitute for Animal',
    description: 'Choose a concrete element for Animal',
    testId: 'test-modal',
    candidates: makeCandidates(3),
    selectedKey: null,
    onSelect: vi.fn(),
    onClose: vi.fn(),
  };
  const props = { ...defaultProps, ...overrides };
  render(<WrapperSelectionModal {...props} />);
  return props;
}

describe('WrapperSelectionModal', () => {
  it('should render modal with title and description', () => {
    renderModal();
    expect(screen.getByText('Select substitute for Animal')).toBeInTheDocument();
    expect(screen.getByText('Choose a concrete element for Animal')).toBeInTheDocument();
  });

  it('should render all candidates as radio buttons', () => {
    renderModal();
    expect(screen.getByText('Candidate 0')).toBeInTheDocument();
    expect(screen.getByText('Candidate 1')).toBeInTheDocument();
    expect(screen.getByText('Candidate 2')).toBeInTheDocument();
  });

  it('should show type badge for each candidate', () => {
    renderModal();
    const badges = screen.getAllByText(Types.String);
    expect(badges).toHaveLength(3);
  });

  it('should show description when present', () => {
    renderModal();
    expect(screen.getByText('Description for 0')).toBeInTheDocument();
    expect(screen.getByText('Description for 2')).toBeInTheDocument();
    expect(screen.queryByText('Description for 1')).not.toBeInTheDocument();
  });

  it('should show children preview when present', () => {
    renderModal();
    expect(screen.getByText('Fields: child1, child2')).toBeInTheDocument();
  });

  it('should not show SearchInput when candidates <= 10', () => {
    renderModal({ candidates: makeCandidates(5) });
    expect(screen.queryByPlaceholderText('Filter candidates...')).not.toBeInTheDocument();
  });

  it('should show SearchInput when candidates > 10', () => {
    renderModal({ candidates: makeCandidates(15) });
    expect(screen.getByPlaceholderText('Filter candidates...')).toBeInTheDocument();
  });

  it('should filter candidates with SearchInput', () => {
    renderModal({ candidates: makeCandidates(15) });
    const searchInput = screen.getByPlaceholderText('Filter candidates...');

    fireEvent.change(searchInput, { target: { value: 'Candidate 1' } });

    expect(screen.getByText('Candidate 1')).toBeInTheDocument();
    expect(screen.getByText('Candidate 10')).toBeInTheDocument();
    expect(screen.queryByText('Candidate 2')).not.toBeInTheDocument();
  });

  it('should show no-results message when filter matches nothing', () => {
    renderModal({ candidates: makeCandidates(15) });
    const searchInput = screen.getByPlaceholderText('Filter candidates...');

    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    expect(screen.getByText('No candidates match the filter.')).toBeInTheDocument();
  });

  it('should disable Confirm button when no selection', () => {
    renderModal();
    const confirmBtn = screen.getByText('Confirm').closest('button')!;
    expect(confirmBtn).toBeDisabled();
  });

  it('should enable Confirm button when a radio is selected', () => {
    renderModal();

    fireEvent.click(screen.getByTestId('wrapper-radio-key-0'));

    const confirmBtn = screen.getByText('Confirm').closest('button')!;
    expect(confirmBtn).toBeEnabled();
  });

  it('should pre-select the given selectedKey', () => {
    renderModal({ selectedKey: 'key-1' });
    const radioInput = document.getElementById('wrapper-radio-key-1') as HTMLInputElement;
    expect(radioInput.checked).toBe(true);
    const confirmBtn = screen.getByText('Confirm').closest('button')!;
    expect(confirmBtn).toBeEnabled();
  });

  it('should call onSelect with correct MemberSelection on Confirm', () => {
    const props = renderModal();

    fireEvent.click(screen.getByTestId('wrapper-radio-key-2'));
    fireEvent.click(screen.getByText('Confirm'));

    expect(props.onSelect).toHaveBeenCalledWith({ memberIndex: 2 });
    expect(props.onClose).toHaveBeenCalled();
  });

  it('should call onClose when Cancel is clicked', () => {
    const props = renderModal();

    fireEvent.click(screen.getByText('Cancel'));

    expect(props.onClose).toHaveBeenCalled();
    expect(props.onSelect).not.toHaveBeenCalled();
  });

  it('should adapt title for choice wrapper type', () => {
    renderModal({
      title: 'Select member for Address',
      description: 'Choose a member for Address',
    });
    expect(screen.getByText('Select member for Address')).toBeInTheDocument();
    expect(screen.getByText('Choose a member for Address')).toBeInTheDocument();
  });

  it('should handle candidates with substituteQName', () => {
    const candidates: IWrapperCandidate[] = [
      {
        key: '0:ns:Cat',
        label: 'Cat',
        typeBadge: Types.Container,
        selection: { memberIndex: 0, substituteQName: 'ns:Cat' },
      },
      {
        key: '0:ns:Dog',
        label: 'Dog',
        typeBadge: Types.Container,
        selection: { memberIndex: 0, substituteQName: 'ns:Dog' },
      },
    ];
    const props = renderModal({ candidates });

    fireEvent.click(screen.getByTestId('wrapper-radio-0:ns:Cat'));
    fireEvent.click(screen.getByText('Confirm'));

    expect(props.onSelect).toHaveBeenCalledWith({ memberIndex: 0, substituteQName: 'ns:Cat' });
  });

  it('should render empty candidate list', () => {
    renderModal({ candidates: [] });
    expect(screen.getByText('No candidates available.')).toBeInTheDocument();
    const confirmBtn = screen.getByText('Confirm').closest('button')!;
    expect(confirmBtn).toBeDisabled();
  });
});
